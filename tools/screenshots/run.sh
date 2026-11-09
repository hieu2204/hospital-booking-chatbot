#!/bin/sh
# Chụp màn hình các trang bằng Chromium không giao diện, ảnh lưu ở tools/screenshots/out/.
# Cần frontend và backend đang chạy. Ví dụ: sh tools/screenshots/run.sh home booking
cd "$(dirname "$0")"
MSYS_NO_PATHCONV=1 docker run --rm --network chatbot_default -v "$(pwd -W 2>/dev/null || pwd):/work" -w /work node:22-alpine sh -c \
  "apk add --no-cache -q chromium font-noto >/dev/null && [ -d node_modules ] || (echo '{\"type\":\"module\"}' > package.json && npm i -q --no-audit --no-fund puppeteer-core@23.10.4 >/dev/null); node shoot.mjs $*"
