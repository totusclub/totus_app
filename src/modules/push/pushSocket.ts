// События хаба уведомлений по сокету чата с поддержкой (supportSocket.ts — тот же namespace,
// комната u:<userId>): notify:new → в список и unread + 1, notify:badge → unread.
// Третий сокет не создаём: supportSocket форвардит 'notify:new' / 'notify:badge'.
import {emitSupport, onSupportEvent} from '../support/supportSocket';
import {store} from '../store';
import {notificationReceived, setUnread} from '../store/slices/notifications';
import type {NotificationItem} from '../api/notifications';

let unsubscribe: (() => void) | null = null;

function normalizeItem(payload: any): NotificationItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    type: String(payload.type || 'system'),
    category: payload.category || 'system',
    title: String(payload.title || ''),
    body: String(payload.body || ''),
    data: payload.data && typeof payload.data === 'object' ? payload.data : null,
    source: payload.source ?? 'socket',
    readAt: payload.readAt ?? null,
    openedAt: payload.openedAt ?? null,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
}

/** Подписка на notify:* (пока пользователь авторизован). Возвращает функцию отписки. */
export function subscribePushSocket(): () => void {
  if (unsubscribe) return unsubscribe;

  const offNew = onSupportEvent('notify:new', payload => {
    const item = normalizeItem(payload);
    if (item) store.dispatch(notificationReceived(item));
  });

  const offBadge = onSupportEvent('notify:badge', (payload: {unread?: number}) => {
    if (payload && typeof payload.unread === 'number') {
      store.dispatch(setUnread(payload.unread));
    }
  });

  // При (ре)коннекте — актуальный бейдж с сервера (ack notify:badge).
  const offConnect = onSupportEvent('connect', () => {
    emitSupport<{ok?: boolean; unread?: number}>('notify:badge', {})
      .then(result => {
        if (result && typeof result.unread === 'number') {
          store.dispatch(setUnread(result.unread));
        }
      })
      .catch(() => undefined);
  });

  unsubscribe = () => {
    offNew();
    offBadge();
    offConnect();
    unsubscribe = null;
  };
  return unsubscribe;
}

export function unsubscribePushSocket(): void {
  unsubscribe?.();
}
