# Стенд тестирования приложения на Mac mini

Mac mini всегда включён. Каждый день он сам проверяет приложение Totus Club на трёх устройствах: эмуляторе Android, симуляторе iPhone и симуляторе iPad. Устройства запускаются по очереди, без окон. Сценарии — те же, что в `.maestro/` ([описание](../../.maestro/README_RU.md)). Итог появляется в issue «QA приложения на Mac mini — последний прогон» (метка `qa-mac`) в tosmedia/totus_APP. Если что-то упало, под issue добавляется комментарий с разбором от Claude Code, и GitHub присылает письмо.

Облачный дымовой тест на GitHub Actions (`.maestro/ci/mobile-qa.yml`, метка `qa-mobile`) — это отдельная, более короткая проверка. Стенд её не заменяет и не дублирует.

## Что нужно

- Mac mini на Apple Silicon (M6, 16 ГБ и больше, свободно от 100 ГБ). Mac на Intel тоже работает, но новые Xcode на нём со временем перестают ставиться.
- macOS с автоматическим входом пользователя: симуляторам нужен открытый сеанс.
- Аккаунт GitHub с доступом к `tosmedia/totus_APP` и `tosmedia/totus_ai_v2`.
- Подписка Claude (Pro, Max, Team или Enterprise) для Claude Code — для установки и разбора падений.

## Установка — одно задание для Claude Code

1. В Терминале на Mac mini: `curl -fsSL https://claude.ai/install.sh | bash`, затем открыть новое окно Терминала.
2. Создать папку и запустить Claude Code: `mkdir -p ~/Totus && cd ~/Totus && claude`. При первом запуске откроется браузер для входа в Claude.
3. Вставить задание:

```text
Настрой этот Mac как стенд тестирования мобильного приложения Totus Club через Maestro.
1. Проверь, есть ли Homebrew и gh (GitHub CLI). Если Homebrew нет — дай мне команду установки, я выполню её сам (нужен пароль), и жди.
2. Если gh не авторизован — попроси меня выполнить `gh auth login --hostname github.com --git-protocol https --web` и жди.
3. Склонируй tosmedia/totus_APP в ~/Totus/totus_APP (если уже есть — git pull).
4. Прочитай ~/Totus/totus_APP/scripts/qa-mac/README_RU.md и запусти `scripts/qa-mac/setup.sh --schedule 07:30` из ~/Totus/totus_APP.
   Команды, которые скрипт выведет в «Осталось сделать вручную» (sudo, Xcode из App Store, автовход), передай мне по одной и жди, пока я их выполню. Потом запусти setup.sh ещё раз — пока он не завершится с кодом 0.
5. Сделай первый прогон: `scripts/qa-mac/run.sh` и покажи мне итоговую таблицу. Если Android или iOS «не проверено» из-за сборки — объясни, что нужно (см. раздел «Сборки» в README_RU.md).
Ничего не меняй в коде репозитория и не делай коммитов. Пароли и токены в чат не выводи.
```

Claude Code сам ставит Java 17, Node 22, Maestro, Android SDK с эмулятором, симуляторы iPhone и iPad, склонирует `totus_ai_v2` (из него собирается пакет Милы) и включит ежедневный прогон. Вам останется ввести пароль администратора в нескольких командах и установить Xcode из App Store.

## Что делает `scripts/qa-mac/setup.sh`

- проверяет компьютер (память, диск);
- ставит через Homebrew: git, gh, node@22, openjdk@17, watchman, cocoapods, android-commandlinetools;
- ставит Maestro;
- ставит Android SDK: platform-tools, emulator, platform 36, build-tools 36, NDK из `android/build.gradle`, образ Android 15 под процессор Mac; создаёт эмулятор `totus_android` (Pixel 7);
- скачивает симулятор iOS, если его нет, и создаёт симуляторы «Totus iPhone» и «Totus iPad» на свежей iOS;
- проверяет вход в GitHub, клонирует `totus_ai_v2` рядом с `totus_APP`;
- проверяет, что сон выключен и включён автовход;
- пишет окружение в `~/.totus-qa/env` (подключается в `~/.zprofile`);
- с `--schedule HH:MM` ставит launchd-задачу `club.totus.qa-mac` — ежедневный `run.sh`.

Повторный запуск безопасен. `--check` — только показать, что готово.

Чего скрипт сам не делает (нужен пароль или App Store) — печатает в конце:
- установка Homebrew;
- Xcode из App Store, затем `sudo xcode-select -s /Applications/Xcode.app && sudo xcodebuild -license accept && sudo xcodebuild -runFirstLaunch`;
- `sudo pmset -a sleep 0 disksleep 0 autorestart 1 womp 1` — не засыпать и включаться после отключения света;
- автовход: Системные настройки → Пользователи и группы → «Автоматический вход».

