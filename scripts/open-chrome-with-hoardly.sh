#!/usr/bin/env bash
# 方案 A：用未打包扩展启动 Chrome（读取你本机真实书签；需已安装 Google Chrome）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/.output/chrome-mv3"
if [[ ! -f "$EXT/manifest.json" ]]; then
  echo "缺少 $EXT/manifest.json，请先运行: npm run build" >&2
  exit 1
fi

CHROME_APP="/Applications/Google Chrome.app"
if [[ ! -d "$CHROME_APP" ]]; then
  echo "未找到 $CHROME_APP，请安装 Google Chrome 后重试。" >&2
  exit 1
fi

echo "正在启动 Chrome 并加载扩展: $EXT"
echo "启动后：在 chrome://extensions 确认 Hoardly 已启用 → 点「详细信息」→「扩展程序选项」或在新标签打开扩展的 app 页（全屏书签）。"
open -na "Google Chrome" --args --load-extension="$EXT"
