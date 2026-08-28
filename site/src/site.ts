import './site.css';
import { detectedPlatform, getLatestRelease, platformLabel } from './release';

const slug = 'private-call-captions';
const repoReleasePage = 'https://github.com/B-Divyesh/sf-private-call-captions/releases';

async function loadRelease() {
  const link = document.querySelector<HTMLAnchorElement>('#download-link');
  const note = document.querySelector<HTMLElement>('#release-note');
  if (!link || !note) return;
  const { release } = await getLatestRelease();
  const currentPlatform = detectedPlatform();
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
function safeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }

function handleLicense() {
  const input = document.querySelector<HTMLInputElement>('#license');
  const button = document.querySelector<HTMLButtonElement>('#restore');
  const status = document.querySelector<HTMLElement>('#license-status');
  const query = new URLSearchParams(location.search);
  const incoming = query.get('license');
  if (incoming) {
    safeSet(`sb_license:${slug}`, incoming);
    query.delete('license');
    history.replaceState({}, '', `${location.pathname}${query.toString() ? `?${query}` : ''}`);
  }
  if (!input || !button || !status) return;
  const verify = async (token: string, force = false) => {
    let cached: { valid?: boolean; checked_at?: number } | null = null;
    try { cached = JSON.parse(safeGet(`sb_license_verdict:${slug}`) ?? 'null'); } catch { /* invalid local value can be replaced */ }
    if (!force && cached?.checked_at && Date.now() - cached.checked_at < 86_400_000) {
      status.textContent = cached.valid ? 'License active.' : 'License no longer active. You can purchase a new one above.';
      return;
    }
    try {
      const response = await fetch(`https://api.sociobot.in/api/v1/products/${slug}/verify?license=${encodeURIComponent(token)}`);
      if (!response.ok) throw new Error('License check was unavailable.');
      const verdict = await response.json() as { valid?: boolean };
      safeSet(`sb_license_verdict:${slug}`, JSON.stringify({ ...verdict, checked_at: Date.now() }));
      status.textContent = verdict.valid ? 'License active.' : 'License no longer active. You can purchase a new one above.';
    } catch { status.textContent = 'License saved locally. We will check it when you are online.'; }
  };
  const stored = safeGet(`sb_license:${slug}`);
  if (stored) void verify(stored);
  button.addEventListener('click', () => {
    const token = input.value.trim();
    if (!token) { status.textContent = 'Paste a license token first.'; return; }
    safeSet(`sb_license:${slug}`, token);
    status.textContent = 'License saved locally; checking when online…';
    void verify(token, true);
  });
}

function setupDemo() {
  const output = document.querySelector<HTMLElement>('#demo-caption');
  const transcript = document.querySelector<HTMLElement>('#demo-transcript');
  const reset = document.querySelector<HTMLButtonElement>('#demo-reset');
  const startReal = document.querySelector<HTMLAnchorElement>('#demo-start-real');
  if (!output || !transcript || !reset || !startReal) return;
  const sample = [
    'I can hear you now. Shall we start with the appointment time?',
    'Tuesday at two works for me. Please repeat the building number.',
    'It is 24 Moss Lane. I will bring the signed form.',
  ];
  const render = () => {
    output.textContent = sample[2];
    transcript.innerHTML = sample.map((line, index) => `<p><span>${['10:04:12', '10:04:18', '10:04:25'][index]}</span>${line}</p>`).join('');
    safeSet('demo:private-call-captions:sample', 'shown');
  };
  reset.addEventListener('click', () => { try { localStorage.removeItem('demo:private-call-captions:sample'); } catch { /* no persistence required */ } render(); });
  startReal.addEventListener('click', () => { try { localStorage.removeItem('demo:private-call-captions:sample'); } catch { /* no persistence required */ } });
  render();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

void loadRelease();
handleLicense();
setupDemo();
registerServiceWorker();
