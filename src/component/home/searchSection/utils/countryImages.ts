import { COUNTRY_IMAGE_DATA } from './countryImageData';

/**
 * Список стран для поля «Куда» до ввода текста — так же, как на сайте
 * (totus_WEB src/utils/countryImages.ts, PR #49):
 *  - сверху «Популярные страны» (priority > 1, по убыванию priority),
 *  - ниже «Другие страны» (по алфавиту);
 *  - картинка страны — своя, по ISO2 (ссылки Level.Travel на картинки стран битые);
 *    нет картинки — кружок с первой буквой названия.
 * Данные — Level.Travel /references/destinations; до ответа и при ошибке — DEFAULT_BROWSE_COUNTRIES.
 */

/** Картинка страны (data:-адрес WebP) по ISO2 или '' — тогда рисуется первая буква. */
export function countryImageSrc(iso2: unknown): string {
  const code = String(iso2 ?? '').trim().toUpperCase();
  return COUNTRY_IMAGE_DATA[code] || '';
}

/** Первая буква названия для кружка без картинки. */
export function countryLetter(name: unknown): string {
  return (String(name ?? '').trim() || '?').charAt(0).toUpperCase();
}

export type BrowseCountry = {
  id: string | number;
  name: string;
  name_ru: string;
  name_en?: string;
  iso2: string;
  priority: number;
};

// Тот же список, что на сайте (до ответа справочника и при ошибке).
const DEFAULT_ROWS: Array<[string, string, string, number]> = [
  ['TR', 'Турция', 'Turkey', 10], ['EG', 'Египет', 'Egypt', 9], ['VN', 'Вьетнам', 'Vietnam', 8],
  ['RU', 'Россия', 'Russia', 7], ['AE', 'ОАЭ', 'UAE', 6], ['MV', 'Мальдивы', 'Maldives', 5],
  ['TH', 'Таиланд', 'Thailand', 5], ['IN', 'Индия', 'India', 4], ['SC', 'Сейшелы', 'Seychelles', 4],
  ['LK', 'Шри-Ланка', 'Sri Lanka', 4], ['ID', 'Индонезия', 'Indonesia', 3], ['MU', 'Маврикий', 'Mauritius', 3],
  ['CU', 'Куба', 'Cuba', 2], ['AB', 'Абхазия', 'Abhasia', 1], ['AZ', 'Азербайджан', 'Azerbaijan', 1],
  ['AL', 'Албания', 'Albania', 1], ['AM', 'Армения', 'Armenia', 1], ['BH', 'Бахрейн', 'Bahrain', 1],
  ['BY', 'Беларусь', 'Belarus', 1], ['BG', 'Болгария', 'Bulgaria', 1], ['HU', 'Венгрия', 'Hungary', 1],
  ['VE', 'Венесуэла', 'Venezuela', 1], ['HK', 'Гонконг', 'Hongkong', 1], ['GR', 'Греция', 'Greece', 1],
  ['GE', 'Грузия', 'Georgia', 1], ['DO', 'Доминикана', 'Dominican Republic', 0], ['IL', 'Израиль', 'Israel', 1],
  ['JO', 'Иордания', 'Jordan', 1], ['ES', 'Испания', 'Spain', 1], ['IT', 'Италия', 'Italy', 0],
  ['KZ', 'Казахстан', 'Kazakhstan', 1], ['QA', 'Катар', 'Qatar', 1], ['CY', 'Кипр', 'Cyprus', 1],
  ['KG', 'Киргизия', 'Kyrgyzstan', 1], ['CN', 'Китай', 'China', 1], ['MY', 'Малайзия', 'Malaysia', 1],
  ['MT', 'Мальта', 'Malta', 1], ['MA', 'Марокко', 'Morocco', 1], ['MX', 'Мексика', 'Mexico', 1],
  ['NO', 'Норвегия', 'Norway', 1], ['OM', 'Оман', 'Oman', 1], ['PT', 'Португалия', 'Portugal', 1],
  ['SA', 'Саудовская Аравия', 'Saudi Arabia', 1], ['RS', 'Сербия', 'Serbia', 1],
  ['SG', 'Сингапур', 'Republic of Singapore', 1], ['TJ', 'Таджикистан', 'Tajikistan', 1],
  ['TZ', 'Танзания', 'Tanzania', 0], ['TN', 'Тунис', 'Tunisia', 1], ['UZ', 'Узбекистан', 'Uzbekistan', 1],
  ['PH', 'Филиппины', 'Philippines', 1], ['FI', 'Финляндия', 'Finland', 1], ['FR', 'Франция', 'France', 1],
  ['HR', 'Хорватия', 'Croatia', 1], ['ME', 'Черногория', 'Montenegro', 1], ['CZ', 'Чехия', 'Czech Republic', 1],
  ['KR', 'Южная Корея', 'South Korea', 1], ['JP', 'Япония', 'Japan', 1],
];

export const DEFAULT_BROWSE_COUNTRIES: BrowseCountry[] = DEFAULT_ROWS.map(([iso2, name, name_en, priority]) => ({
  id: `country-${iso2}`,
  iso2,
  name,
  name_ru: name,
  name_en,
  priority,
}));

/** Ответ /references/destinations → список стран; null, если ответ не тот. */
export function toBrowseCountries(body: unknown): BrowseCountry[] | null {
  const countries = (body as { countries?: unknown } | null)?.countries;
  if (!Array.isArray(countries)) return null;
  const list = countries
    .map((c: any) => {
      const name = String(c?.name_ru || c?.name || '').trim();
      return {
        id: c?.id ?? `country-${c?.iso2}`,
        iso2: String(c?.iso2 || '').toUpperCase(),
        name,
        name_ru: name,
        name_en: c?.name_en ? String(c.name_en) : undefined,
        priority: Number(c?.priority) || 0,
      };
    })
    .filter((c) => c.iso2 && c.name);
  return list.length ? list : null;
}

/** Популярные (priority > 1, по убыванию) и остальные (по алфавиту). */
export function splitBrowseCountries(list: BrowseCountry[]): { popular: BrowseCountry[]; other: BrowseCountry[] } {
  const popular = list
    .filter((c) => c.priority > 1)
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, 'ru'));
  const other = list
    .filter((c) => c.priority <= 1)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return { popular, other };
}
