#!/usr/bin/env bash
# Установка стенда тестирования приложения Totus Club на Mac (Mac mini M-серии или Intel):
# Maestro, симуляторы iPhone и iPad, эмулятор Android, ежедневный запуск через launchd.
# Повторный запуск безопасен: установленное пропускается, недостающее доставляется.
#
# Использование (из корня totus_APP):
#   scripts/qa-mac/setup.sh                    # установить всё, что можно без пароля администратора
#   scripts/qa-mac/setup.sh --schedule 07:30   # плюс ежедневный прогон в 07:30 (launchd)
#   scripts/qa-mac/setup.sh --check            # только показать, что готово, ничего не ставить
#   scripts/qa-mac/setup.sh --no-ios | --no-android
#
# Шаги, которым нужен пароль администратора (Homebrew, лицензия Xcode, запрет сна), скрипт не делает
# сам: печатает команды в конце — их нужно выполнить в своём Терминале. Описание — scripts/qa-mac/README_RU.md.
# Коды выхода: 0 — всё готово; 3 — остались ручные шаги; 1 — ошибка установки.

set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="$HOME/.totus-qa"
ENV_FILE="$STATE/env"
BUILDS="${TOTUS_BUILDS_DIR:-$HOME/TotusBuilds}"
ARCH="$(uname -m)"                                   # arm64 | x86_64
if [ "$ARCH" = "arm64" ]; then ABI="arm64-v8a"; else ABI="x86_64"; fi
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
AVD_NAME="totus_android"
ANDROID_IMAGE="system-images;android-35;google_apis;$ABI"
NDK_VERSION="$(sed -nE 's/.*ndkVersion *= *"([^"]+)".*/\1/p' "$ROOT/android/build.gradle" 2>/dev/null | head -1)"
SIM_IPHONE="Totus iPhone"
SIM_IPAD="Totus iPad"
LABEL="club.totus.qa-mac"

CHECK_ONLY=0; DO_IOS=1; DO_ANDROID=1; SCHEDULE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK_ONLY=1 ;;
    --no-ios) DO_IOS=0 ;;
    --no-android) DO_ANDROID=0 ;;
    --schedule) shift; SCHEDULE="${1:-}" ;;
    -h|--help) sed -n 2,16p "$0"; exit 0 ;;
    *) echo "Неизвестный параметр: $1" >&2; exit 1 ;;
  esac
  shift
done

