#!/usr/bin/env bash
# Ежедневный прогон приложения Totus Club через Maestro на всех подключённых устройствах.
# Описание сценариев, подготовка Mac и устройств — .maestro/README_RU.md.
#
# Использование (из корня totus_APP, на Mac с Maestro, Xcode и adb):
#   scripts/maestro-checkup.sh            # ежедневный набор (тег daily) на всех устройствах
#   scripts/maestro-checkup.sh --auth     # плюс Маша и чат поддержки (нужен вход QA-учёткой)
#   scripts/maestro-checkup.sh --fresh    # только чистый запуск и онбординг (выходит из аккаунта!)
#   scripts/maestro-checkup.sh --only ios | --only android
#
# Устройства:
#   Android — все из `adb devices` (кабель + отладка по USB);
#   iOS-симуляторы — все запущенные (Booted) в `xcrun simctl`;
#   iPhone / iPad по кабелю — из `xcrun xctrace list devices` (поддержка реальных iOS-устройств
#     в Maestro зависит от версии; если не работает — используйте симуляторы);
#   IOS_DEVICES="udid1 udid2" — задать iOS-устройства вручную (тогда автопоиск iOS выключен).
# Приложение: IOS_APP_ID (по умолчанию app.totus.club), ANDROID_APP_ID (по умолчанию com.totus.com).
#
# Результат: reports/maestro/<дата_время>/SUMMARY.md (+ JUnit XML, логи и скриншоты по устройствам).
# Код выхода: 0 — всё прошло, 1 — есть упавшие сценарии, 2 — нет Maestro или устройств.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_APP_ID="${IOS_APP_ID:-app.totus.club}"
ANDROID_APP_ID="${ANDROID_APP_ID:-com.totus.com}"
TAGS="daily"
ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --auth) TAGS="daily,auth" ;;
    --fresh) TAGS="fresh" ;;
    --only) shift; ONLY="${1:-}" ;;
    -h|--help) sed -n 2,20p "$0"; exit 0 ;;
    *) echo "Неизвестный параметр: $1" >&2; exit 2 ;;
  esac
  shift
done
if [ "${RUN_AUTH_FLOWS:-0}" = "1" ] && [ "$TAGS" = "daily" ]; then
  TAGS="daily,auth"
fi

STAMP="$(date +%Y-%m-%d_%H-%M)"
OUT="$ROOT/reports/maestro/$STAMP"
mkdir -p "$OUT"
DEVICES_FILE="$OUT/devices.tsv"   # id <TAB> платформа <TAB> название
: > "$DEVICES_FILE"

if ! command -v maestro >/dev/null 2>&1; then
  echo "❌ Maestro не установлен. Установка: curl -fsSL \"https://get.maestro.mobile.dev\" | bash" | tee "$OUT/SUMMARY.md"
  exit 2
fi

# --- Android ---
if [ "$ONLY" != "ios" ] && command -v adb >/dev/null 2>&1; then
  for id in $(adb devices | awk 'NR>1 && $2=="device" {print $1}'); do
    model="$(adb -s "$id" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
    printf '%s\tandroid\t%s\n' "$id" "${model:-Android}" >> "$DEVICES_FILE"
  done
fi

# --- iOS ---
if [ "$ONLY" != "android" ] && command -v xcrun >/dev/null 2>&1; then
  if [ -n "${IOS_DEVICES:-}" ]; then
    for id in $IOS_DEVICES; do
      printf '%s\tios\t%s\n' "$id" "iOS $id" >> "$DEVICES_FILE"
    done
  else
    # Запущенные симуляторы: «    iPhone 15 (UDID) (Booted)»
    xcrun simctl list devices booted 2>/dev/null \
      | sed -nE 's/^ +(.+) \(([0-9A-F-]{36})\) \(Booted\).*/\2\t\1 (симулятор)/p' \
      | while IFS="$(printf '\t')" read -r id name; do
          printf '%s\tios\t%s\n' "$id" "$name" >> "$DEVICES_FILE"
        done
    # Реальные iPhone / iPad по кабелю: секция «== Devices ==», строки с версией iOS в скобках.
    xcrun xctrace list devices 2>/dev/null \
      | awk '/^== Devices ==/{d=1; next} /^== /{d=0} d' \
      | sed -nE 's/^(.+) \(([0-9.]+)\) \(([0-9A-Fa-f-]{20,})\)$/\3\t\1/p' \
      | while IFS="$(printf '\t')" read -r id name; do
          printf '%s\tios\t%s\n' "$id" "$name" >> "$DEVICES_FILE"
        done
  fi
fi

if [ ! -s "$DEVICES_FILE" ]; then
  echo "❌ Не найдено ни одного устройства: подключите Android (отладка по USB), iPhone/iPad или запустите симулятор." | tee "$OUT/SUMMARY.md"
  exit 2
fi

echo "Maestro: теги [$TAGS], устройства:"
sed 's/^/  /' "$DEVICES_FILE"

overall=0
while IFS="$(printf '\t')" read -r id platform name; do
  [ -z "$id" ] && continue
  slug="$(printf '%s_%s' "$platform" "$name" | tr -cs 'A-Za-z0-9._-' '_' | cut -c1-60)"
  if [ "$platform" = "android" ]; then app="$ANDROID_APP_ID"; else app="$IOS_APP_ID"; fi
  echo "▶ $name ($platform, $id)"
  start=$(date +%s)
  maestro --device "$id" test "$ROOT/.maestro" \
    --include-tags "$TAGS" \
    -e APP_ID="$app" \
    --format junit --output "$OUT/$slug.xml" \
    --debug-output "$OUT/$slug" \
    > "$OUT/$slug.log" 2>&1 < /dev/null
  code=$?
  printf '%s\t%s\t%s\t%s\t%s\n' "$slug" "$platform" "$name" "$code" "$(( $(date +%s) - start ))" >> "$OUT/runs.tsv"
  [ $code -ne 0 ] && overall=1
done < "$DEVICES_FILE"

node "$ROOT/scripts/maestro-summary.mjs" "$OUT" "$TAGS" > "$OUT/SUMMARY.md"
cat "$OUT/SUMMARY.md"
echo
echo "Подробности: $OUT"
exit $overall
