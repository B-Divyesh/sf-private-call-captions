#!/usr/bin/env sh
set -eu
REPO="B-Divyesh/sf-private-call-captions"
BASE="https://github.com/$REPO/releases/latest/download"
OS="$(uname -s)"; ARCH="$(uname -m)"
case "$OS" in Darwin) KEY="macos-x64"; [ "$ARCH" = "arm64" ] && KEY="macos-arm64";; Linux) KEY="linux";; *) echo "Use install.ps1 on Windows." >&2; exit 1;; esac
MANIFEST="$(curl -fsSL "$BASE/latest.json")"
URL="$(printf '%s' "$MANIFEST" | tr -d '[:space:]' | sed -n "s/.*\"$KEY\":{\"url\":\"\([^\"]*\)\"}.*/\1/p")"
[ -n "$URL" ] || { echo "No $KEY installer is published yet." >&2; exit 1; }
NAME="${URL##*/}"; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fL "$URL" -o "$TMP/$NAME"
curl -fsSL "$BASE/SHA256SUMS" -o "$TMP/SHA256SUMS"
(cd "$TMP" && grep "  $NAME$" SHA256SUMS | sha256sum -c -)
echo "Verified $NAME. Opening installer; follow your platform's prompts."
trap - EXIT
case "$OS" in Darwin) open "$TMP/$NAME"; echo "Installer remains at $TMP/$NAME until you remove it.";; Linux) echo "Verified installer is at $TMP/$NAME (AppImage: chmod +x then run; .deb: sudo apt install).";; esac
