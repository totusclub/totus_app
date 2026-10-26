#!/usr/bin/env bash
# Один прогон стенда Totus QA на Mac mini: свежий код → сборки → Android, iPhone, iPad по очереди →
# SUMMARY.md → issue «QA приложения на Mac mini» (метка qa-mac) → при падениях разбор через Claude Code.
# Запускается launchd каждый день (scripts/qa-mac/setup.sh --schedule HH:MM) или вручную.
#
#   scripts/qa-mac/run.sh                  # всё по умолчанию
#   scripts/qa-mac/run.sh --only android   # только Android (или ios / iphone / ipad)
#   scripts/qa-mac/run.sh --tags daily,auth
#   scripts/qa-mac/run.sh --no-pull --no-build --no-issue --no-triage
#
# Сценарии ничего не вводят, не входят, не бронируют и не пишут в поддержку и Миле (.maestro/README_RU.md).
# Коды выхода: 0 — всё прошло; 1 — есть упавшие сценарии; 2 — ничего не проверено; 4 — прогон уже идёт.

set -u
[ -f "$HOME/.totus-qa/env" ] && . "$HOME/.totus-qa/env"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="$HOME/.totus-qa"
BUILDS="${TOTUS_BUILDS_DIR:-$HOME/TotusBuilds}"
AVD="${TOTUS_AVD:-totus_android}"
REPO_SLUG="${QA_REPO_SLUG:-tosmedia/totus_APP}"
TAGS="${QA_TAGS:-daily}"
ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then ABI="arm64-v8a"; else ABI="x86_64"; fi
AI_DIR="$(cd "$ROOT/.." && pwd)/totus_ai_v2"
EMU_PORT=5554
EMU="emulator-$EMU_PORT"   # адрес эмулятора в adb (телефоны по USB, если подключены, проверяются тоже)

PULL=1; BUILD=1; ISSUE="${QA_ISSUE:-1}"; TRIAGE="${QA_AI_TRIAGE:-1}"; ONLY=""
ARGS=("$@")
while [ $# -gt 0 ]; do
  case "$1" in
    --no-pull) PULL=0 ;;
    --no-build) BUILD=0 ;;
    --no-issue) ISSUE=0 ;;
    --no-triage) TRIAGE=0 ;;
    --only) shift; ONLY="${1:-}" ;;
    --tags) shift; TAGS="${1:-daily}" ;;
    -h|--help) sed -n 2,13p "$0"; exit 0 ;;
    *) echo "Неизвестный параметр: $1" >&2; exit 2 ;;
  esac
  shift
done
want() { [ -z "$ONLY" ] || [ "$ONLY" = "$1" ] || { [ "$ONLY" = ios ] && [ "$1" != android ]; }; }

mkdir -p "$STATE/logs"
cd "$ROOT" || exit 2

# 1. Свежий код. Скрипт может обновиться сам — после pull запускаем уже новую версию.
if [ "$PULL" = 1 ]; then
  echo "▶ git pull"
  # Рабочие правки сборки (integrity пакета Милы, Podfile.lock после pod install) не должны мешать pull.
  git checkout -q -- package-lock.json ios/Podfile.lock 2>/dev/null || true
  if git fetch -q origin main && git checkout -q main && git pull -q --ff-only origin main; then
    echo "  totus_APP: $(git log -1 --format='%h %s' | cut -c1-90)"
  else
    echo "  ⚠️ git pull не прошёл — прогон на текущем коде" | tee "$STATE/pull-warning.txt"
  fi
  [ -d "$AI_DIR/.git" ] && git -C "$AI_DIR" pull -q --ff-only 2>/dev/null
  exec bash "$ROOT/scripts/qa-mac/run.sh" --no-pull ${ARGS[@]+"${ARGS[@]}"}
fi

# 2. Один прогон за раз.
LOCK="$STATE/run.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +240 2>/dev/null)" ]; then rm -rf "$LOCK"; mkdir "$LOCK"; else echo "Прогон уже идёт ($LOCK)"; exit 4; fi
fi
EMU_PID=""
BOOTED=""
cleanup() {
  [ -n "$EMU_PID" ] && { adb -s "$EMU" emu kill >/dev/null 2>&1; sleep 3; kill "$EMU_PID" >/dev/null 2>&1; }
  for u in $BOOTED; do xcrun simctl shutdown "$u" >/dev/null 2>&1; done
  rm -rf "$LOCK"
}
trap cleanup EXIT INT TERM

