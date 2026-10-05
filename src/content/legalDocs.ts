/**
 * Юридические документы ООО «ТОТУСКЛАБ», которые показывает приложение.
 *
 * Тексты не зашиты в код: экран «Документы» берёт их из CMS
 * (GET {SERVER_BASE_URL}/api/pages/slug/:slug — тот же источник, что и сайт),
 * поэтому документ обновляется из админки без релиза приложения.
 * Здесь только список: slug (как на сайте totus.club/<slug>), название и подпись.
 * Порядок списка — порядок на экране; «Реквизиты и контакты» всегда последним.
 * Ссылки между документами (/tour-offer, /payment и т. п.) открываются в приложении
 * для любого slug из этого списка (src/screens/legal/legalLinks.ts).
 *
 * Только «стираемый» TypeScript (без enum и т. п.): scripts/check-legal-docs.mjs
 * запускает файл на чистом Node.
 */

export type LegalDocSlug =
  | 'terms'
  | 'privacy-policy'
  | 'consent'
  | 'ads-consent'
  | 'cookie-settings'
  | 'recommendations'
  // Пачка 2: туры и размещение
  | 'tour-offer'
  | 'hotel-booking'
  | 'cancellation'
  | 'tourist-memo'
  | 'payment'
  | 'requisites';

export type LegalDoc = {
  slug: LegalDocSlug;
  /** Название документа (заголовок, если CMS не вернула name). */
  title: string;
  /** Короткая подпись в списке «Документы». */
  short: string;
};

export const LEGAL_DOCS: readonly LegalDoc[] = [
  {
    slug: 'terms',
    title: 'Пользовательское соглашение',
    short: 'Условия использования сервиса',
  },
  {
    slug: 'privacy-policy',
    title: 'Политика обработки персональных данных',
    short: 'Как мы обрабатываем и защищаем данные',
  },
  {
    slug: 'consent',
    title: 'Согласие на обработку персональных данных',
    short: 'Какие данные и для чего обрабатываются',
  },
  {
    slug: 'ads-consent',
    title: 'Согласие на получение рекламы',
    short: 'Рассылки и рекламные сообщения',
  },
  {
    slug: 'cookie-settings',
    title: 'Политика использования файлов cookie',
    short: 'Какие cookie используются и зачем',
  },
  {
    slug: 'recommendations',
    title: 'Правила применения рекомендательных технологий',
    short: 'Как формируются подборки и рекомендации',
  },
  // Туры и размещение
  {
    slug: 'tour-offer',
    title: 'Оферта о заключении договора о реализации туристского продукта',
    short: 'Условия покупки тура',
  },
  {
    slug: 'hotel-booking',
    title: 'Условия бронирования размещения',
    short: 'Бронирование отелей и проживания',
  },
  {
    slug: 'cancellation',
    title: 'Изменение, отмена и возврат',
    short: 'Как изменить или отменить заказ',
  },
  {
    slug: 'tourist-memo',
    title: 'Памятка туристу',
    short: 'Что важно знать перед поездкой',
  },
  {
    slug: 'payment',
    title: 'Оплата и возврат денег',
    short: 'Способы оплаты и возврат средств',
  },
  {
    slug: 'requisites',
    title: 'Реквизиты и контакты',
    short: 'ООО «ТОТУСКЛАБ»: реквизиты и связь',
  },
];

export const LEGAL_DOC_SLUGS: readonly LegalDocSlug[] = LEGAL_DOCS.map(doc => doc.slug);

export function isLegalDocSlug(value: unknown): value is LegalDocSlug {
  return typeof value === 'string' && (LEGAL_DOC_SLUGS as readonly string[]).includes(value);
}

export function findLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find(doc => doc.slug === slug);
}
