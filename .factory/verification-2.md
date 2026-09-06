# Private Call Captions — verification 2

**Job:** Read one chosen microphone as local captions during a private call.  
**Audience:** Deaf or hard-of-hearing people who need readable text during sensitive voice or video calls.  
**First action:** **Try it with sample data**; it opens a populated private sample session in one click.  
**Implementation candidate reviewed:** `6459b9376826c24ac7ec945528890e93b0a15f3e`  
**Documentation HEAD:** `0bed0657d81100539f9cc118fe5841bb4ee2c4d2`  
**Live URL:** https://private-call-captions.sociobot.in  
**Verified:** 2026-09-06 UTC  
**Verdict: FAIL — one Medium finding.**

## Finding

### Medium — documented clean setup cannot run the native test

`README.md` says that a developer needs the Tauri 2 system prerequisites, then documents `npm run test:native` as a verification command. In a fresh checkout, after `npm ci` and the documented Linux Tauri prerequisites, that command still could not run:

- `whisper-rs-sys` first failed because no `libclang.so` was available.
- After installing `clang` / `libclang-dev`, it then failed because `cmake` was not installed.

Only after installing both `libclang-dev` and `cmake` did `npm run test:native` pass. These are dependencies of the product's local Whisper binding, not listed as prerequisites in the README or in the linked Tauri setup guidance. This makes the documented clean development/test path incomplete. Add the Linux package names (or an equivalent documented prerequisite) before the native test command.

This is a documentation and reproducibility finding. It does not change the live product result or leave a public claim untested.

## Claims

All nine commands in `.factory/claims.json` were run separately after `npm ci`. Every command passed, so the untested-claim count is **0**.

| Claim | Result | Evidence |
| --- | --- | --- |
| `download-detection` | PASS | GitHub API release fixture selected a Linux installer and reused the one-hour cache. |
| `installer-integrity` | PASS | Temporary release server generated metadata and installed checksum-matched AppImage bytes. |
| `demo-sandbox` | PASS | Sample correction/reset retained seeded real `pcc:model` data. |
| `session-tools` | PASS | Corrected sample exported valid TXT and four-line CSV. |
| `private-demo` | PASS | Demo browser request record allowed only product origin and its declared release API. |
| `offline-reload` | PASS | Fresh context reloaded `/demo/` offline after its first visit. |
| `private-native-session` | PASS | Mocked desktop flow blocked capture before consent/selection, used the exact selected device, produced a caption, exported, and made no network request. |
| `caption-latency` | PASS | 30-minute simulation produced exactly 1,800 one-second transcription windows. |
| `billing-status` | PASS | Unregistered offer showed no price/checkout action and made no billing request. |

## Live product checks

- Fresh Chromium desktop and iPhone-sized contexts both showed the job, audience, and first action above the fold before scrolling. There was no horizontal overflow, page error, or console error.
- `/demo/` immediately displayed three realistic appointment-call captions. The persistent **Demo — sample data, nothing is saved** label remained after correction; TXT and CSV downloads completed; Reset restored the original caption. Start for real removed `demo:private-call-captions:sample` and retained a seeded real `pcc:model` value.
- A fresh live demo visit registered its service worker, then reloaded offline with its populated caption intact.
- Keyboard checks reached the skip link, moved focus to `#main`, and remained usable. At 390 px, reduced motion resolved to `animation: none` and `transition-duration: 0s`.
- Live Playwright axe WCAG 2 A/AA scans of `/`, `/demo/`, `/privacy/`, `/terms/`, and `/404.html` had zero serious or critical violations. Each page had exactly one `h1`, a `main` landmark, route-specific title, and no console/page errors. The standalone `@axe-core/cli` could not locate a system Chrome binary in this container; Playwright's installed Chromium axe integration was used instead, as permitted by the accessibility contract.
- `scripts/verify-url.sh` passed against every public page above. Links, legal pages, route titles, sitemap, robots, and the designed 404 were checked. An unknown live URL returns the designed page with HTTP **404**, which is expected.
- Live root HTML SHA-256 matched the candidate build: `16fcff16b5fd70e780d15611872cbf49fcf0ad053a60f4c1a89e7fbf573acfa7`. Commits after the implementation candidate are documentation only.
- Hashed live JavaScript has `Cache-Control: public, max-age=31536000, immutable`.

## Desktop release check

The GitHub API reported `v0.1.6` with both macOS DMGs, Windows MSI/EXE, Linux AppImage/DEB, `latest.json`, and `SHA256SUMS`; each asset returned an HTTP range response. In a clean temporary consumer directory, the public `install.sh` downloaded the Linux AppImage, verified checksum `ac7a5deef32b…665d04f86`, installed it, and extracted the expected `AppRun` and application executable. It also launched under an isolated Xvfb configuration and exposed the **Private Call Captions** window title.

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| Incorrect installer manifest/asset names | Fixed: v0.1.6 metadata and all eight released assets are present; clean installer verification passed. |
| Four-second caption batching | Fixed: the 30-minute regression observed 1,800 one-second windows. |
| Microphone opened before consent and selection | Fixed: the native claim flow observed zero capture until both gates and asserted exact device selection. |
| Invisible/price-less checkout | Fixed safely: no checkout is rendered while no offer or price exists. |
| Billing validation did not send 429/Retry-After | Not applicable to this release: the static product makes no billing request and exposes no checkout/verification route. This remains an operator prerequisite before an offer is enabled. |
| Unlisted public claims | No unlisted claim finding in this review. The nine outcome tests cover the visible privacy, demo, export, offline, installer, latency, and billing-state promises. |
| Hashed assets cached for 30 seconds | Fixed: live hashed asset caching is one year plus `immutable`. |
| Designed 404 returned HTTP 200 | Fixed: unknown live route returned HTTP 404 with the designed recovery page. |

## Local commands

Passed: `npm ci`, `npm test` (8 unit and 15 browser tests), `npm run build`, every individual claim command above, `npm run test:native`, and `cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

The native command required the additional `libclang-dev` and `cmake` packages described in the finding. No product code was changed during this verification.
