# Private Call Captions — handoff

## Delivered

- Tauri 2 desktop app with selected-microphone-only capture, 16 kHz local sample handling, Rust `whisper-rs` transcription, a model-file picker, consent guidance, correction hotkey, local TXT/CSV export, and a resizable dedicated caption window.
- Audio is never written to disk by the app. Session text is memory-only until the user explicitly exports it. System-audio capture, cloud transcription, bots, speaker identification, recording, and automatic model downloads are absent by design.
- Product-specific paper-cut diorama system documented in `.factory/design.md`; original generated illustration is optimised to a 136 KB WebP and retained with PNG source/prompt sidecar under `assets/src/`.
- Static download site in `dist/site` with OS detection, release-manifest lookup, checksum-aware installer scripts, local license return/restore/once-daily verification, privacy and terms pages.
- GitHub Actions release matrix for macOS arm64/x64, Windows, and Linux. It publishes all generated installer assets, `SHA256SUMS`, and `latest.json` via `softprops/action-gh-release`.

## Run and verify

```sh
npm ci
npm test
npm run build
npm run dev:desktop
```

Verified locally on 2026-08-28:

- `npm test` — 2 passing tests
- `npx tsc --noEmit` — passes
- `npm run build` — passes; static deploy root is `dist/site/index.html`
- Static output: largest initial JS 2.73 KB (site) / 9.43 KB (app), CSS 5.84 KB, hero WebP 136 KB; all below stated budgets.
- `curl` smoke test confirmed app root `lang=en`, title, main landmark, and `/privacy/` HTTP 200. Build has no third-party runtime requests or CDNs.
- Rust API calls were source-checked against the installed `whisper-rs 0.12` crate and `cargo fmt --check` passes.

## Known gap / operator action

`cargo check --manifest-path src-tauri/Cargo.toml` could not complete in this disposable worker because its host lacks `glib-2.0` development headers (`pkg-config` error). This is an environment dependency, not a source compile error; the release workflow uses `tauri-apps/tauri-action` on `ubuntu-22.04`, whose build environment supplies its Linux prerequisites. Run the check on a Tauri-ready workstation or CI as a final native verification.

The initial v0.1.0 workflow attempt did not create jobs before the portable YAML fix. The v0.1.1 Linux bundle exposed missing runner headers; the workflow now installs the documented Tauri Linux prerequisites. The v0.1.2 tag triggers the corrected release workflow; verify a downloaded asset against the release `SHA256SUMS` and confirm `latest.json` has real URLs before publishing the download site.

Installers are intentionally unsigned. For production signing, add these repository secrets before release:

- `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- `WINDOWS_CERT_PFX`, `WINDOWS_CERT_PASSWORD`

Update the release workflow with the corresponding Tauri signing/notarization environment variables once those credentials are supplied. Until then, macOS users need right-click → Open and Windows users must review the unsigned-app warning.

## Next useful step

Choose and document an approved distribution path for a Whisper GGML/GGUF model (including its model-weight license and supported languages). The application intentionally requires an explicit local model path so it never performs a hidden model/audio network request.
