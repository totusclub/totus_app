/**
 * Бронирование и оформление: состояние загрузки тура и «что входит в тур» — только из полей
 * ответа Level.Travel (actualize / заказ), без текста, зашитого для всех туров.
 * Та же логика, что на сайте (totus_WEB #89, src/utils/bookingOffer.ts).
 *
 * Поля пакета LT: transfer, medical_insurance (bool), instant_confirm (bool), hotel.visa.needed,
 * extras[], taxes[], notices[], fuel_charge, predicted_surcharge, departure.name_ru_form2.
 * Поля нет в ответе — строки нет (ни «входит», ни «не входит»).
 */

import { formatMoneyRub, toMoney } from './packagePrice';

/* ───────────── Загрузка тура ───────────── */

/**
 * unavailable — тур снят / продан / протух (повтор не поможет);
 * offline — нет интернета; error — сбой связи или туроператора, можно повторить.
 */
export type BookingFailureKind = 'unavailable' | 'offline' | 'error';

/** Ответ actualize с `success: false`, `rotten: true` или `package.available: false`. */
export function isOfferUnavailablePayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return (
    payload.success === false ||
    payload.rotten === true ||
    payload.package?.available === false
  );
}

function isAxiosLike(err: any): boolean {
  return Boolean(err && typeof err === 'object' && (err.isAxiosError === true || 'response' in err || 'request' in err));
}

/** Запрос отменён (ушли с экрана / открыли другой перелёт) — это не ошибка. */
export function isRequestCancelled(err: any): boolean {
  return (
    err?.name === 'CanceledError' ||
    err?.name === 'AbortError' ||
    err?.code === 'ERR_CANCELED' ||
    err?.__CANCEL__ === true
  );
}

/** Таймаут браузерной стороны (axios ECONNABORTED / ETIMEDOUT). */
export function isTimeoutError(err: any): boolean {
  const code = String(err?.code || '');
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return true;
  return /timeout of \d+ms exceeded/i.test(String(err?.message || ''));
}

/**
 * Ошибка запроса actualize → что показать.
 * Таймаут, обрыв связи, 5xx, totus_API `lt_timeout` / `lt_unreachable` / `internal` → «Не удалось
 * загрузить» с «Повторить». Тело с rotten / available:false и 4xx от Level.Travel (пакет не найден,
 * неверные параметры) → «Предложение недоступно». `isOffline` — нет сети по данным NetInfo.
 */
export function classifyBookingLoadFailure(err: any, isOffline = false): BookingFailureKind {
  if (!isAxiosLike(err)) return isOffline ? 'offline' : 'error';
  const response = err.response;
  if (!response) return isOffline ? 'offline' : 'error';

  const data: any = response.data;
  if (isOfferUnavailablePayload(data) && data?.code == null) return 'unavailable';

  const code = String(data?.code || '');
  if (code === 'lt_timeout' || code === 'lt_unreachable' || code === 'internal') return 'error';

  const status = Number(response.status) || 0;
  if (status === 408 || status === 429) return 'error';
  if (status >= 400 && status < 500 && status !== 401 && status !== 403) return 'unavailable';
  return 'error';
}

/** Через сколько показывать «Проверяем цену и места у туроператора». */
export const BOOKING_SLOW_HINT_MS = 4000;

/* ───────────── Тексты ───────────── */

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatNights(n: unknown): string {
  const count = Math.trunc(toMoney(n));
  if (count <= 0) return '';
  return `${count} ${pluralRu(count, 'ночь', 'ночи', 'ночей')}`;
}

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function parseIsoDate(value: unknown): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «22–29 октября» / «30 октября – 6 ноября». */
export function formatDateRangeShort(start: unknown, end: unknown): string {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (!a || !b) return '';
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
  }
  return `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
}

/** «Белек, Турция · 22–29 октября · 2 взрослых» — из пакета, который LT вернул и в отказе. */
export function getOfferSummary(pkg: any): string {
  if (!pkg || typeof pkg !== 'object') return '';
  const place = [pkg.hotel?.city, pkg.hotel?.country].filter(Boolean).join(', ');
  const dates = formatDateRangeShort(
    pkg.dates_info?.start_date ?? pkg.start_date,
    pkg.dates_info?.end_date ?? pkg.end_date,
  );
  const adults = Math.trunc(toMoney(pkg.adults_count));
  const kids = Math.trunc(toMoney(pkg.kids_count));
  const people = [
    adults > 0 ? `${adults} ${pluralRu(adults, 'взрослый', 'взрослых', 'взрослых')}` : '',
    kids > 0 ? `${kids} ${pluralRu(kids, 'ребёнок', 'ребёнка', 'детей')}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return [place, dates, people].filter(Boolean).join(' · ');
}

/* ───────────── Доплаты ───────────── */

/**
 * Подпись доплаты в «Ваш заказ»: сумма из актуализации или выбранного перелёта —
 * топливный сбор; только прогноз туроператора (predicted_surcharge) — «Доплаты и сборы».
 */
export function getFeesLabel(pkg: any, selectedFlight?: any): string {
  if (toMoney(pkg?.fuel_charge) > 0 || toMoney(selectedFlight?.fuel_charge) > 0) {
    return 'Топливный сбор авиакомпании';
  }
  return 'Доплаты и сборы';
}