RUN="$ROOT/reports/maestro/$(date +%Y-%m-%d_%H-%M)"
mkdir -p "$RUN"
NOTES="$RUN/NOTES.md"
: > "$NOTES"
note() { echo "  $*"; echo "- $*" >> "$NOTES"; }
[ -f "$STATE/pull-warning.txt" ] && { note "$(sed 's/^ *//' "$STATE/pull-warning.txt")"; rm -f "$STATE/pull-warning.txt"; }
note "код: totus_APP $(git log -1 --format='%h от %cd' --date=format:'%d.%m %H:%M')$( [ -d "$AI_DIR/.git" ] && echo ", totus_ai_v2 $(git -C "$AI_DIR" log -1 --format=%h)")"
echo "Отчёт: $RUN"

# Пропущенное устройство — строка ⚠️ в отчёте (код 3 в runs.tsv, причина — в <slug>.log).
skip() { # skip <slug> <platform> <name> <reason>
  echo "$4" > "$RUN/$1.log"
  printf '%s\t%s\t%s\t3\t0\n' "$1" "$2" "$3" >> "$RUN/runs.tsv"
  echo "  ⚠️ $3: $4"
}
newest() { ls -td "$@" 2>/dev/null | head -1; }

# 3. JS-зависимости (общие для Android и iOS), только если менялись.
deps_ready=""
ensure_deps() {
  [ -n "$deps_ready" ] && return "$([ "$deps_ready" = ok ] && echo 0 || echo 1)"
  local h log="$RUN/build-deps.log"
  h="$(cat package.json package-lock.json 2>/dev/null | shasum | cut -c1-16)-$( [ -d "$AI_DIR/.git" ] && git -C "$AI_DIR" rev-parse --short HEAD)"
  if [ -d node_modules ] && [ "$(cat "$STATE/deps.hash" 2>/dev/null)" = "$h" ]; then deps_ready=ok; return 0; fi
  echo "▶ npm ci (зависимости изменились)"
  if { bash scripts/ci/prepare-ai-package.sh "$ROOT" && { npm ci --no-audit --no-fund || npm install --no-audit --no-fund; }; } >"$log" 2>&1; then
    echo "$h" > "$STATE/deps.hash"; deps_ready=ok
  else
    deps_ready=fail; note "⚠️ npm ci не прошёл (build-deps.log) — беру готовые сборки из $BUILDS"
  fi
  git checkout -q -- package-lock.json 2>/dev/null || true
  [ "$deps_ready" = ok ]
}

# 4. Сборки.
APK=""; APP=""
if want android; then
  echo "▶ сборка Android ($ABI)"
  if [ "$BUILD" = 1 ] && [ -x android/gradlew ] && ensure_deps; then
    if ( cd android && ./gradlew assembleRelease -PreactNativeArchitectures="$ABI" --no-daemon ) > "$RUN/build-android.log" 2>&1; then
      APK="$(newest android/app/build/outputs/apk/release/*"$ABI"*.apk android/app/build/outputs/apk/release/*.apk)"
      note "Android: собран из Git — $(basename "$APK")"
    else
      note "⚠️ Android: сборка из Git не прошла (build-android.log: $(grep -m1 -E 'FAILURE|error:' "$RUN/build-android.log" | cut -c1-120))"
    fi
  fi
  if [ -z "$APK" ]; then
    APK="$(newest "$BUILDS"/*.apk)"
    [ -n "$APK" ] && note "Android: готовая сборка $(basename "$APK") от $(date -r "$APK" '+%d.%m %H:%M')"
  fi
fi
if want iphone || want ipad; then
  echo "▶ сборка iOS для симулятора"
  if [ "$BUILD" = 1 ] && [ -d ios/totusClubApp.xcodeproj ] && ensure_deps; then
    if { ( cd ios && pod install ) && xcodebuild -workspace ios/totusClubApp.xcworkspace -scheme totusClubApp \
          -configuration Release -sdk iphonesimulator -destination "generic/platform=iOS Simulator" \
          -derivedDataPath "$STATE/ios-build" CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build; } > "$RUN/build-ios.log" 2>&1; then
      APP="$(newest "$STATE"/ios-build/Build/Products/Release-iphonesimulator/*.app)"
      note "iOS: собран из Git — $(basename "$APP")"
    else
      note "⚠️ iOS: сборка из Git не прошла (build-ios.log: $(grep -m1 -E 'error:|BUILD FAILED' "$RUN/build-ios.log" | cut -c1-120))"
    fi
  elif [ "$BUILD" = 1 ] && [ ! -d ios/totusClubApp.xcodeproj ]; then
    note "iOS: в Git нет ios/totusClubApp.xcodeproj — из исходников не собрать, беру готовую сборку из $BUILDS"
  fi
  if [ -z "$APP" ]; then
    APP="$(newest "$BUILDS"/*.app)"
    if [ -z "$APP" ]; then
      Z="$(newest "$BUILDS"/*.app.zip "$BUILDS"/*.zip)"
      if [ -n "$Z" ]; then
        rm -rf "$STATE/app-from-zip" && mkdir -p "$STATE/app-from-zip" && ditto -x -k "$Z" "$STATE/app-from-zip"
        APP="$(find "$STATE/app-from-zip" -maxdepth 3 -name '*.app' -type d | head -1)"
      fi
    fi
    [ -n "$APP" ] && note "iOS: готовая сборка $(basename "$APP") от $(date -r "$APP" '+%d.%m %H:%M')"
  fi
