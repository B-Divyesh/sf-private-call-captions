# Private Call Captions — repair handoff

## Status

The repaired implementation is commit `6459b9376826c24ac7ec945528890e93b0a15f3e` and tag `v0.1.6`. The documentation commit is recorded in a final metadata amendment after this handoff body. The static site was deployed from this implementation as Azure Static Web Apps deployment `632ec8d9-7b0a-4a60-ab05-0558d118b791`.

## Repairs

- The desktop app now lists microphones without opening one. Capture starts only after the user accepts the consent guidance, selects a microphone, and selects a local model. The capture request uses that device ID exactly.
- Audio is submitted in one-second, 16 kHz windows instead of four-second windows. Transcription runs off the Tauri UI thread, and the Rust core keeps the selected Whisper context in memory between windows. A visible warning tells the user when their chosen local model falls behind.
- Release artifacts receive deterministic, space-free names. One generator creates `latest.json` and `SHA256SUMS` from the files that actually exist. It fails if any required platform is absent. The Linux and Windows install scripts use the manifest filename, require an exact checksum line, and are exercised against built artifacts in GitHub Actions.
- The one-click demo now corrects a realistic caption, exports matching TXT and CSV files, resets to the original sample, and leaves real app settings unchanged.
- The unregistered visual-settings offer is retained as a future one-time paid deliverable, but the broken checkout and license form are no longer shown. The site states that no payment is taken and that no price is set.
- Nine visitor-facing claims now have exactly one outcome test each. Native privacy, consent, one-second batching, demo isolation, exports, offline reload, download selection, installer integrity, and billing unavailability are covered.
- Hashed JavaScript, CSS, and artwork use `Cache-Control: public, max-age=31536000, immutable`. Unknown live URLs now return the designed page with HTTP 404.
- Phone visitors are directed to desktop downloads instead of receiving a guessed macOS installer. The first screen, route copy, checkout-state contrast, keyboard focus, legal pages, and 404 language were tightened.

## Verification

Run from a clean checkout after installing the documented Tauri system prerequisites:

```sh
npm ci
npm test
npm run build
npm run test:native
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Results on 6 September 2026:

- `npm ci`: 67 packages audited, 0 vulnerabilities.
- `npm test`: 8 Vitest tests and 15 Playwright tests passed. This includes axe WCAG 2 A/AA scans of every site route and the desktop webview.
- Every command in `.factory/claims.json` was then run separately; all 9 passed.
- `npm run build`: passed. The site is 5.19 KB JavaScript (2.22 KB gzip), 6.20 KB CSS (2.00 KB gzip), and 138,774 bytes of hero artwork. The desktop webview entry is 9.90 KB JavaScript (4.10 KB gzip).
- `npm run test:native`: passed after installing Tauri's Linux prerequisites. Rust has no standalone unit cases; this gate proves the native crate compiles and links. `cargo fmt --check` passed.
- `scripts/verify-url.sh` passed for `/`, `/demo/`, `/privacy/`, `/terms/`, and `/404.html` locally, then for all four public routes over HTTPS.
- The 30-minute audio simulation emitted exactly 1,800 one-second windows. The browser-level native flow used a selected microphone, a delayed local-command mock, and rendered the first caption within its two-second assertion.
- Fresh live desktop and 390 px phone contexts had no errors on successful routes, no horizontal overflow, a 50 px primary phone action, visible skip-link focus, and reduced motion resolved to no animation and zero-duration transitions.
- The live demo showed three populated captions, kept its demo label after correction, downloaded TXT and CSV, reset correctly, and preserved a seeded real `pcc:model` value while removing its demo key on exit.
- Live axe scans found no serious or critical issues on `/`, `/demo/`, `/privacy/`, and `/terms/`. A deliberate missing URL returned HTTP 404 with the designed title and return link.
- Live Lighthouse: performance 100, accessibility 100, best practices 100, SEO 100; LCP 1.522 s, CLS 0.0021, total blocking time 14 ms.
- Live and built `index.html` SHA-256 matched: `16fcff16b5fd70e780d15611872cbf49fcf0ad053a60f4c1a89e7fbf573acfa7`.
- GitHub Actions run `34012208311` passed all four platform bundle jobs and its release job. The Windows job exercised `install.ps1`; the release job exercised `install.sh` against the built AppImage before publication.
- Release `v0.1.6` contains eight assets: both macOS DMGs, Windows MSI and EXE, Linux AppImage and DEB, `SHA256SUMS`, and `latest.json`. Every manifest URL names an existing asset.
- A clean invocation of the public HTTPS `install.sh` downloaded and installed the 81,226,232-byte AppImage. Its SHA-256 was `ac7a5deef32ab2b5c2b092a79f726fbf2c3f5876c64a54d5958e15e665d04f86`, exactly matching `SHA256SUMS`; AppImage extraction exposed the expected executable.
- A final fresh Chromium load resolved the desktop action to the real `v0.1.6` Linux AppImage and the phone action to the `v0.1.6` release page, with no console errors.

## Earlier findings

| Finding | Current disposition |
| --- | --- |
| Manifest named nonexistent installers | Fixed. Release `v0.1.6`, its metadata, both installer checks, a public script install, and the downloaded AppImage checksum all passed. |
| Four-second native buffer | Fixed to one-second windows; 30-minute window-count regression passes. |
| Microphone opened before consent/selection | Fixed; the native browser test observes zero capture before both gates and checks the exact selected device constraint. |
| Invisible checkout and missing price | The unregistered offer cannot honestly take payment, so no checkout is rendered. The reserved paid deliverable and “Price: not set” state remain visible and contrast-tested. |
| Verify endpoint lacked 429 and `Retry-After` | The static product no longer calls or links the unregistered billing flow. The shared billing endpoint still requires operator-side rate limiting before a future offer can launch. |
| Public claims were unlisted | Fixed: 9 claims, 9 unique tagged outcome tests. |
| Hashed assets cached for 30 seconds | Fixed and verified live at one year plus `immutable`. |
| Designed 404 returned HTTP 200 | Fixed; an unknown live URL returns HTTP 404. |

## Billing dependency

The public Sociobot checkout currently returns 404 because this product has no registered offer. No actual price exists in the repository or live response. `/work/.evidence/billing-offer.json` was therefore not created: inventing a price would violate the work order. The free core remains complete, and personal colors/type sizes remain reserved for the future one-time offer.

Before enabling checkout, the billing operator must register the exact price and return URL, supply the public offer metadata, and ensure the validation route returns `429` with `Retry-After` under burst traffic. The product can then restore the standard purchase and license flow without moving captioning, corrections, export, or safety features behind payment.

## Known limits and operator actions

- Real latency depends on the user's model and computer. The former guaranteed four-second delay is removed, but this container did not run a 30-minute physical call with a production model. Do not advertise a universal under-two-second result until that hardware/model benchmark passes.
- The installer intentionally contains no speech model. Users must choose a compatible local GGML/GGUF model and review that model's license.
- Builds are unsigned. macOS and Windows signing/notarization still require the repository secrets listed in the prior handoff (`APPLE_*` and `WINDOWS_CERT_*`). No credential is included here.
- `v0.1.5` was a failed, unpublished release attempt: its platform builds completed, but the new Windows installer check exposed binary response handling in PowerShell. `v0.1.6` contains that repair and supersedes it.

## Catalog and evidence

`.factory/catalog-description.txt` contains a 103-character verb-first description and is copied byte-for-byte to `/work/.evidence/catalog-description.txt`. Fresh desktop and phone screenshots are in `/work/.evidence/private-call-captions-desktop.png` and `/work/.evidence/private-call-captions-phone.png`.