/* ───────────── Что входит ───────────── */

export type InclusionKind = 'yes' | 'no' | 'info';

export type InclusionItem = {
  key: string;
  kind: InclusionKind;
  title: string;
  /** Серый хвост строки: «не входит», «не нужна», сумма. */
  note?: string;
  /** Вторая строка мелким текстом. */
  detail?: string;
};

function textOf(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return textOf(value.name_ru ?? value.name ?? value.title ?? value.text ?? value.description ?? value.message);
  }
  return '';
}

function amountOf(value: any): number {
  if (!value || typeof value !== 'object') return 0;
  return toMoney(value.price ?? value.amount ?? value.value ?? value.sum ?? value.cost);
}

const MAX_NOTICE_LENGTH = 240;

function clip(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > MAX_NOTICE_LENGTH ? `${t.slice(0, MAX_NOTICE_LENGTH - 1)}…` : t;
}

/** Строки «Что входит в тур» (карточка заказа на бронировании и «А что ещё» на оформлении). */
export function getBookingInclusions(
  pkg: any,
  options?: { isHotelOnly?: boolean },
): InclusionItem[] {
  if (!pkg || typeof pkg !== 'object') return [];
  const isHotelOnly = options?.isHotelOnly === true;
  const items: InclusionItem[] = [];

  if (!isHotelOnly) {
    const from = textOf(pkg.departure?.name_ru_form2);
    items.push({
      key: 'flight',
      kind: 'yes',
      title: from ? `Перелёт из ${from} и обратно` : 'Перелёт туда и обратно',
    });
  }

  const nights = formatNights(pkg.dates_info?.nights_count ?? pkg.nights_count);
  const meal = textOf(pkg.pansion_description);
  items.push({
    key: 'stay',
    kind: 'yes',
    title: ['Проживание', nights].filter(Boolean).join(', ') + (meal ? ` · ${meal}` : ''),
  });

  if (typeof pkg.medical_insurance === 'boolean') {
    items.push(
      pkg.medical_insurance
        ? { key: 'insurance', kind: 'yes', title: 'Медицинская страховка' }
        : { key: 'insurance', kind: 'no', title: 'Медицинская страховка', note: 'не входит' },
    );
  }

  if (!isHotelOnly && typeof pkg.transfer === 'boolean') {
    items.push(
      pkg.transfer
        ? { key: 'transfer', kind: 'yes', title: 'Трансфер аэропорт — отель' }
        : { key: 'transfer', kind: 'no', title: 'Трансфер аэропорт — отель', note: 'не входит' },
    );
  }

  const visa = pkg.hotel?.visa;
  if (visa && typeof visa.needed === 'boolean') {
    const visaText = textOf(visa.text);
    items.push(
      visa.needed
        ? { key: 'visa', kind: 'info', title: 'Виза для граждан РФ', note: 'нужна', detail: visaText ? clip(visaText) : undefined }
        : { key: 'visa', kind: 'info', title: 'Виза для граждан РФ', note: 'не нужна' },
    );
  }

  if (Array.isArray(pkg.taxes)) {
    pkg.taxes.forEach((tax: any, index: number) => {
      const name = textOf(tax) || 'Налог или сбор';
      const amount = amountOf(tax);
      items.push({
        key: `tax-${index}`,
        kind: 'info',
        title: clip(name),
        note: amount > 0 ? formatMoneyRub(amount) : undefined,
      });
    });
  }

  if (Array.isArray(pkg.extras)) {
    pkg.extras.forEach((extra: any, index: number) => {
      const name = textOf(extra);
      if (!name) return;
      const amount = amountOf(extra);
      items.push({
        key: `extra-${index}`,
        kind: 'info',
        title: `Можно добавить: ${clip(name)}`,
        note: amount > 0 ? formatMoneyRub(amount) : undefined,
      });
    });
  }

  if (Array.isArray(pkg.notices)) {
    pkg.notices.forEach((notice: any, index: number) => {
      const text = textOf(notice);
      if (!text) return;
      items.push({ key: `notice-${index}`, kind: 'info', title: clip(text) });
    });
  }

  return items;
}

/** «Подтверждение» на оформлении: из instant_confirm; поля нет — строки нет. */
export function getConfirmationLabel(pkg: any): string | null {
  if (typeof pkg?.instant_confirm !== 'boolean') return null;
  return pkg.instant_confirm ? 'Мгновенное' : 'После проверки туроператором';
}

/** «А что ещё» на оформлении: подпись и значение строки из пункта «Что входит». */
export function getCheckoutExtraRow(item: InclusionItem): { label: string; value: string } {
  if (item.key === 'insurance') {
    return { label: 'Медицинская страховка', value: item.kind === 'yes' ? 'Входит в тур' : 'Не входит' };
  }
  if (item.key === 'transfer') {
    return { label: 'Трансфер', value: item.kind === 'yes' ? 'Входит в тур' : 'Не входит' };
  }
  if (item.key === 'visa') {
    return { label: 'Виза', value: item.note === 'нужна' ? 'Нужна' : 'Не нужна' };
  }
  return item.note ? { label: item.title, value: item.note } : { label: 'Важно', value: item.title };
}