fi

CHECKUP=(bash "$ROOT/scripts/maestro-checkup.sh" --out "$RUN" --tags "$TAGS")

# 5. Android: эмулятор без окна → установка → сценарии → выключение.
if want android; then
  if [ -z "$APK" ]; then
    skip android_none android "Android (эмулятор)" "нет сборки: не собралась из Git и нет *.apk в $BUILDS"
  elif ! command -v emulator >/dev/null 2>&1; then
    skip android_none android "Android (эмулятор)" "эмулятор не установлен — scripts/qa-mac/setup.sh"
  else
    echo "▶ Android: запуск эмулятора $AVD"
    emulator -avd "$AVD" -port "$EMU_PORT" -no-window -no-audio -no-boot-anim -no-snapshot-save -gpu swiftshader_indirect \
      > "$RUN/emulator.log" 2>&1 &
    EMU_PID=$!
    booted=0
    for _ in $(seq 1 90); do
      [ "$(adb -s "$EMU" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && { booted=1; break; }
      sleep 4
    done
    if [ "$booted" != 1 ]; then
      skip android_boot android "Android (эмулятор)" "эмулятор не загрузился за 6 минут (emulator.log)"
    else
      for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb -s "$EMU" shell settings put global "$k" 0; done
      out="$(adb -s "$EMU" install -r "$APK" 2>&1)"
      if echo "$out" | grep -q INSTALL_FAILED_UPDATE_INCOMPATIBLE; then
        adb -s "$EMU" uninstall com.totus.com >/dev/null 2>&1
        out="$(adb -s "$EMU" install "$APK" 2>&1)"
        note "⚠️ Android: подпись сборки сменилась — приложение переустановлено, вход QA-учёткой на эмуляторе сброшен"
      fi
      if echo "$out" | grep -q Success; then
        "${CHECKUP[@]}" --only android
      else
        skip android_install android "Android (эмулятор)" "APK не установился: $(echo "$out" | tail -1 | cut -c1-150)"
      fi
    fi
    adb -s "$EMU" emu kill >/dev/null 2>&1; sleep 5; kill "$EMU_PID" >/dev/null 2>&1; EMU_PID=""
  fi
fi

# 6. iPhone, iPad: симулятор → установка → сценарии → выключение.
run_sim() { # run_sim <kind> <udid> <name>
  local kind="$1" udid="$2" name="$3"
  if [ -z "$udid" ]; then skip "ios_$kind" ios "$name" "симулятор не создан — scripts/qa-mac/setup.sh"; return; fi
  if [ -z "$APP" ]; then skip "ios_$kind" ios "$name" "нет сборки для симулятора: из Git не собрать и нет *.app в $BUILDS"; return; fi
  echo "▶ $name: запуск симулятора"
  xcrun simctl boot "$udid" >/dev/null 2>&1
  BOOTED="$BOOTED $udid"
  if ! xcrun simctl bootstatus "$udid" -b > "$RUN/sim-$kind.log" 2>&1; then
    skip "ios_$kind" ios "$name" "симулятор не загрузился (sim-$kind.log)"
  elif ! xcrun simctl install "$udid" "$APP" >> "$RUN/sim-$kind.log" 2>&1; then
    skip "ios_$kind" ios "$name" "сборка не установилась (sim-$kind.log; для Intel нужен срез x86_64)"
  else
    IOS_DEVICES="$udid" "${CHECKUP[@]}" --only ios
  fi
  xcrun simctl shutdown "$udid" >/dev/null 2>&1
}
want iphone && run_sim iphone "${TOTUS_IOS_IPHONE:-}" "Totus iPhone (симулятор)"
want ipad && run_sim ipad "${TOTUS_IOS_IPAD:-}" "Totus iPad (симулятор)"

# 7. Итог.
if [ ! -s "$RUN/runs.tsv" ]; then echo "Ничего не проверено"; exit 2; fi
node "$ROOT/scripts/maestro-summary.mjs" "$RUN" "$TAGS" > "$RUN/SUMMARY.md"
{ echo; echo "**Сборки и стенд** ($(scutil --get ComputerName 2>/dev/null || hostname), $(sw_vers -productVersion), $ARCH):"; cat "$NOTES"; } >> "$RUN/SUMMARY.md"
FAILED=0; head -1 "$RUN/SUMMARY.md" | grep -q '^ЕСТЬ ПРОБЛЕМЫ' && FAILED=1

# 8. Разбор падений Claude Code — только чтение файлов, ничего не меняет.
if [ "$FAILED" = 1 ] && [ "$TRIAGE" = 1 ] && command -v claude >/dev/null 2>&1; then
  echo "▶ разбор падений (Claude Code)"
  REL="${RUN#"$ROOT"/}"
  PROMPT="Ты QA-инженер приложения Totus Club (React Native, iOS и Android). В папке $REL — результаты сегодняшнего прогона Maestro: SUMMARY.md, логи устройств (*.log), отметки шагов (commands*.json), скриншоты (*.png). Сценарии — .maestro/flows, общие шаги — .maestro/subflows, код приложения — src/.
Для каждого упавшего сценария определи причину: поломка приложения, ответ сервера или Level.Travel (нет туров, ошибка API), устаревший сценарий (переименовали кнопку) или сбой стенда (эмулятор, симулятор, установка). Смотри скриншот момента падения и шаг, на котором упало. Предложи исправление: какой файл и что поменять.
Ничего не меняй и не запускай. Ответ — по-русски, не длиннее 30 строк, по пунктам: «Сценарий — устройство — причина — что сделать». Не пиши персональные данные, токены и коды доступа."
  if perl -e 'alarm shift; exec @ARGV' 900 claude -p --tools "Read,Glob,Grep" --allowedTools "Read,Glob,Grep" --max-turns 40 "$PROMPT" \
       > "$RUN/TRIAGE.md" 2> "$RUN/triage.log"; then
    echo "  разбор: $RUN/TRIAGE.md"
  else
    echo "  ⚠️ разбор не получился (triage.log)"; rm -f "$RUN/TRIAGE.md"
  fi
fi

# 9. Issue в GitHub: тело — последний прогон, комментарий — при падении.
if [ "$ISSUE" = 1 ] && command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  BODY="$RUN/issue-body.md"
  {
    echo "_Стенд Mac mini, прогон $(date '+%d.%m.%Y %H:%M') (Ереван). Обновляется каждый прогон — scripts/qa-mac/run.sh._"
    echo
    cat "$RUN/SUMMARY.md"
    echo
    echo "Скриншоты и логи — на стенде: \`~${RUN#"$HOME"}\`."
  } > "$BODY"
  gh label create qa-mac -R "$REPO_SLUG" --color 0E8A16 --description "Стенд Mac mini: прогон приложения Maestro" >/dev/null 2>&1 || true
  NUM="$(gh issue list -R "$REPO_SLUG" --label qa-mac --state open --json number -q '.[0].number' 2>/dev/null)"
  if [ -z "$NUM" ]; then
    URL="$(gh issue create -R "$REPO_SLUG" --title "QA приложения на Mac mini — последний прогон" --label qa-mac --body-file "$BODY" 2>>"$RUN/issue.log")"
    NUM="${URL##*/}"
  else
    gh issue edit "$NUM" -R "$REPO_SLUG" --body-file "$BODY" >/dev/null 2>>"$RUN/issue.log"
  fi
  if [ "$FAILED" = 1 ] && [ -n "$NUM" ]; then
    {
      head -1 "$RUN/SUMMARY.md"; echo
      echo '| Устройство | Сценарий | Статус | Время | Причина |'; echo '|---|---|---|---|---|'
      grep -E '\| (❌|⚠️) \|' "$RUN/SUMMARY.md"
      [ -s "$RUN/TRIAGE.md" ] && { echo; echo "**Разбор (Claude Code):**"; echo; cat "$RUN/TRIAGE.md"; }
    } > "$RUN/issue-comment.md"
    gh issue comment "$NUM" -R "$REPO_SLUG" --body-file "$RUN/issue-comment.md" >/dev/null 2>>"$RUN/issue.log"
  fi
  [ -n "$NUM" ] && echo "Issue: https://github.com/$REPO_SLUG/issues/$NUM"
fi

# Старые отчёты (старше 30 дней) — удаляем, чтобы не забить диск скриншотами.
find "$ROOT/reports/maestro" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null

echo
cat "$RUN/SUMMARY.md"
exit "$FAILED"
