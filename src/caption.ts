import './style.css';
const output = document.querySelector<HTMLOutputElement>('#overlay-caption')!;
const status = document.querySelector<HTMLElement>('.overlay-status')!;
void import('@tauri-apps/api/event').then(({ listen }) => listen<{text:string}>('caption', event => { output.textContent = event.payload.text; status.textContent = 'Local microphone captions'; })).catch(() => { status.textContent = 'Open this window from the desktop app'; });