MANUAL=""
ERRORS=0
ok()     { printf '  ✅ %s\n' "$*"; }
warn()   { printf '  ⚠️  %s\n' "$*"; }
bad()    { printf '  ❌ %s\n' "$*"; ERRORS=$((ERRORS + 1)); }
manual() { MANUAL="${MANUAL}
  • $*"; }
step()   { printf '\n▶ %s\n' "$*"; }
have()   { command -v "$1" >/dev/null 2>&1; }

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Этот скрипт — только для macOS." >&2
  exit 1
fi
mkdir -p "$STATE/logs" "$BUILDS"

# ---------------------------------------------------------------- система
step "Компьютер"
MACOS="$(sw_vers -productVersion)"
RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
FREE_GB="$(df -g "$HOME" | awk 'NR==2 {print $4}')"
ok "macOS $MACOS, $ARCH, память $RAM_GB ГБ, свободно на диске $FREE_GB ГБ"
[ "$RAM_GB" -lt 16 ] && warn "памяти меньше 16 ГБ — устройства будут проверяться строго по очереди (так и настроено)"
[ "${FREE_GB:-0}" -lt 60 ] && warn "свободно меньше 60 ГБ — Xcode с симуляторами и Android SDK займут 60–90 ГБ"

# ---------------------------------------------------------------- Homebrew
step "Homebrew"
for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
  [ -x "$b" ] && eval "$("$b" shellenv)" && break
done
if have brew; then
  ok "brew $(brew --version | head -1 | awk '{print $2}')"
else
  bad "Homebrew не установлен"
  manual 'Установить Homebrew (спросит пароль администратора), затем снова запустить этот скрипт:
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
fi

brew_pkg() { # brew_pkg <formula> [--cask]
  local f="$1" kind="${2:-}"
  if brew list $kind "$f" >/dev/null 2>&1; then ok "$f"; return 0; fi
  if [ "$CHECK_ONLY" = 1 ]; then bad "$f не установлен"; return 1; fi
  echo "    ставлю $f…"
  if brew install $kind "$f" >>"$STATE/logs/setup-brew.log" 2>&1; then ok "$f установлен"; else bad "$f — ошибка (лог: $STATE/logs/setup-brew.log)"; fi
}

if have brew; then
  step "Пакеты"
  for f in git gh node@22 openjdk@17 watchman; do brew_pkg "$f"; done
  [ "$DO_IOS" = 1 ] && brew_pkg cocoapods
  [ "$DO_ANDROID" = 1 ] && brew_pkg android-commandlinetools --cask
fi

BREW_PREFIX="$(brew --prefix 2>/dev/null || echo /opt/homebrew)"
NODE_BIN="$BREW_PREFIX/opt/node@22/bin"
JAVA_HOME_CAND="$BREW_PREFIX/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
[ -d "$JAVA_HOME_CAND" ] && export JAVA_HOME="$JAVA_HOME_CAND"
export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$NODE_BIN:${JAVA_HOME:+$JAVA_HOME/bin:}$HOME/.maestro/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$BREW_PREFIX/share/android-commandlinetools/cmdline-tools/latest/bin:$HOME/.local/bin:$PATH"

# ---------------------------------------------------------------- файл окружения (для launchd и Терминала)
write_env() {
  cat > "$ENV_FILE" <<EOF
# Окружение стенда Totus QA — создано scripts/qa-mac/setup.sh $(date '+%d.%m.%Y %H:%M'). Можно править.
[ -x "$BREW_PREFIX/bin/brew" ] && eval "\$("$BREW_PREFIX/bin/brew" shellenv)"
export JAVA_HOME="$JAVA_HOME_CAND"
export ANDROID_HOME="$ANDROID_HOME"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$NODE_BIN:\$JAVA_HOME/bin:\$HOME/.maestro/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$ANDROID_HOME/cmdline-tools/latest/bin:$BREW_PREFIX/share/android-commandlinetools/cmdline-tools/latest/bin:\$HOME/.local/bin:\$PATH"
export TOTUS_QA_REPO="$ROOT"
export TOTUS_BUILDS_DIR="$BUILDS"
export TOTUS_AVD="$AVD_NAME"
export TOTUS_IOS_IPHONE="${IPHONE_UDID:-}"
export TOTUS_IOS_IPAD="${IPAD_UDID:-}"
# Набор сценариев: daily — без входа; daily,auth — плюс Мила и чат поддержки (после входа QA-учёткой на устройствах)
export QA_TAGS="\${QA_TAGS:-daily}"
# Разбор падений через Claude Code (claude -p, только чтение): 1 — включено, 0 — выключено
export QA_AI_TRIAGE="\${QA_AI_TRIAGE:-1}"
# Отчёт в issue tosmedia/totus_APP с меткой qa-mac: 1 — включено, 0 — только локально
export QA_ISSUE="\${QA_ISSUE:-1}"
EOF
}

# ---------------------------------------------------------------- Java + Maestro
step "Java 17 и Maestro"
if have java && java -version 2>&1 | grep -qE 'version "(17|1[89]|2[0-9])'; then
  ok "$(java -version 2>&1 | grep -m1 " version ")"
else
  bad "Java 17 не найдена (brew install openjdk@17)"
fi
if [ -x "$HOME/.maestro/bin/maestro" ]; then
  ok "Maestro $("$HOME/.maestro/bin/maestro" --version 2>/dev/null | tail -1)"
elif [ "$CHECK_ONLY" = 1 ]; then
  bad "Maestro не установлен"
else
  echo "    ставлю Maestro…"
  if curl -fsSL "https://get.maestro.mobile.dev" | bash >>"$STATE/logs/setup-maestro.log" 2>&1; then
    ok "Maestro $("$HOME/.maestro/bin/maestro" --version 2>/dev/null | tail -1)"
  else
    bad "Maestro — ошибка установки (лог: $STATE/logs/setup-maestro.log)"
  fi
fi

# ---------------------------------------------------------------- Android
if [ "$DO_ANDROID" = 1 ]; then
  step "Android SDK и эмулятор ($ABI)"
  SDKM="$(command -v sdkmanager || true)"
  AVDM="$(command -v avdmanager || true)"
  if [ -z "$SDKM" ]; then
    bad "sdkmanager не найден (brew install --cask android-commandlinetools)"
  else
    mkdir -p "$ANDROID_HOME"
    PKGS="cmdline-tools;latest platform-tools emulator platforms;android-36 build-tools;36.0.0 $ANDROID_IMAGE"
    [ -n "$NDK_VERSION" ] && PKGS="$PKGS ndk;$NDK_VERSION"
    missing=""
    for p in $PKGS; do
      d="$ANDROID_HOME/$(printf '%s' "$p" | tr ';' '/')"
      [ -d "$d" ] || missing="$missing $p"
    done
    if [ -z "$missing" ]; then
      ok "SDK: все пакеты на месте"
    elif [ "$CHECK_ONLY" = 1 ]; then
      bad "SDK: не хватает$missing"
    else
      echo "    ставлю:$missing (несколько ГБ, 5–15 минут)…"
      yes | "$SDKM" --sdk_root="$ANDROID_HOME" --licenses >>"$STATE/logs/setup-android.log" 2>&1
      # shellcheck disable=SC2086
      if "$SDKM" --sdk_root="$ANDROID_HOME" $missing >>"$STATE/logs/setup-android.log" 2>&1; then
        ok "SDK установлен"
      else
        bad "SDK — ошибка (лог: $STATE/logs/setup-android.log)"
      fi
    fi
    # avdmanager — из того же SDK, куда поставлен образ (у avdmanager из brew другой корень SDK)
    [ -x "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" ] && AVDM="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
    if [ -d "$HOME/.android/avd/$AVD_NAME.avd" ]; then
      ok "эмулятор $AVD_NAME"
    elif [ "$CHECK_ONLY" = 1 ]; then
      bad "эмулятор $AVD_NAME не создан"
    elif [ -n "$AVDM" ]; then
      if echo no | "$AVDM" create avd -n "$AVD_NAME" -k "$ANDROID_IMAGE" -d pixel_7 --force >>"$STATE/logs/setup-android.log" 2>&1; then
        CFG="$HOME/.android/avd/$AVD_NAME.avd/config.ini"
        { echo "hw.ramSize=3072"; echo "hw.keyboard=yes"; echo "disk.dataPartition.size=6G"; } >> "$CFG"
        ok "эмулятор $AVD_NAME создан (Pixel 7, Android 15)"
      else
        bad "эмулятор не создан (лог: $STATE/logs/setup-android.log)"
      fi
    else
      bad "avdmanager не найден"
    fi
  fi
fi

# ---------------------------------------------------------------- iOS
IPHONE_UDID=""; IPAD_UDID=""
if [ "$DO_IOS" = 1 ]; then
  step "Xcode и симуляторы iPhone / iPad"
  if ! xcodebuild -version >/dev/null 2>&1; then
    bad "нет полного Xcode (одних Command Line Tools мало)"
    manual "Установить Xcode из App Store (или с developer.apple.com), открыть его один раз, затем:
      sudo xcode-select -s /Applications/Xcode.app && sudo xcodebuild -license accept && sudo xcodebuild -runFirstLaunch"
  else
    ok "$(xcodebuild -version | head -1)"
    if ! xcrun simctl list runtimes 2>/dev/null | grep -q 'iOS .*com.apple.CoreSimulator.SimRuntime.iOS'; then
      if [ "$CHECK_ONLY" = 1 ]; then
        bad "нет симулятора iOS"
      else
        echo "    скачиваю симулятор iOS (около 8 ГБ)…"
        xcodebuild -downloadPlatform iOS >>"$STATE/logs/setup-ios.log" 2>&1 || bad "симулятор iOS не скачался (лог: $STATE/logs/setup-ios.log)"
      fi
    fi
    # Выбор свежего iOS и моделей; создаём «Totus iPhone» и «Totus iPad», если их нет.
    PICK="$(xcrun simctl list -j 2>/dev/null | node -e '
      let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
        const j = JSON.parse(s);
        const rts = j.runtimes.filter(r => r.isAvailable && /iOS/.test(r.identifier))
          .sort((a, b) => a.version.localeCompare(b.version, undefined, {numeric: true}));
        const rt = rts[rts.length - 1];
        if (!rt) return console.log("");
        const types = rt.supportedDeviceTypes || j.devicetypes;
        const byName = n => types.find(t => t.name === n);
        const want = (pref, re) => pref.map(byName).find(Boolean) || types.filter(t => re.test(t.name)).pop() || {name: "", identifier: ""};
        const iphone = want(["iPhone 17", "iPhone 16", "iPhone 15"], /^iPhone \d+$/);
        const ipad = want(["iPad Air 11-inch (M3)", "iPad Air 11-inch (M2)", "iPad (A16)", "iPad (10th generation)"], /^iPad/);
        const find = name => Object.values(j.devices).flat().find(d => d.name === name && d.isAvailable);
        const a = find("Totus iPhone"), b = find("Totus iPad");
        console.log([rt.identifier, iphone.name, iphone.identifier, ipad.name, ipad.identifier, a ? a.udid : "", b ? b.udid : ""].join("|"));
      });' 2>/dev/null)"
    IFS='|' read -r RT TYPE_IPHONE DT_IPHONE TYPE_IPAD DT_IPAD IPHONE_UDID IPAD_UDID <<EOF
