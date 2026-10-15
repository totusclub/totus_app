# UI-тест приложения (Maestro)

`smoke.yaml` — дымовой сценарий: онбординг → главная → «Найти» → первый отель → «Все варианты» →
первое предложение → перелёт → «Перейти к бронированию» → экран «Вход». Ничего не бронирует.

## Где и когда крутится

GitHub Actions, workflow `.github/workflows/mobile-qa.yml`, всё в облаке GitHub:

| Платформа | Машина | Когда |
|---|---|---|
| Android | ubuntu-latest, эмулятор API 34 (x86_64), APK Release с debug-подписью | 09:10 и 19:10 МСК, каждый пуш в `main`, вручную |
| iPhone, iPad | macos-15, симуляторы, `.app` Release без подписи | 09:10 и 19:10 МСК, вручную |

PR с правками теста (`.maestro/`, `scripts/ci/`, сам workflow) прогоняет все платформы; отчёт — только в артефактах.

Итог — issue с меткой `qa-mobile` («QA мобильных приложений — последний прогон»): таблица по платформам,
скриншоты каждого шага (ветка `qa-screenshots`, только последний прогон), хвост лога при падении.
При падении добавляется комментарий — GitHub пришлёт письмо. Ежечасный чекап сайта читает это issue.

## Что нужно один раз

- Файл workflow лежит в `.maestro/ci/mobile-qa.yml`: коннектор Claude не может писать в `.github/workflows/`.
  Перенести его в `.github/workflows/mobile-qa.yml` (в веб-интерфейсе GitHub: открыть файл → карандаш →
  поменять путь в поле имени → Commit).
- Секрет `AI_REPO_TOKEN` (Settings → Secrets and variables → Actions): fine-grained PAT, доступ только к
  `tosmedia/totus_ai_v2`, Contents: Read-only. Из него собирается пакет Милы `@tosmedia/ai-assistant-native`
  (в `package.json` он указан как локальный архив `../totus_ai_v2/...-1.2.2.tgz`, которого нет в Git).
- Для iOS — `ios/totusClubApp.xcodeproj` в Git. Пока его нет, iPhone и iPad в отчёте помечены ⚠️ «не собирается».

## Локальный запуск

```bash
# приложение уже установлено на эмуляторе/симуляторе
maestro test .maestro/smoke.yaml -e APP_ID=com.totus.com     # Android
maestro test .maestro/smoke.yaml -e APP_ID=app.totus.club    # iOS
```

## Если сценарий сломался после изменения интерфейса

Элементы ищутся по видимым текстам (список — в шапке `smoke.yaml`). Переименовали кнопку — поправьте флоу.
Надёжнее со временем добавить `testID` на ключевые элементы (карточка отеля, предложение, рейс):
`AppText` пропускает `testID`, `AppButton` пока нет.
