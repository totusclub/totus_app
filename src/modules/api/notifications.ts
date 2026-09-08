// REST-клиент хаба уведомлений (calling_api_v2, voip.totus.club, /api/notifications*, /api/push/devices).
// Все запросы — через voipFetch (Bearer пользовательского JWT), как в supportChat.ts.
// Ошибки сервера приходят как {error: 'notifications_not_migrated' | ...} и превращаются
// в NotificationsError с кодом; notificationsErrorMessage() даёт русский текст для UI.
import {VOIP_BASE_URL} from '../../config/server';
import {voipFetch} from './voipAuth';

/** Категория настроек (API.md §2). */
export type NotificationCategory =
  | 'orders'
  | 'documents'
  | 'reminders'
  | 'support'
  | 'promo'
  | 'system';

export type NotificationType =
  | 'order_created'
  | 'payment_success'
  | 'payment_failed'
  | 'order_request_status'
  | 'order_confirmed'
  | 'order_status'
  | 'order_cancelled'
  | 'documents_ready'
  | 'trip_reminder'
  | 'support_message'
  | 'missed_call'
  | 'promo'
  | 'system'
  | string;

export type NotificationRoute =
  | 'home'
  | 'order'
  | 'orders'
  | 'documents'
  | 'order_request'
  | 'support_chat'
  | 'account'
  | 'notifications'
  | 'url'
  | 'search'
  | string;

/** data уведомления / пуша: только идентификаторы, без персональных данных. */
export type NotificationData = {
  route?: NotificationRoute;
  orderId?: string | number;
  chatId?: string | number;
  url?: string;
  notificationId?: string | number;
  campaignId?: string | number;
  ruleId?: string | number;
  [key: string]: unknown;
};

export type NotificationItem = {
  id: number;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data: NotificationData | null;
  source?: string | null;
  readAt: string | null;
  openedAt?: string | null;
  createdAt: string;
};

export type NotificationPrefs = Record<NotificationCategory, boolean>;

export type NotificationCategoryMeta = {
  key: NotificationCategory;
  title: string;
  mandatory: boolean;
  enabled: boolean;
};

export type NotificationSettings = {
  prefs: NotificationPrefs;
  email: boolean;
  sound: boolean;
  categories?: NotificationCategoryMeta[];
  quietHours?: {from?: string; to?: string; tz?: string} | string | null;
};

export type PushDevice = {
  id: number;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  channel: 'fcm' | 'webpush';
  deviceId: string | null;
  deviceName: string | null;
  enabled: boolean;
  tokenTail?: string | null;
  lastSeenAt?: string | null;
};

export type GetNotificationsParams = {
  before?: number | null;
  limit?: number;
  category?: NotificationCategory | null;
  unread?: boolean;
};

export type GetNotificationsResponse = {
  items: NotificationItem[];
  hasMore: boolean;
  unread: number;
};

export type UnreadResponse = {unread: number};
export type OkUnreadResponse = {ok: boolean; unread: number};

export type GetSettingsResponse = {
  settings: NotificationSettings;
  devices?: PushDevice[];
};

export type RegisterPushDeviceInput = {
  platform: 'ios' | 'android';
  channel: 'fcm';
  token: string;
  deviceId: string;
  deviceName: string;
  appVersion: string;
  locale: string;
};

export type RegisterPushDeviceResponse = {
  ok: boolean;
  device: PushDevice;
  unread: number;
};

export class NotificationsError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message?: string) {
    super(message || code);
    this.name = 'NotificationsError';
    this.code = code;
    this.status = status;
  }
}

export function notificationsErrorCode(error: unknown): string {
  if (error instanceof NotificationsError) return error.code;
  const code = (error as {code?: unknown})?.code;
  return typeof code === 'string' ? code : '';
}

