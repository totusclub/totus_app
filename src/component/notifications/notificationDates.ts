// Даты для центра уведомлений: группы «Сегодня / Вчера / Ранее» и время справа
// («HH:MM» сегодня, «Вчера», «5 сен» раньше). База — supportDates.ts чата.
import {dayKey, formatMessageTime, parseDate} from '../support/supportDates';
import type {NotificationItem} from '../../modules/api/notifications';

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export type NotificationGroupKey = 'today' | 'yesterday' | 'earlier';

export const GROUP_TITLES: Record<NotificationGroupKey, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  earlier: 'Ранее',
};

function yesterdayKey(now: Date): string {
  const d = new Date(now);
  d.setDate(now.getDate() - 1);
  return dayKey(d.toISOString());
}

export function groupKeyFor(value: string | null | undefined, now: Date = new Date()): NotificationGroupKey {
  const key = dayKey(value);
  if (!key) return 'earlier';
  if (key === dayKey(now.toISOString())) return 'today';
  if (key === yesterdayKey(now)) return 'yesterday';
  return 'earlier';
}

/** «14:05» сегодня, «Вчера», «5 сен» (другой год — «5 сен 2025»). */
export function formatNotificationTime(value: string | null | undefined, now: Date = new Date()): string {
  const d = parseDate(value);
  if (!d) return '';
  const group = groupKeyFor(value, now);
  if (group === 'today') return formatMessageTime(value);
  if (group === 'yesterday') return 'Вчера';
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export type NotificationSection = {
  key: NotificationGroupKey;
  title: string;
  data: NotificationItem[];
};

/** Секции для SectionList в порядке «Сегодня → Вчера → Ранее» (пустые пропускаются). */
export function groupNotifications(items: NotificationItem[], now: Date = new Date()): NotificationSection[] {
  const buckets: Record<NotificationGroupKey, NotificationItem[]> = {today: [], yesterday: [], earlier: []};
  items.forEach(item => {
    buckets[groupKeyFor(item.createdAt, now)].push(item);
  });
  return (['today', 'yesterday', 'earlier'] as NotificationGroupKey[])
    .filter(key => buckets[key].length > 0)
    .map(key => ({key, title: GROUP_TITLES[key], data: buckets[key]}));
}
