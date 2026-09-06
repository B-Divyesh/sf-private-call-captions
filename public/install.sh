#!/usr/bin/env sh
set -eu
REPO="B-Divyesh/sf-private-call-captions"
BASE="${PCC_RELEASE_BASE:-https://github.com/$REPO/releases/latest/download}"
OS="$(uname -s)"; ARCH="$(uname -m)"
case "$OS" in Darwin) KEY="macos-x64"; [ "$ARCH" = "arm64" ] && KEY="macos-arm64";; Linux) KEY="linux";; *) echo "Use install.ps1 on Windows." >&2; exit 1;; esac
MANIFEST="$(curl -fsSL "$BASE/latest.json")"
URL="$(printf '%s' "$MANIFEST" | tr -d '[:space:]' | sed -n "s/.*\"$KEY\":{[^}]*\"url\":\"\([^\"]*\)\".*/\1/p")"
[ -n "$URL" ] || { echo "No $KEY installer is published yet." >&2; exit 1; }
NAME="${URL##*/}"; [ -z "${PCC_ASSET_BASE:-}" ] || URL="$PCC_ASSET_BASE/$NAME"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fL "$URL" -o "$TMP/$NAME"
curl -fsSL "$BASE/SHA256SUMS" -o "$TMP/SHA256SUMS"
(cd "$TMP" && awk -v name="$NAME" '$2 == name { print; found=1 } END { if (!found) exit 1 }' SHA256SUMS | sha256sum -c -)
echo "Verified $NAME."
case "$OS" in
  Darwin)
    trap - EXIT
    if [ "${PCC_INSTALLER_NO_OPEN:-0}" = "1" ]; then echo "Installer is at $TMP/$NAME."; else open "$TMP/$NAME"; echo "Installer remains at $TMP/$NAME until you remove it."; fi
    ;;
  Linux)
    INSTALL_DIR="${PCC_INSTALL_DIR:-${XDG_BIN_HOME:-$HOME/.local/bin}}"
    mkdir -p "$INSTALL_DIR"
    install -m 755 "$TMP/$NAME" "$INSTALL_DIR/private-call-captions"
    echo "Installed Private Call Captions at $INSTALL_DIR/private-call-captions."
    case ":$PATH:" in *":$INSTALL_DIR:"*) :;; *) echo "Add $INSTALL_DIR to PATH to launch it by name.";; esac
    ;;
esac