/** Русский текст ошибки для UI (RULES.md): миграция/сеть → «Уведомления временно недоступны». */
export function notificationsErrorMessage(error: unknown): string {
  const code = typeof error === 'string' ? error : notificationsErrorCode(error);
  switch (code) {
    case 'unauthorized':
    case 'forbidden':
      return 'Войдите в аккаунт, чтобы видеть уведомления';
    case 'not_found':
      return 'Уведомление не найдено';
    case 'platform_invalid':
    case 'token_invalid':
      return 'Не удалось зарегистрировать устройство для push-уведомлений';
    case 'notifications_not_migrated':
    case 'network':
    default:
      return 'Уведомления временно недоступны';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await voipFetch(`${VOIP_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? {'Content-Type': 'application/json'} : {}),
        ...((init.headers as Record<string, string> | undefined) || {}),
      },
    });
  } catch (e) {
    throw new NotificationsError('network', 0, (e as Error)?.message);
  }

  let json: any = null;
  try {
    const text = await response.text();
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const code =
      (json && typeof json.error === 'string' && json.error) ||
      (response.status === 401 || response.status === 403
        ? 'unauthorized'
        : `http_${response.status}`);
    throw new NotificationsError(code, response.status, json?.message);
  }
  return json as T;
}

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value === null || value === undefined || value === false || value === '') return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value === true ? 1 : value))}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

/** GET /api/notifications?before&limit&category&unread */
export function getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  return request<GetNotificationsResponse>(
    `/api/notifications${query({
      before: params.before ?? null,
      limit: params.limit ?? 30,
      category: params.category ?? null,
      unread: params.unread ? 1 : null,
    })}`,
  );
}

/** GET /api/notifications/unread */
export function getUnread(): Promise<UnreadResponse> {
  return request<UnreadResponse>('/api/notifications/unread');
}

/** POST /api/notifications/read {ids} | {all: true} */
export function markNotificationsRead(ids: number[] | 'all'): Promise<OkUnreadResponse> {
  const body = ids === 'all' ? {all: true} : ids.length === 1 ? {id: ids[0]} : {ids};
  return request<OkUnreadResponse>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST /api/notifications/opened {id} — тап по пушу/элементу (помечает прочитанным). */
export function markNotificationOpened(id: number | string): Promise<OkUnreadResponse> {
  return request<OkUnreadResponse>('/api/notifications/opened', {
    method: 'POST',
    body: JSON.stringify({id: typeof id === 'string' ? Number(id) || id : id}),
  });
}

/** DELETE /api/notifications/:id */
export function deleteNotification(id: number): Promise<{ok: boolean}> {
  return request<{ok: boolean}>(`/api/notifications/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
}

/** GET /api/notifications/settings */
export function getNotificationSettings(): Promise<GetSettingsResponse> {
  return request<GetSettingsResponse>('/api/notifications/settings');
}

/** PUT /api/notifications/settings {prefs?, email?, sound?} — обязательные категории всегда true. */
export function updateNotificationSettings(
  partial: Partial<Pick<NotificationSettings, 'email' | 'sound'>> & {prefs?: Partial<NotificationPrefs>},
): Promise<GetSettingsResponse> {
  return request<GetSettingsResponse>('/api/notifications/settings', {
    method: 'PUT',
    body: JSON.stringify(partial),
  });
}

/** POST /api/push/devices — регистрация после входа и при обновлении токена (upsert по токену). */
export function registerPushDevice(input: RegisterPushDeviceInput): Promise<RegisterPushDeviceResponse> {
  return request<RegisterPushDeviceResponse>('/api/push/devices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** DELETE /api/push/devices {token} — при выходе. */
export function unregisterPushDevice(token: string): Promise<{ok: boolean}> {
  return request<{ok: boolean}>('/api/push/devices', {
    method: 'DELETE',
    body: JSON.stringify({token}),
  });
}

/** GET /api/push/devices — свои устройства. */
export function getPushDevices(): Promise<{devices: PushDevice[]}> {
  return request<{devices: PushDevice[]}>('/api/push/devices');
}
