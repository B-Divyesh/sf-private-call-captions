# Independent verification — FAIL

**Candidate:** `ff5a276dd92f38a1e3f3d1c9f76fce4a3427501d` (`main`)  
**Live URL:** https://private-call-captions.sociobot.in  
**Verified:** 2026-08-28 UTC  
**Verdict:** **FAIL — do not release.**

## Cold first read

Fresh Chromium load of the live home page answered the first-read questions in plain language: it makes local captions from one selected microphone, for people who need readable text on sensitive calls, and the first action is **“Try it with sample data”**. The link opens `/demo/` in one click. The demo banner says “Demo — sample data, nothing is saved,” shows three realistic appointment-call captions, Reset demo works, and Start for real removes `demo:private-call-captions:sample` before returning home.

This gate passed.

## Mandatory claims result

From this clean candidate checkout, after `npm ci`, every command in `.factory/claims.json` passed against the product's built `/demo/` entry point:

| Claim | Command | Result |
| --- | --- | --- |
| `download-detection` | `npm run test:browser -- --grep @claim:download-detection` | PASS (1 test) |
| `demo-sandbox` | `npm run test:browser -- --grep @claim:demo-sandbox` | PASS (1 test) |
| `private-demo` | `npm run test:browser -- --grep @claim:private-demo` | PASS (1 test) |
| `offline-reload` | `npm run test:browser -- --grep @claim:offline-reload` | PASS (1 test) |

The passing listed tests do **not** make the claims contract pass. The landing page and README make many additional reliance claims with no `claims.json` entry or demo test: no account, no call recording, free exports, microphone-only/no system audio, local model processing, no caption service, session-memory behavior, the correction hotkey, and checksum-verifying installers. The supplied claims contract explicitly makes any such unlisted claim a release failure.

## Release-blocking defects

### Critical — published one-line installer is broken

The published `v0.1.4` `latest.json` names assets such as `Private Call Captions_0.1.4_amd64.AppImage`, but the actual release asset is `Private.Call.Captions_0.1.4_amd64.AppImage` (dots, not spaces). The same name mismatch is in `SHA256SUMS`; its entries also include a `release/` prefix. Its `macos-arm64` URL additionally points at the x64 filename.

Fresh evidence: `sh public/install.sh` exited **22**. Its first installer download received `curl: (22) The requested URL returned error: 404`. Direct `curl -I` returned 404 for the manifest URL and 302/200 for the real dotted AppImage URL. This fails the required one-step installer, valid `latest.json`, and checksum-verification release contract. The landing page’s GitHub API links themselves selected working platform assets in Linux, Windows, Intel macOS, and Apple-silicon macOS user-agent checks; the installer manifest is the broken path.

### Critical — native caption loop cannot meet the under-two-second success measure

`src/main.ts` down-samples to 16,000 Hz and calls `transcribe_chunk` only after `samples.length >= 64,000` (`deliverChunk`, line 41). Therefore it waits **at least 4.0 seconds of audio** before transcription starts (`64,000 / 16,000`), excluding model execution and rendering. The researched brief requires median caption latency under two seconds in the representative two-person call. This is impossible with the implemented batching cadence and there is no 30-minute latency test.

### High — microphone access begins before the consent gate and before a microphone is selected

On app load, `void refreshDevices()` calls `navigator.mediaDevices.getUserMedia({ audio: true })` (line 40) merely to enumerate labels. That opens the default microphone before the user accepts the displayed consent checkbox or chooses a microphone. This contradicts the explicit selected-microphone privacy boundary and prominent consent expectation. It is not covered by a claim test.

### High — paid unlock action has invisible text, and the required price is absent

On the live page the checkout anchor has computed foreground `rgb(255, 249, 236)` and background `rgb(255, 249, 236)`: “Buy a one-time unlock” is visually invisible (1:1 contrast). This is directly visible in fresh desktop and 390 px screenshots. The page also says “Buy once” but gives no exact price, contrary to the paid-unlock contract. Axe did not flag this because it did not report the color combination, so the visual inspection is material.

### High — license verification endpoint did not rate-limit

The product calls `https://api.sociobot.in/api/v1/products/private-call-captions/verify`. A fresh concurrent burst of 30 invalid-license GET requests returned **30 × HTTP 200**, with no `429`, `Retry-After`, or rate-limit header. Observed threshold: **not reached by 30 rapid requests**. The work order expressly requires a 429 plus `Retry-After` for product server-side/product-unlock endpoints.

### Medium — deployed hashed assets are not immutably cached

Live `site-D8FgaM52.js`, `site-BPa_QBIM.css`, and the hero WebP all return `Cache-Control: public, must-revalidate, max-age=30`. The performance contract requires long-lived immutable caching for hashed assets. The JS and CSS themselves meet the size budget (5.32 KB/2.34 KB gzip and 5.82 KB/1.94 KB gzip); this is a cache-policy defect, not a bundle-size defect.

## Checks that passed

- `npm ci` completed: 67 packages audited, 0 vulnerabilities.
- `npm test` passed: 5 Vitest tests and 7 Playwright tests.
- `npx tsc --noEmit` passed. No lint script exists.
- Exact production build `npm run build` passed and produced `dist/` and `dist/site/`.
- `scripts/verify-url.sh` passed locally for `/` and `/demo/` (title, lang, one h1, main, alt checks).
- Live root, demo, privacy, and terms returned 200; each had one h1 and no console/page errors. Live axe WCAG 2 A/AA scans found zero serious/critical violations on all four routes.
- At 390 px the live page had no horizontal overflow; the primary action was 50 px high. Keyboard focus was a visible 4 px clay outline. Reduced motion resolved transition duration to 0 and animation to `none`.
- The live demo’s cold request set was only same-origin assets; the landing additionally requested the explicitly used GitHub Releases API. No tracking request was seen.
- Live security headers include CSP restricting connects to self, GitHub Releases API, and the Sociobot licensing API; `X-Content-Type-Options: nosniff`, strict referrer policy, and HSTS are present. The designed 404 content renders, though the static host returns it with HTTP 200.
- Deployment parity passed: live `/` SHA-256 is `4a4e938e595bc1173e6c1d7197eb9092b27782a57c0b46d539756341b67d6457`, identical to this candidate’s `dist/site/index.html`; its live JS/CSS bytes also exactly matched the candidate build. The rendered live version is v0.1.4.
- The actual dotted AppImage was downloaded and its SHA-256, `c9e3871d532e65d9e3682ee91926d92bb20494a054784dfc130386d393b8d906`, matches the checksum value. This does not repair the broken manifest/install flow.

## Native build limitation

`cargo test --manifest-path src-tauri/Cargo.toml` could not start in this disposable verifier container because `pkg-config` cannot find system `glib-2.0`; it fails while compiling `glib-sys`. There are no Rust tests in the candidate. I did not build desktop binaries locally because the product’s installer contract directs platform binaries to GitHub Actions. This environmental limitation does not affect the source-level latency and premature-capture findings above.

## Required remediation before re-verification

1. Publish a new release whose `latest.json`, release asset names, SHA256SUMS paths, and install scripts refer to the same real files; test `install.sh` and the Windows script end to end.
2. Change the native pipeline to produce captions with measured sub-two-second median latency; add a representative end-to-end latency test.
3. Do not request microphone access until the user has explicitly consented and selected an input.
4. Repair checkout button contrast, publish the exact price, and add required claim coverage for every visitor-facing claim.
5. Add/verify 429 + `Retry-After` protection to the product license endpoint, and deploy immutable caching for hashed assets.
