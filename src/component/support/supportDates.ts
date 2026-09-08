// Форматирование времени/дат для чата с поддержкой (без внешних библиотек).

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «14:05» */
export function formatMessageTime(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ключ дня (локальная дата) — для разделителей. */
export function dayKey(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** «Сегодня» / «Вчера» / «7 сентября» / «7 сентября 2025». */
export function formatDaySeparator(value: string | null | undefined, now: Date = new Date()): string {
  const d = parseDate(value);
  if (!d) return '';
  const today = dayKey(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = dayKey(yesterdayDate.toISOString());
  const key = dayKey(value);
  if (key === today) return 'Сегодня';
  if (key === yesterday) return 'Вчера';
  const base = `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
