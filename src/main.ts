import './style.css';
import { CaptionChunker } from './audio';

type Caption = { text: string; at: Date };
let stream: MediaStream | undefined;
let processor: ScriptProcessorNode | undefined;
let audioContext: AudioContext | undefined;
const chunker = new CaptionChunker();
const pendingChunks: number[][] = [];
let captions: Caption[] = [];
let running = false;
let transcribing = false;

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const app = $('#main');

app.innerHTML = `
  <div class="shell">
    <header class="masthead"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span>Private Call Captions</a><a class="privacy-link" href="/privacy/">Privacy</a></header>
    <section class="intro" aria-labelledby="page-title"><div><p class="eyebrow">Microphone-only captions</p><h1 id="page-title">Read your microphone as private captions</h1><p class="lede">For people who need readable text during sensitive calls, the app turns one chosen microphone into local captions.</p><div class="privacy-promise"><span class="lock" aria-hidden="true">▣</span><div><strong>Your microphone stays under your control</strong><p>The app waits for your consent and selection. Audio buffers are discarded after local transcription.</p></div></div></div>
      <section class="caption-sheet" aria-label="Live caption preview"><header><span>Caption layer</span><span class="local-chip">● local only</span></header><output class="caption-output empty" id="caption" aria-live="polite">Choose a microphone and local model to start.</output></section></section>
    <section class="controls" aria-label="Caption controls"><section class="panel"><h2>Start a private caption session</h2><p class="hint">Bring your own Whisper-compatible <abbr title="Graphics General Matrix Multiplication">GGML</abbr> model file. The model stays on this device.</p><div class="fields"><label for="microphone">Microphone<select id="microphone"><option value="">Looking for microphones…</option></select></label><label for="model">Local model path<input id="model" autocomplete="off" placeholder="Choose a .bin or .gguf model file" /></label></div><div class="action-row"><button class="button" id="choose-model" type="button">Choose model</button><button class="button primary" id="start" type="button">Start captions</button><button class="button warn" id="stop" type="button" disabled>Stop captions</button><button class="button" id="overlay" type="button">Open caption window</button></div><p class="status" id="status" role="status" aria-live="polite"></p></section>
      <aside class="consent"><h2>Before you begin</h2><p>Tell people captions are running when that is expected or required. This is an accessibility aid, not legal transcription or an emergency service. Noise, names, and accents can be misheard.</p><label style="margin-top:14px;display:flex;gap:10px;align-items:flex-start;font-weight:600"><input id="consent" type="checkbox" style="width:22px;min-height:22px;margin-top:1px"/>I understand the limits and will follow my call’s consent rules.</label></aside></section>
    <section class="panel" aria-labelledby="transcript-title"><div class="transcript-tools"><div><h2 id="transcript-title">Session text</h2><p class="hint">Kept in memory until you export or close the app.</p></div><div class="action-row"><button class="button" id="correct" type="button" disabled>Correct last <kbd>⌘/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd></button><button class="button" id="export-txt" type="button" disabled>Export TXT</button><button class="button" id="export-csv" type="button" disabled>Export CSV</button><button class="button" id="clear" type="button" disabled>Clear session</button></div></div><div class="transcript" id="transcript"><p class="muted">Your local captions will collect here. Nothing is saved automatically.</p></div></section>
    <footer class="footer"><span>No telemetry</span><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></footer>
  </div>`;

const mic = $('#microphone') as HTMLSelectElement;
const model = $('#model') as HTMLInputElement;
const consent = $('#consent') as HTMLInputElement;
const caption = $('#caption') as HTMLOutputElement;
const status = $('#status') as HTMLElement;
const start = $('#start') as HTMLButtonElement;
const stop = $('#stop') as HTMLButtonElement;

