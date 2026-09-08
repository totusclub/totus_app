// REST-клиент чата с поддержкой (calling_api_v2, voip.totus.club, /api/support/chat*).
// Все запросы — через voipFetch (Bearer пользовательского JWT). Ошибки сервера
// приходят как {error: 'rate_limited' | 'message_too_long' | ...} и превращаются
// в SupportChatError с кодом; supportErrorMessage() даёт русский текст для UI.
import {VOIP_BASE_URL} from '../../config/server';
import {voipFetch} from './voipAuth';

export type SupportChatStatus = 'open' | 'pending' | 'closed';
export type SupportSenderRole = 'user' | 'staff' | 'agent' | 'system';

export type SupportMessageMeta = {
  orderId?: number | string | null;
  orderTitle?: string | null;
  orderSubtitle?: string | null;
  topic?: string | null;
};

export type SupportChat = {
  id: number;
  userId: number | string;
  status: SupportChatStatus;
  assignedId: number | string | null;
  assignedRole: string | null;
  assignedName: string | null;
  subject: string | null;
  orderId: number | string | null;
  lastMessageId: number | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  userUnread: number;
  staffUnread: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: number;
  chatId: number;
  senderRole: SupportSenderRole;
  senderId: number | string | null;
  senderName: string | null;
  body: string;
  meta: SupportMessageMeta | null;
  clientMsgId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type SupportHours = {
  open?: string | null;
  close?: string | null;
  tz?: string | null;
  text?: string | null;
};

export type GetSupportChatResponse = {
  chat: SupportChat;
  messages: SupportMessage[];
  hasMore: boolean;
  hours?: SupportHours | null;
};

export type GetSupportMessagesResponse = {
  messages: SupportMessage[];
  hasMore: boolean;
};

export type SendSupportMessageResponse = {
  ok: boolean;
  chat: SupportChat;
  message: SupportMessage;
};

export type MarkSupportReadResponse = {
  ok: boolean;
  chat: SupportChat;
};

export type SendSupportMessageInput = {
  body: string;
  clientMsgId?: string;
  meta?: SupportMessageMeta | null;
};

export const SUPPORT_MESSAGE_MAX_LENGTH = 4000;

export class SupportChatError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message?: string) {
    super(message || code);
    this.name = 'SupportChatError';
    this.code = code;
    this.status = status;
  }
}

/** Русский текст ошибки для UI (RULES.md). */
export function supportErrorMessage(error: unknown): string {
  const code =
    error instanceof SupportChatError
      ? error.code
      : typeof (error as {code?: unknown})?.code === 'string'
        ? String((error as {code: string}).code)
        : '';
  switch (code) {
    case 'rate_limited':
      return 'Слишком много сообщений, подождите минуту';
    case 'message_too_long':
      return 'Сообщение слишком длинное (до 4000 символов)';
    case 'body_required':
      return 'Введите текст сообщения';
    case 'unauthorized':
    case 'forbidden':
      return 'Войдите в аккаунт, чтобы написать в поддержку';
    default:
      return 'Чат временно недоступен';
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
    throw new SupportChatError('network', 0, (e as Error)?.message);
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
    throw new SupportChatError(code, response.status, json?.message);
  }
  return json as T;
}

/** GET /api/support/chat — создаёт диалог при первом обращении. */
export function getSupportChat(limit = 50): Promise<GetSupportChatResponse> {
  return request<GetSupportChatResponse>(`/api/support/chat?limit=${limit}`);
}

/** GET /api/support/chat/messages?before=<id> — страница истории вверх. */
export function getSupportMessages(
  before: number,
  limit = 50,
): Promise<GetSupportMessagesResponse> {
  return request<GetSupportMessagesResponse>(
    `/api/support/chat/messages?before=${encodeURIComponent(String(before))}&limit=${limit}`,
  );
}

/** POST /api/support/chat/messages. Повтор clientMsgId возвращает то же сообщение (200). */
export function sendSupportMessage(
  input: SendSupportMessageInput,
): Promise<SendSupportMessageResponse> {
  const payload: SendSupportMessageInput = {body: input.body};
  if (input.clientMsgId) payload.clientMsgId = input.clientMsgId;
  if (input.meta) payload.meta = input.meta;
  return request<SendSupportMessageResponse>('/api/support/chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** POST /api/support/chat/read — обнуляет userUnread. */
export function markSupportRead(lastMessageId?: number | null): Promise<MarkSupportReadResponse> {
  return request<MarkSupportReadResponse>('/api/support/chat/read', {
    method: 'POST',
    body: JSON.stringify(lastMessageId ? {lastMessageId} : {}),
  });
}

/** Идентификатор для идемпотентной отправки (в проекте нет uuid-библиотеки). */
export function createClientMsgId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  const random2 = Math.random().toString(36).slice(2, 6);
  return `app-${Date.now().toString(36)}-${random}${random2}`;
}
