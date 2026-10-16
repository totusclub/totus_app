#!/usr/bin/env bash
# Готовит зависимость @tosmedia/ai-assistant-native для npm ci в CI.
# package.json ссылается на локальный архив (file:../totus_ai_v2/packages/ai-assistant-native/…tgz),
# которого нет в Git: собираем его из соседнего checkout tosmedia/totus_ai_v2 (npm pack)
# и кладём под ожидаемым именем.
# Пересобранный архив не совпадает побайтно с архивом на машине разработчика, поэтому
# integrity этого пакета в package-lock.json снимаем (только в рабочей копии CI, в Git не попадает).
# usage: prepare-ai-package.sh <app-dir>
set -euo pipefail

APP_DIR="$(cd "${1:?app dir}" && pwd)"
SPEC=$(node -p "require('$APP_DIR/package.json').dependencies['@tosmedia/ai-assistant-native'] || ''")
case "$SPEC" in
  file:*) ;;
  *) echo "@tosmedia/ai-assistant-native: '$SPEC' — не file:, готовить нечего"; exit 0 ;;
esac

TGZ=$(node -p "require('path').resolve('$APP_DIR', '${SPEC#file:}')")
PKG_DIR=$(dirname "$TGZ")
if [ ! -f "$PKG_DIR/package.json" ]; then
  echo "::error::Нет $PKG_DIR — checkout tosmedia/totus_ai_v2 рядом с totus_APP не удался"
  exit 1
fi

if [ ! -f "$TGZ" ]; then
  cd "$PKG_DIR"
  if [ ! -f dist/index.js ]; then
    npm install --no-audit --no-fund
    npm run build
  fi
  PACKED=$(npm pack --silent | tail -1)
  [ "$PACKED" = "$(basename "$TGZ")" ] || mv "$PACKED" "$TGZ"
  echo "Собран $(basename "$TGZ") из totus_ai_v2@$(git -C "$PKG_DIR" rev-parse --short HEAD 2>/dev/null || echo '?') (версия в package.json: $(node -p "require('./package.json').version"))"
fi

node -e '
const fs = require("fs");
const p = process.argv[1];
const lock = JSON.parse(fs.readFileSync(p, "utf8"));
const key = "node_modules/@tosmedia/ai-assistant-native";
if (lock.packages && lock.packages[key]) delete lock.packages[key].integrity;
fs.writeFileSync(p, JSON.stringify(lock, null, 2) + "\n");
' "$APP_DIR/package-lock.json"
