# Шрифты приложения

Те же шрифты, что на сайте totus.club (totus_WEB #69). Подключение прежнее:
`react-native.config.js` → `assets/fonts` (`npx react-native-asset`), копии файлов — в `ios/fonts`
(список в `ios/totusClubApp/Info.plist` → `UIAppFonts`) и `android/app/src/main/assets/fonts`.

| Файл | Шрифт | fontFamily | Где используется | Лицензия |
|---|---|---|---|---|
| `MuseoSansCyrl-300.ttf` | Museo Sans Cyrl 300 | `MuseoSansCyrl-300` | весь текст с `fontWeight` 100–399 | коммерческая, exljbris (Jos Buivenga); нужна лицензия на приложение (App/ePub) |
| `MuseoSansCyrl-500.ttf` | Museo Sans Cyrl 500 | `MuseoSansCyrl-500` | основной текст, `fontWeight` 400–599 | то же |
| `MuseoSansCyrl-700.ttf` | Museo Sans Cyrl 700 | `MuseoSansCyrl-700` | `fontWeight` 600–799 и `'bold'` | то же |
| `MuseoSansCyrl-900.ttf` | Museo Sans Cyrl 900 | `MuseoSansCyrl-900` | `fontWeight` 800+ | то же |
| `Forum.ttf` | Forum (Google Fonts, без изменений) | `Forum` (`FONT_HEADING`) | заголовки разделов и названия отелей | SIL OFL 1.1, `Forum-OFL.txt` |
| `TotusSymbols-300.ttf` / `-500` / `-700` | «Totus Symbols» сайта: ₽ (рисунок сайта под Museo) + стрелки ← ↑ → ↓ ↖ ↗ ↘ ↙, дефисы U+2010 / U+2011, ¹ ² ³ из Golos Text | `TotusSymbols-300/500/700` (`FONT_SYMBOLS`) | знаки, которых нет в Museo и Forum: ₽ при `fontWeight` 100–399 → 300, 400–599 → 500, 600+ → 700 (заголовки — 500) | SIL OFL 1.1 (часть Golos), `GolosText-OFL.txt`; ₽ — собственный рисунок Totus |
| `GolosText-*.ttf` | Golos Text | — | больше не используется; оставлен, чтобы не ломать ссылки в локальном Xcode-проекте | SIL OFL 1.1 |

Имя файла = PostScript-имя внутри файла = значение `fontFamily`, поэтому одно имя работает и на iOS, и на Android.
Выбор файла по `fontWeight` делают `AppText` и `FontText` (`src/theme/fonts.ts`); в стилях достаточно, как раньше,
писать `fontWeight`, а для заголовка — `fontFamily: FONT_HEADING`.

Знаков ₽, стрелок и дефисов U+2010 / U+2011 нет ни в Museo, ни в Forum (у Forum нет и ¹ ² ³). На сайте их берёт
«Totus Symbols» через `unicode-range`; в React Native такого механизма нет, поэтому `AppText` и `FontText`
сами выделяют эти знаки во вложенный `Text` со шрифтом `TotusSymbols-*` (`src/component/UI/text/symbolRuns.tsx`).
Файлы собирает `scripts/build-symbols-font.py` из файлов сайта (`GolosSymbols-*.woff2`, `scripts/ruble-glyph.json`).

Маша (`@tosmedia/ai-assistant-native`) своего шрифта не задаёт. Как на сайте, где её «Golos Text» = Museo,
в приложении Metro подставляет пакету `Text` / `TextInput` со шрифтами приложения
(`metro.config.js` → `src/theme/reactNativeWithAppFonts.ts`); сам пакет не меняется.

При покупке Museo Sans Cyrl замените файлы `MuseoSansCyrl-*.ttf` во всех трёх папках файлами из купленного пакета
с теми же именами (PostScript-имя должно совпадать с именем файла — проверка это покажет).
Проверка: `node scripts/check-app-fonts.mjs`.