$PICK
EOF
    if [ -z "${RT:-}" ]; then
      bad "не удалось выбрать симулятор iOS (нужен node и скачанный iOS)"
    else
      for kind in iphone ipad; do
        if [ "$kind" = iphone ]; then name="$SIM_IPHONE"; type="$TYPE_IPHONE"; dt="$DT_IPHONE"; udid="$IPHONE_UDID"; else name="$SIM_IPAD"; type="$TYPE_IPAD"; dt="$DT_IPAD"; udid="$IPAD_UDID"; fi
        if [ -n "$udid" ]; then ok "$name ($udid)"; continue; fi
        if [ "$CHECK_ONLY" = 1 ]; then bad "$name не создан"; continue; fi
        if [ -n "$dt" ] && udid="$(xcrun simctl create "$name" "$dt" "$RT" 2>>"$STATE/logs/setup-ios.log")"; then
          ok "$name создан: $type, ${RT##*.}"
        else
          bad "$name не создан ($type)"
        fi
        if [ "$kind" = iphone ]; then IPHONE_UDID="$udid"; else IPAD_UDID="$udid"; fi
      done
    fi
  fi
fi

# ---------------------------------------------------------------- GitHub, пакет Милы, папка сборок
step "GitHub и исходники"
if have gh && gh auth status >/dev/null 2>&1; then
  ok "gh: вход выполнен"
  AI_DIR="$(cd "$ROOT/.." && pwd)/totus_ai_v2"
  if [ -d "$AI_DIR/.git" ]; then
    ok "totus_ai_v2 рядом с totus_APP (нужен для сборки пакета Милы)"
  elif [ "$CHECK_ONLY" = 0 ]; then
    gh repo clone tosmedia/totus_ai_v2 "$AI_DIR" -- --depth 1 >>"$STATE/logs/setup-git.log" 2>&1 \
      && ok "totus_ai_v2 склонирован в $AI_DIR" || bad "не удалось склонировать tosmedia/totus_ai_v2"
  else
    bad "нет $AI_DIR"
  fi
