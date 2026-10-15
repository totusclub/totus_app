#!/usr/bin/env bash
# Выполняется внутри reactivecircus/android-emulator-runner (эмулятор уже запущен).
# Ставит собранный APK и прогоняет Maestro. Рабочая папка — $GITHUB_WORKSPACE.
set -uo pipefail

OUT="${OUT:-$PWD/qa-out/android}"
APK=$(ls totus_APP/android/app/build/outputs/apk/release/*x86_64*.apk 2>/dev/null | head -1)
if [ -z "$APK" ]; then
  echo "::error::APK не найден в android/app/build/outputs/apk/release"
  exit 1
fi
adb install -r "$APK" || exit 1
bash totus_APP/scripts/ci/run-maestro.sh android com.totus.com "$OUT"
