# Иконки Totus — стиль C (приложение)

Тот же набор, что на сайте (totus_WEB, `src/components/icons/totus`): графитовая линия 1,5, скруглённые концы, одна деталь фирменным оранжевым `#FE732E`. Утверждён владельцем 15.10.2026, 276 иконок.

- Источник правды — Figma `u6A5og35jw0BBJyOkKl8Ij`, страница «ICONS · Набор C».
- Данные — `scripts/icons/totus-icons.json` (один и тот же файл в обоих репозиториях).
- Основа рисунка — Tabler Icons, лицензия MIT (`LICENSE-tabler.txt`).

| Файл | Что внутри |
|---|---|
| `TotusIcon.tsx` | компонент на react-native-svg: `<TotusIcon icon={iconSearch} size={20} color={theme.text} />` |
| `TotusIconByKey.tsx` | иконка по ключу из данных: `<TotusIconByKey name={mealIcon(code)} color={theme.text} />` |
| `icons.generated.ts`, `registry.generated.ts` | иконки и подписи — руками не править |
| `ltIcons.ts` | справочники Level.Travel → иконка (питание, тип размещения, удобства, удобства номера…) |

`AppIcon` (`../index.tsx`) ведёт прежние имена на этот набор, `hotelIcons` — удобства номера по `group_identifier`.
`accent={false}` — иконка одним цветом (на оранжевом или цветном фоне).

Изменить набор: поправить в Figma → перенести в `scripts/icons/totus-icons.json` (тот же, что на сайте) →
`node scripts/icons/gen-totus-icons.mjs` → `node scripts/check-totus-icons.mjs`.
