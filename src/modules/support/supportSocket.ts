// Отдельный Socket.io-сокет для чата с поддержкой (тот же namespace voip.totus.club,
// что и звонки). Сокет VoipService приватный и в 190 КБ-файл мы не заходим, поэтому
// чат держит собственное соединение. По токену сервер кладёт сокет в комнату u:<userId>
// и шлёт support:message / support:read / support:typing / support:chat-updated,
// а также notify:new / notify:badge хаба уведомлений (pushSocket.ts).
// registerDevice по этому сокету НЕ отправляется — звонки идут через VoipService.
//
// Политика подключения (SupportSocketBridge + useSupportChat):
//   - экран чата открыт → connect;
//   - пользователь авторизован и приложение активно (AppState) → connect;
//   - логаут → disconnectSupportSocket().
import {io, Socket} from 'socket.io-client';
import {VOIP_BASE_URL} from '../../config/server';
import {voipSocketAuth} from '../api/voipAuth';

export type SupportSocketHandler = (payload: any) => void;

let socket: Socket | null = null;
const holders = new Map<string, boolean>();
const listeners = new Map<string, Set<SupportSocketHandler>>();

function createSocket(): Socket {
  const s = io(VOIP_BASE_URL, {
    auth: voipSocketAuth,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    autoConnect: false,
  });

  s.on('connect', () => {
    console.log('[support-socket] connected', s.id);
    dispatch('connect', {id: s.id});
  });
  s.on('disconnect', reason => {
    console.log('[support-socket] disconnected:', reason);
    dispatch('disconnect', {reason});
  });
  s.on('connect_error', err => {
    console.warn('[support-socket] connect_error:', err?.message || err);
  });

  const forward = (event: string) => {
    s.on(event, (payload: unknown) => dispatch(event, payload));
  };
  forward('support:message');
  forward('support:read');
  forward('support:typing');
  forward('support:chat-updated');
  // Хаб уведомлений (тот же сокет, комната u:<userId>) — см. src/modules/push/pushSocket.ts.
  forward('notify:new');
  forward('notify:badge');

  return s;
}

function dispatch(event: string, payload: unknown): void {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;
  set.forEach(handler => {
    try {
      handler(payload);
    } catch (e) {
      console.warn(`[support-socket] handler error for ${event}:`, e);
    }
  });
}

function anyHolderActive(): boolean {
  for (const active of holders.values()) {
    if (active) return true;
  }
  return false;
}

/**
 * Заявить потребность в соединении от имени `holder` («screen», «app»).
 * Сокет живёт, пока активен хотя бы один держатель.
 */
export function connectSupportSocket(holder: string = 'app'): void {
  holders.set(holder, true);
  if (!socket) socket = createSocket();
  if (!socket.connected && !socket.active) {
    socket.connect();
  }
}

/** Снять потребность держателя; при отсутствии активных — отключить сокет. */
export function releaseSupportSocket(holder: string = 'app'): void {
  holders.set(holder, false);
  if (!anyHolderActive() && socket) {
    socket.disconnect();
  }
}

/** Полное отключение (логаут): сбрасывает всех держателей и закрывает соединение. */
export function disconnectSupportSocket(): void {
  holders.clear();
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function isSupportSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

/** Подписка на событие сервера (или 'connect' / 'disconnect'). Возвращает функцию отписки. */
export function onSupportEvent(event: string, handler: SupportSocketHandler): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(handler);
  return () => {
    const current = listeners.get(event);
    if (current) {
      current.delete(handler);
      if (current.size === 0) listeners.delete(event);
    }
  };
}

/**
 * Отправка события с ack. Если сокет не подключён — reject('socket_offline'),
 * чтобы вызывающий код мог уйти в REST.
 */
export function emitSupport<T = any>(
  event: string,
  payload: Record<string, unknown>,
  timeoutMs = 8000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      reject(new Error('socket_offline'));
      return;
    }
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('socket_timeout'));
    }, timeoutMs);
    socket.emit(event, payload, (result: T) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result);
    });
  });
}

/** Событие без ack (typing). Молча игнорируется, если сокет офлайн. */
export function emitSupportFireAndForget(event: string, payload: Record<string, unknown>): void {
  if (!socket || !socket.connected) return;
  socket.emit(event, payload);
}