function setStatus(message: string, kind: 'error' | 'success' | '' = '') { status.textContent = message; status.dataset.kind = kind; }
function formatTime(at: Date) { return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function renderTranscript() { const transcript = $('#transcript'); transcript.innerHTML = captions.length ? captions.map((item, i) => `<p data-index="${i}"><span class="timestamp">${formatTime(item.at)}</span>${escapeHtml(item.text)}</p>`).join('') : '<p class="muted">Your local captions will collect here. Nothing is saved automatically.</p>'; for (const el of document.querySelectorAll<HTMLButtonElement>('#correct,#export-txt,#export-csv,#clear')) el.disabled = !captions.length; }
function escapeHtml(value: string) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
async function native<T>(command: string, args?: Record<string, unknown>): Promise<T> { const { invoke } = await import('@tauri-apps/api/core'); return invoke<T>(command, args); }
async function refreshDevices() { try { const devices = await navigator.mediaDevices.enumerateDevices(); const inputs = devices.filter(device => device.kind === 'audioinput'); mic.innerHTML = '<option value="">Choose a microphone…</option>' + inputs.map((device, index) => `<option value="${escapeHtml(device.deviceId)}">${escapeHtml(device.label || `Microphone ${index + 1}`)}</option>`).join(''); setStatus(inputs.length ? 'Choose a microphone, a local model, and confirm the consent guidance.' : 'No microphone was found. Connect one, then reopen the app.', inputs.length ? '' : 'error'); } catch { mic.innerHTML = '<option value="">No microphone available</option>'; setStatus('The app could not list microphones. Check system microphone access, then reopen the app.', 'error'); } }
async function deliverChunks() {
  if (!running || transcribing) return;
  transcribing = true;
  try {
    while (running && pendingChunks.length) {
      const chunk = pendingChunks.shift()!;
      const text = await native<string>('transcribe_chunk', { modelPath: model.value, samples: chunk });
      if (running && text.trim()) await addCaption(text.trim());
      if (pendingChunks.length > 1) setStatus('The local model is falling behind. Choose a smaller model for faster captions.', 'error');
    }
  } catch (error) {
    setStatus(`Could not transcribe locally: ${String(error)}. Check the Whisper model file and try again.`, 'error');
    stopSession();
  } finally { transcribing = false; }
}
async function addCaption(text: string) { const item = { text, at: new Date() }; captions.push(item); caption.textContent = text; caption.classList.remove('empty'); renderTranscript(); try { const { emit } = await import('@tauri-apps/api/event'); await emit('caption', { text, at: item.at.toISOString() }); } catch { /* browser preview has no native overlay */ } }
async function startSession() { if (!consent.checked) return setStatus('Confirm the consent guidance before starting captions.', 'error'); if (!mic.value) return setStatus('Choose a microphone first.', 'error'); if (!model.value.trim()) return setStatus('Choose a local Whisper-compatible model file first.', 'error'); try { stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: mic.value }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); audioContext = new AudioContext(); await audioContext.resume(); const source = audioContext.createMediaStreamSource(stream); processor = audioContext.createScriptProcessor(4096, 1, 1); processor.onaudioprocess = event => { event.outputBuffer.getChannelData(0).fill(0); if (!running) return; pendingChunks.push(...chunker.push(event.inputBuffer.getChannelData(0), audioContext!.sampleRate)); void deliverChunks(); }; running = true; source.connect(processor); processor.connect(audioContext.destination); start.disabled = true; stop.disabled = false; caption.textContent = 'Listening locally…'; caption.classList.remove('empty'); setStatus('Captioning from the selected microphone. Audio is processed locally and discarded.', 'success'); } catch (error) { stream?.getTracks().forEach(track => track.stop()); stream = undefined; void audioContext?.close(); audioContext = undefined; setStatus(`Could not open that microphone: ${String(error)}. Check system access and try again.`, 'error'); } }
function stopSession() { running = false; processor?.disconnect(); processor = undefined; stream?.getTracks().forEach(track => track.stop()); stream = undefined; void audioContext?.close(); audioContext = undefined; chunker.clear(); pendingChunks.length = 0; start.disabled = false; stop.disabled = true; setStatus('Caption session stopped. Only the session text shown below remains in memory.', 'success'); }
function exportFile(kind: 'txt' | 'csv') { const content = kind === 'txt' ? captions.map(c => `[${formatTime(c.at)}] ${c.text}`).join('\n') : ['timestamp,caption', ...captions.map(c => `"${c.at.toISOString()}","${c.text.replaceAll('"', '""')}"`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: kind === 'txt' ? 'text/plain' : 'text/csv' })); a.download = `private-call-captions-${new Date().toISOString().slice(0, 10)}.${kind}`; a.click(); URL.revokeObjectURL(a.href); setStatus(`Exported local ${kind.toUpperCase()} file.`, 'success'); }
$('#choose-model').addEventListener('click', async () => { try { const { open } = await import('@tauri-apps/plugin-dialog'); const picked = await open({ multiple: false, filters: [{ name: 'Whisper models', extensions: ['bin', 'gguf'] }] }); if (typeof picked === 'string') { model.value = picked; localStorage.setItem('pcc:model', picked); } } catch { setStatus('Model picker is available in the desktop app. Paste a local model path in this browser preview.', 'error'); } });
start.addEventListener('click', startSession); stop.addEventListener('click', stopSession); $('#overlay').addEventListener('click', async () => { try { await native('open_caption_window'); setStatus('Opened a resizable caption window.', 'success'); } catch { setStatus('The separate caption window is available in the installed desktop app.', 'error'); } });
$('#correct').addEventListener('click', () => { const last = captions.at(-1); if (!last) return; const corrected = window.prompt('Correct the last caption:', last.text); if (corrected?.trim()) { last.text = corrected.trim(); caption.textContent = last.text; renderTranscript(); setStatus('Last caption corrected locally.', 'success'); } });
$('#export-txt').addEventListener('click', () => exportFile('txt')); $('#export-csv').addEventListener('click', () => exportFile('csv')); $('#clear').addEventListener('click', () => { if (window.confirm(`Clear ${captions.length} caption${captions.length === 1 ? '' : 's'} from this session? This cannot be undone.`)) { captions = []; caption.textContent = 'Session cleared. Start captions when ready.'; caption.classList.add('empty'); renderTranscript(); setStatus('Session text cleared.', 'success'); } });
window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e') { event.preventDefault(); ($('#correct') as HTMLButtonElement).click(); } });
model.value = localStorage.getItem('pcc:model') ?? '';
void refreshDevices();
navigator.mediaDevices?.addEventListener?.('devicechange', () => void refreshDevices());
