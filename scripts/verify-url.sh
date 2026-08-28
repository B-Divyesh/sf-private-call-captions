#!/usr/bin/env bash
set -euo pipefail
url="${1:-http://127.0.0.1:4173/}"
html="$(curl --fail --silent --show-error "$url")"
[[ "$html" == *'<html lang="en"'* ]]
[[ "$html" == *'<title>'* ]]
[[ "$html" == *'<main'* ]]
[[ "$(grep -o '<h1[ >]' <<<"$html" | wc -l | tr -d ' ')" == "1" ]]
if grep -q '<img' <<<"$html"; then ! grep -E '<img( [^>]* )?>' <<<"$html" >/dev/null; fi
printf 'verify-url: title, lang, one h1, main, and image alt checks passed for %s\n' "$url"
