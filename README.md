# Private Call Captions

Private Call Captions is a desktop accessibility companion for deaf and hard-of-hearing people in sensitive calls. It turns **only the microphone you select** into large, local captions. It does not capture system audio, record calls, create an account, send audio to a transcription service, or retain audio.

It is deliberately not a meeting bot, recorder, cloud note taker, speaker identifier, or a substitute for legal, medical, or emergency communication.

## What works

- Local Whisper-compatible model transcription through the Tauri/Rust core
- Explicit microphone selection; browser audio capture is microphone-only
- A resizable, high-contrast companion caption window
- Correction hotkey: `Ctrl/⌘ + Shift + E`
- In-memory session transcript and user-triggered TXT/CSV export
- Consent/limitations guidance before a session
- Download site with OS-aware release links, checksum-verified install scripts, and local license restore

The app ships no speech model. Select a GGML/GGUF Whisper-compatible local model file in the app. This keeps a potentially large model out of the installer and leaves model choice/license review with the operator. Review the license for any model you obtain before use; do not assume a third-party converted model has the same terms as Whisper source code. The app uses `whisper-rs` and does not download models itself.

## Develop

Requirements: Node 22+, Rust stable, and the system prerequisites for [Tauri 2](https://v2.tauri.app/start/prerequisites/). No runtime CDN or third-party script is used.

```sh
npm install
npm run dev              # browser UI preview
npm run dev:desktop      # local Tauri app
npm test
npm run build            # desktop web assets -> dist/, download site -> dist/site/
```

`npm run build` is the exact static-site build command; its deploy root is `dist/site` (with `index.html` at that root). Tauri’s build invokes the same command before packaging the desktop app.

## Install and release

The GitHub Actions release workflow runs on tags such as `v0.1.0` and produces unsigned macOS `.dmg`, Windows `.msi`/`.exe`, and Linux `.AppImage`/`.deb` assets. It also attaches `SHA256SUMS` and `latest.json` to the GitHub Release. The download site reads GitHub’s release metadata API to choose an OS asset.

After the first site visit, the sample demo can open offline. The desktop app does not need a network request to caption a selected microphone after you choose a local model file.

```sh
curl -fsSL https://private-call-captions.sociobot.in/install.sh | sh
```

```powershell
irm https://private-call-captions.sociobot.in/install.ps1 | iex
```

Both scripts check the release checksum before opening an installer. Builds are unsigned until the operator provides signing certificates; on macOS use right-click → Open for an unsigned build, and inspect the Windows warning before proceeding.

## Privacy and commercial terms

See [`/privacy`](privacy/index.html) and [`/terms`](terms/index.html). A future visual-customization unlock is one-time via Sociobot/Dodo; captions, export, and safety guidance are free. License tokens are stored only in local storage and verified against Sociobot at most daily when online.

## License

[MIT](LICENSE).