else
  bad "gh не авторизован"
  manual "Войти в GitHub (откроется браузер): gh auth login --hostname github.com --git-protocol https --web"
fi
[ -f "$BUILDS/README.txt" ] || cat > "$BUILDS/README.txt" <<'EOF'
Сюда можно класть готовые сборки Totus Club для стенда, если их нельзя собрать из Git:
  *.apk                 — Android (arm64-v8a для Mac M-серии, x86_64 для Intel)
  *.app или *.app.zip   — iOS для симулятора (Release, без подписи; для Intel — со срезом x86_64)
Скрипт берёт самый новый файл. Если сборка из Git удалась, файлы отсюда не используются.
EOF
ok "папка сборок: $BUILDS"

# ---------------------------------------------------------------- сон, автовход
step "Чтобы стенд работал без присмотра"
if pmset -g | grep -qE '^ *sleep +0'; then
  ok "сон выключен"
else
  warn "компьютер засыпает — прогон по расписанию не случится"
  manual "Выключить сон и включить автостарт после отключения питания:
      sudo pmset -a sleep 0 disksleep 0 autorestart 1 womp 1"
fi
AUTOLOGIN="$(defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || true)"
if [ -n "$AUTOLOGIN" ]; then
  ok "автовход: $AUTOLOGIN"
