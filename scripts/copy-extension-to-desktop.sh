#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/.output/chrome-mv3"
DESKTOP="${HOME}/Desktop"
DEST_DIR="$DESKTOP/Hoardly-chrome-extension"

if [[ ! -d "$SRC" ]]; then
  echo "copy-extension-to-desktop: 未找到 $SRC，请先执行 npm run build" >&2
  exit 1
fi

mkdir -p "$DESKTOP"
rm -rf "$DEST_DIR"
cp -R "$SRC" "$DEST_DIR"

shopt -s nullglob
for z in "$ROOT"/.output/*-chrome.zip; do
  cp -f "$z" "$DESKTOP/"
  echo "copy-extension-to-desktop: 已复制 $(basename "$z") → $DESKTOP/"
done

echo "copy-extension-to-desktop: 已复制未打包扩展 → ${DEST_DIR} （在 Chrome 里选此文件夹「加载已解压」）"
