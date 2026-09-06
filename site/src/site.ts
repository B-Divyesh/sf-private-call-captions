import './site.css';
import { detectedPlatform, getLatestRelease, platformLabel } from './release';

const repoReleasePage = 'https://github.com/B-Divyesh/sf-private-call-captions/releases';

async function loadRelease() {
  const link = document.querySelector<HTMLAnchorElement>('#download-link');
  const note = document.querySelector<HTMLElement>('#release-note');
  if (!link || !note) return;
  const { release } = await getLatestRelease();
  const currentPlatform = detectedPlatform();
  if (currentPlatform === 'mobile') {
    link.href = release?.releaseUrl ?? repoReleasePage;
    link.textContent = 'View desktop downloads';
    note.textContent = release ? `Version ${release.version}. Install the app on a Mac, Windows, or Linux computer.` : 'Downloads are being published. The desktop release page will list each installer.';
    return;
  }
  const asset = release?.platforms[currentPlatform] ?? release?.platforms.linux;
  if (!release || !asset) {
    link.href = release?.releaseUrl ?? repoReleasePage;
    link.textContent = 'View downloads on GitHub';
    note.textContent = 'Downloads are being published. The GitHub release page lists each installer when it is ready.';
    return;
  }
  link.href = asset;
  link.textContent = `Download for ${platformLabel(currentPlatform)}`;
  note.textContent = `Version ${release.version}. Installers are unsigned; read the install notes below.`;
}

function safeSet(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage is optional */ } }
function setupDemo() {
  const output = document.querySelector<HTMLElement>('#demo-caption');
  const transcript = document.querySelector<HTMLElement>('#demo-transcript');
  const reset = document.querySelector<HTMLButtonElement>('#demo-reset');
  const startReal = document.querySelector<HTMLAnchorElement>('#demo-start-real');
  const correct = document.querySelector<HTMLButtonElement>('#demo-correct');
  const exportTxt = document.querySelector<HTMLButtonElement>('#demo-export-txt');
  const exportCsv = document.querySelector<HTMLButtonElement>('#demo-export-csv');
  const status = document.querySelector<HTMLElement>('#demo-status');
  if (!output || !transcript || !reset || !startReal || !correct || !exportTxt || !exportCsv || !status) return;
  const original = [
    'I can hear you now. Shall we start with the appointment time?',
    'Tuesday at two works for me. Please repeat the building number.',
    'It is 24 Moss Lane. I will bring the signed form.',
  ];
  let sample = [...original];
  const render = () => {
    output.textContent = sample[2];
    transcript.innerHTML = sample.map((line, index) => `<p><span>${['10:04:12', '10:04:18', '10:04:25'][index]}</span>${line}</p>`).join('');
    safeSet('demo:private-call-captions:sample', 'shown');
  };
  const download = (kind: 'txt' | 'csv') => {
    const times = ['10:04:12', '10:04:18', '10:04:25'];
    const content = kind === 'txt'
      ? sample.map((line, index) => `[${times[index]}] ${line}`).join('\n')
      : ['timestamp,caption', ...sample.map((line, index) => `"${times[index]}","${line.replaceAll('"', '""')}"`)].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: kind === 'txt' ? 'text/plain' : 'text/csv' }));
    link.download = `private-call-captions-sample.${kind}`;
    link.click();
    URL.revokeObjectURL(link.href);
    status.textContent = `Exported the sample ${kind.toUpperCase()} file.`;
  };
  reset.addEventListener('click', () => { try { localStorage.removeItem('demo:private-call-captions:sample'); } catch { /* no persistence required */ } sample = [...original]; render(); status.textContent = 'Sample captions reset.'; });
  startReal.addEventListener('click', () => { try { localStorage.removeItem('demo:private-call-captions:sample'); } catch { /* no persistence required */ } });
  correct.addEventListener('click', () => { sample[2] = 'The address is 24 Moss Lane. I will bring the signed form.'; render(); status.textContent = 'Corrected the last sample caption.'; });
  exportTxt.addEventListener('click', () => download('txt'));
  exportCsv.addEventListener('click', () => download('csv'));
  render();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

void loadRelease();
setupDemo();
registerServiceWorker();