else
  warn "автовход выключен — после перезагрузки прогоны не пойдут, пока кто-то не войдёт"
  manual "Включить автоматический вход: Системные настройки → Пользователи и группы → «Автоматический вход» (для симуляторов нужен открытый сеанс пользователя)"
fi

# ---------------------------------------------------------------- окружение и расписание
if [ "$CHECK_ONLY" = 0 ]; then
  write_env
  grep -q '.totus-qa/env' "$HOME/.zprofile" 2>/dev/null || printf '\n[ -f "$HOME/.totus-qa/env" ] && source "$HOME/.totus-qa/env"\n' >> "$HOME/.zprofile"
  ok "окружение: $ENV_FILE (подключено в ~/.zprofile)"
fi

if [ -n "$SCHEDULE" ] && [ "$CHECK_ONLY" = 0 ]; then
  step "Ежедневный прогон в $SCHEDULE"
  H="${SCHEDULE%%:*}"; M="${SCHEDULE##*:}"
  PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>source "\$HOME/.totus-qa/env"; cd "$ROOT" &amp;&amp; exec scripts/qa-mac/run.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>$((10#$H))</integer><key>Minute</key><integer>$((10#$M))</integer></dict>
  <key>StandardOutPath</key><string>$STATE/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$STATE/logs/launchd.log</string>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
EOF
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  if launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>>"$STATE/logs/setup-launchd.log"; then
    ok "launchd: $LABEL — каждый день в $SCHEDULE (лог $STATE/logs/launchd.log)"
  else
    bad "launchd не принял $PLIST (лог: $STATE/logs/setup-launchd.log)"
  fi
elif launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  step "Расписание"; ok "launchd: $LABEL уже настроен"
fi

# ---------------------------------------------------------------- итог
echo
if [ -n "$MANUAL" ]; then
  echo "Осталось сделать вручную (в своём Терминале или в Настройках):$MANUAL"
  echo
  echo "Потом снова: scripts/qa-mac/setup.sh${SCHEDULE:+ --schedule $SCHEDULE}"
fi
if [ "$ERRORS" -gt 0 ] && [ -z "$MANUAL" ]; then exit 1; fi
[ -n "$MANUAL" ] && exit 3
echo "Стенд готов. Первый прогон: scripts/qa-mac/run.sh"
exit 0
