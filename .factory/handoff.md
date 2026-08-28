# Private Call Captions — repair handoff

## Repair delivered

- Replaced the landing-page fetch of `github.com/.../releases/latest/download/latest.json` with the CORS-enabled GitHub Releases API: `https://api.github.com/repos/B-Divyesh/sf-private-call-captions/releases/latest`.
- The site maps API asset names to macOS Apple silicon, macOS Intel, Windows, and Linux installers. It stores successful normalized metadata in `localStorage` key `pcc:release-metadata:v1` for one hour. Installer URLs still point to GitHub Release downloads, but only as navigation targets.
- An unavailable, malformed, rate-limited, or offline API response now produces the calm “Downloads are being published” state and a direct GitHub Releases link. JSON, storage, release lookup, service-worker registration, and license verification failure paths are caught so they do not become uncaught page errors.
- Added focused unit and Playwright regression coverage for API-only lookup, asset mapping, cache reuse, publishing fallback, and no legacy download-manifest request.
- Completed the static site skeleton: plain-language first screen, `/demo/`, `/privacy/`, `/terms/`, styled 404 page, route titles/canonical metadata, social preview, favicon/touch icon, robots, sitemap, CSP/static-host config, and a cache-first offline shell.
- The demo shows a realistic three-line appointment-call sample immediately. Its only storage key is `demo:private-call-captions:sample`; reset and exit remove it. `.factory/demo.md`, `.factory/claims.json`, and `.factory/copy-audit.md` record the verification contract.

## Exact verification evidence

Run from a clean checkout:

```sh
npm ci
npm run build
npm test
```

Executed on 2026-08-28:

- `npm ci` — completed, 67 packages audited, 0 vulnerabilities.
- `npm run build` — completed. The desktop web build is in `dist/`; the static deployment root is `dist/site/`.
- `npm test` — 5 Vitest tests and 7 Playwright tests passed. Browser tests cover release success/failure, API-only lookup, demo isolation, privacy request interception, offline reload, keyboard skip-link focus, mobile 390 px actions, and axe WCAG 2 A/AA serious/critical violations.
- `npx tsc --noEmit` — passed before the clean run.
- `./scripts/verify-url.sh http://127.0.0.1:4173/` and `/demo/` — passed title, `lang`, exactly one `h1`, `main`, and image-alt checks.
- Built landing assets: 5.32 KB JS (2.34 KB gzip), 5.82 KB CSS (1.94 KB gzip), and 136 KB hero WebP. No third-party fonts, scripts, or analytics are bundled.
- Reproduction: `curl -I https://github.com/B-Divyesh/sf-private-call-captions/releases/latest/download/latest.json` returned a GitHub 302 redirect path without `Access-Control-Allow-Origin`; `curl -I https://api.github.com/repos/B-Divyesh/sf-private-call-captions/releases/latest` returned `access-control-allow-origin: *`.
- Live release identity: GitHub API returned v0.1.4 with `latest.json`, `SHA256SUMS`, and all desktop installer asset types. Downloaded `Private.Call.Captions_0.1.4_amd64.AppImage`; SHA-256 `c9e3871d532e65d9e3682ee91926d92bb20494a054784dfc130386d393b8d906` matched its release checksum.

## Deployment

Deploy the static artifact directory `dist/site/` using the factory static-host deployment configuration after this commit is pushed. The live identity check before deployment confirmed `https://private-call-captions.sociobot.in` was serving the prior site; recheck the root after deployment for the API release lookup.

## Operator action

Installers remain unsigned. To sign production desktop releases, provide these repository secrets and wire their Tauri signing/notarization variables in `.github/workflows/release.yml`:

- `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- `WINDOWS_CERT_PFX`, `WINDOWS_CERT_PASSWORD`

Until then, macOS users need right-click → Open and Windows users need to review the unsigned-app warning. The app intentionally requires a user-provided Whisper-compatible local model file; document an approved model distribution/license before promoting the app further.