## Прогон — `scripts/qa-mac/run.sh`

1. `git pull` в totus_APP и totus_ai_v2. Скрипт после обновления перезапускает сам себя.
2. Сборки:
   - **Android** — из Git: `./gradlew assembleRelease` под процессор Mac, подпись debug-ключом. Если не собралось — самый новый `*.apk` из `~/TotusBuilds`.
   - **iOS** — из Git, если в репозитории есть `ios/totusClubApp.xcodeproj`. **Сейчас его нет**, поэтому нужна готовая сборка в `~/TotusBuilds`: `*.app` или `*.app.zip`, для симулятора, Release, без подписи. Как её сделать — ниже.
   - `npm ci` запускается, только если менялись зависимости.
3. Эмулятор Android без окна → установка APK → сценарии → выключение.
4. Симулятор «Totus iPhone» → установка → сценарии → выключение; затем так же «Totus iPad».
5. `reports/maestro/<дата_время>/SUMMARY.md`: первая строка «ВСЁ РАБОТАЕТ», «ЕСТЬ ПРОБЛЕМЫ: …» или «ПРОВЕРЕНО ЧАСТИЧНО»; таблица «устройство | сценарий | статус | время | причина». У упавшего сценария в причине указан шаг, на котором упало. Внизу — какие сборки проверялись.
6. Если что-то упало — Claude Code (`claude -p`, только чтение файлов) читает логи, скриншоты, сценарий и код и пишет разбор в `TRIAGE.md`: приложение, сервер или Level.Travel, устаревший сценарий или сбой стенда, и что поправить.
7. Issue `qa-mac`: тело — последний прогон, при падениях — комментарий с таблицей и разбором.
8. Отчёты старше 30 дней удаляются.

Параметры: `--only android|ios|iphone|ipad`, `--tags daily,auth`, `--no-pull`, `--no-build`, `--no-issue`, `--no-triage`. Настройки по умолчанию — в `~/.totus-qa/env`: `QA_TAGS`, `QA_AI_TRIAGE`, `QA_ISSUE`.

## Вход QA-учёткой (для сценариев Милы и чата поддержки)

Набор `daily` работает без входа. Чтобы проверялись Мила и чат поддержки (тег `auth`), один раз войдите в приложение QA-учёткой на каждом устройстве стенда:
1. `scripts/qa-mac/run.sh --only android --no-issue`. Пока он идёт, или после — откройте эмулятор с окном: `emulator -avd totus_android`.
2. Для iPhone и iPad: `open -a Simulator`, выберите «Totus iPhone» / «Totus iPad».
3. В приложении: «Аккаунт» → вход по почте тестового аккаунта, код придёт на эту почту. Вход через Яндекс ID из приложения убран (totus_APP #53).
4. В `~/.totus-qa/env` поставьте `export QA_TAGS="daily,auth"`.

Ежедневный прогон данные приложения не стирает, поэтому вход сохраняется. Сбросится он, только если сменится подпись Android-сборки — тогда это будет отмечено в отчёте.

## Сборка iOS для симулятора (пока в Git нет проекта Xcode)

На Mac разработчика, из корня totus_APP:

```bash
xcodebuild -workspace ios/totusClubApp.xcworkspace -scheme totusClubApp -configuration Release \
  -sdk iphonesimulator -destination "generic/platform=iOS Simulator" -derivedDataPath build/sim \
  CODE_SIGNING_ALLOWED=NO
ditto -c -k --keepParent build/sim/Build/Products/Release-iphonesimulator/totusClubApp.app totusClubApp.app.zip
```

Положить `totusClubApp.app.zip` в `~/TotusBuilds` на Mac mini (AirDrop, общий диск). Для Mac mini на Intel нужна сборка со срезом x86_64: добавьте `ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO`. Как только `ios/totusClubApp.xcodeproj` появится в Git, стенд будет собирать iOS сам.

## Если что-то не так

- `~/.totus-qa/logs/launchd.log` — вывод ежедневных прогонов; `~/.totus-qa/logs/setup-*.log` — установка.
- В папке прогона: `build-*.log` — сборка, `emulator.log`, `sim-*.log`, `<устройство>.log` — Maestro, `<устройство>/` — отметки шагов и скриншоты.
- Запустить вручную: `cd ~/Totus/totus_APP && scripts/qa-mac/run.sh`.
- Проверить готовность: `scripts/qa-mac/setup.sh --check`.
- Остановить ежедневный прогон: `launchctl bootout gui/$(id -u)/club.totus.qa-mac`.
