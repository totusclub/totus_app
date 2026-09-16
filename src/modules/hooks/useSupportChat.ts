// Логика экрана «Чат с поддержкой»: загрузка диалога, история вверх (before),
// отправка с оптимистичным сообщением и ретраем, события сокета, markRead при
// фокусе экрана, typing с троттлингом. Сообщения хранятся НОВЫЕ → СТАРЫЕ
// (для inverted FlatList).
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {
  createClientMsgId,
  getSupportChat,
  getSupportMessages,
  markSupportRead,
  sendSupportMessage,
  supportErrorMessage,
  SUPPORT_MESSAGE_MAX_LENGTH,
  type SupportChat,
  type SupportHours,
  type SupportMessage,
  type SupportMessageMeta,
} from '../api/supportChat';
import {
  connectSupportSocket,
  emitSupportFireAndForget,
  onSupportEvent,
  releaseSupportSocket,
} from '../support/supportSocket';
import {setSupportChatInfo, setSupportUnread} from '../store/slices/supportChat';

export type SupportMessageStatus = 'sending' | 'failed' | 'sent';

/** Сообщение в UI: серверное + локальный статус отправки. */
export type UiSupportMessage = SupportMessage & {
  status: SupportMessageStatus;
  /** Ключ списка: clientMsgId (оптимистичные) или id. */
  key: string;
};

const PAGE_SIZE = 50;
const TYPING_THROTTLE_MS = 2500;
const TYPING_STAFF_TIMEOUT_MS = 6000;
const HOLDER = 'screen';

function toUi(message: SupportMessage, status: SupportMessageStatus = 'sent'): UiSupportMessage {
  return {
    ...message,
    status,
    key: message.clientMsgId ? `c:${message.clientMsgId}` : `id:${message.id}`,
  };
}

function sameMessage(a: SupportMessage, b: SupportMessage): boolean {
  if (a.clientMsgId && b.clientMsgId) return a.clientMsgId === b.clientMsgId;
  return a.id != null && b.id != null && a.id === b.id;
}

function sortNewestFirst(list: UiSupportMessage[]): UiSupportMessage[] {
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function upsert(list: UiSupportMessage[], incoming: UiSupportMessage): UiSupportMessage[] {
  const index = list.findIndex(m => sameMessage(m, incoming));
  if (index === -1) return sortNewestFirst([incoming, ...list]);
  const next = list.slice();
  // Сохраняем ключ, чтобы FlatList не пересоздавал строку.
  next[index] = {...incoming, key: list[index].key};
  return next;
}

export function useSupportChat() {
  const dispatch = useDispatch();
  const isFocused = useIsFocused();

  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<UiSupportMessage[]>([]);
  const [hours, setHours] = useState<SupportHours | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [staffTyping, setStaffTyping] = useState(false);

  const pendingBodies = useRef(new Map<string, {body: string; meta: SupportMessageMeta | null}>());
  const lastTypingSent = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staffTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const connectCount = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (staffTypingTimer.current) clearTimeout(staffTypingTimer.current);
    };
  }, []);

  const syncChatToStore = useCallback(
    (next: SupportChat | null | undefined) => {
      if (!next) return;
      dispatch(
        setSupportChatInfo({
          id: next.id,
          userUnread: next.userUnread,
          status: next.status,
          lastMessageAt: next.lastMessageAt,
        }),
      );
    },
    [dispatch],
  );

  // ---- Загрузка диалога ----
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSupportChat(PAGE_SIZE);
      if (!mounted.current) return;
      setChat(res.chat);
      setHours(res.hours || null);
      setHasMore(Boolean(res.hasMore));
      setMessages(sortNewestFirst((res.messages || []).map(m => toUi(m))));
      syncChatToStore(res.chat);
    } catch (e) {
      if (!mounted.current) return;
      setError(supportErrorMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [syncChatToStore]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ---- История вверх ----
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const oldest = [...messages].reverse().find(m => m.status === 'sent' && m.id != null);
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const res = await getSupportMessages(oldest.id, PAGE_SIZE);
      if (!mounted.current) return;
      setHasMore(Boolean(res.hasMore));
      setMessages(prev => {
        let next = prev;
        for (const m of res.messages || []) next = upsert(next, toUi(m));
        return next;
      });
    } catch (e) {
      if (mounted.current) setError(supportErrorMessage(e));
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [hasMore, loadingMore, messages]);

  // ---- Прочитано ----
  const markRead = useCallback(async () => {
    const newestIncoming = messages.find(m => m.senderRole !== 'user' && m.status === 'sent');
    const hasUnread = (chat?.userUnread || 0) > 0;
    dispatch(setSupportUnread(0));
    if (!hasUnread && !newestIncoming) return;
    const readAt = new Date().toISOString();
    setMessages(prev =>
      prev.map(m => (m.senderRole !== 'user' && !m.readAt ? {...m, readAt} : m)),
    );
    try {
      const res = await markSupportRead(newestIncoming?.id ?? chat?.lastMessageId ?? undefined);
      if (!mounted.current) return;
      if (res?.chat) {
        setChat(res.chat);
        syncChatToStore(res.chat);
      }
    } catch {
      // Не критично: повторим при следующем фокусе/сообщении.
    }
  }, [chat, dispatch, messages, syncChatToStore]);

  const unreadFromStaff = useMemo(
    () => messages.some(m => m.senderRole !== 'user' && !m.readAt && m.status === 'sent'),
    [messages],
  );

  useEffect(() => {
    if (!isFocused || loading) return;
    if ((chat?.userUnread || 0) > 0 || unreadFromStaff) {
      markRead();
    } else {
      dispatch(setSupportUnread(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, loading, chat?.userUnread, unreadFromStaff]);

  // ---- Сокет: только пока экран чата в фокусе (уход со экрана → FCM сможет уйти) ----
  useEffect(() => {
    if (!isFocused) {
      releaseSupportSocket(HOLDER);
      return;
    }
    connectSupportSocket(HOLDER);
    return () => releaseSupportSocket(HOLDER);
  }, [isFocused]);

  useEffect(() => {
    const offMessage = onSupportEvent(
      'support:message',
      (payload: {chat?: SupportChat; message?: SupportMessage}) => {
        const message = payload?.message;
        if (message) {
          setMessages(prev => upsert(prev, toUi(message)));
          if (message.clientMsgId) pendingBodies.current.delete(message.clientMsgId);
          if (message.senderRole !== 'user') {
            setStaffTyping(false);
          }
        }
        if (payload?.chat) {
          setChat(payload.chat);
          syncChatToStore(payload.chat);
        }
      },
    );

    const offRead = onSupportEvent(
      'support:read',
      (payload: {by?: string; lastMessageId?: number | null; chat?: SupportChat}) => {
        if (payload?.by !== 'staff') return;
        const upTo = payload.lastMessageId;
        const readAt = new Date().toISOString();
        setMessages(prev =>
          prev.map(m => {
            if (m.senderRole !== 'user' || m.readAt) return m;
            if (upTo == null || m.id == null || Number(m.id) <= Number(upTo)) {
              return {...m, readAt};
            }
            return m;
          }),
        );
        if (payload.chat) setChat(payload.chat);
      },
    );

    const offTyping = onSupportEvent(
      'support:typing',
      (payload: {from?: string; typing?: boolean}) => {
        if (payload?.from !== 'staff') return;
        if (staffTypingTimer.current) clearTimeout(staffTypingTimer.current);
        if (payload.typing) {
          setStaffTyping(true);
          staffTypingTimer.current = setTimeout(() => setStaffTyping(false), TYPING_STAFF_TIMEOUT_MS);
        } else {
          setStaffTyping(false);
        }
      },
    );

    const offUpdated = onSupportEvent('support:chat-updated', (payload: {chat?: SupportChat}) => {
      if (!payload?.chat) return;
      setChat(payload.chat);
      syncChatToStore(payload.chat);
    });

    // После РЕконнекта подтягиваем пропущенное (первый connect — не считаем).
    const offConnect = onSupportEvent('connect', () => {
      connectCount.current += 1;
      if (connectCount.current > 1 && !loading) reload();
    });

    return () => {
      offMessage();
      offRead();
      offTyping();
      offUpdated();
      offConnect();
    };
  }, [loading, reload, syncChatToStore]);

  // ---- Отправка ----
  const sendWithId = useCallback(
    async (clientMsgId: string, body: string, meta: SupportMessageMeta | null) => {
      try {
        const res = await sendSupportMessage({body, clientMsgId, meta});
        if (!mounted.current) return;
        pendingBodies.current.delete(clientMsgId);
        setMessages(prev => upsert(prev, toUi(res.message)));
        setChat(res.chat);
        syncChatToStore(res.chat);
        setSendError(null);
      } catch (e) {
        if (!mounted.current) return;
        setSendError(supportErrorMessage(e));
        setMessages(prev =>
          prev.map(m => (m.clientMsgId === clientMsgId ? {...m, status: 'failed'} : m)),
        );
      }
    },
    [syncChatToStore],
  );

  const send = useCallback(
    async (rawBody: string, meta?: SupportMessageMeta | null) => {
      const body = rawBody.trim();
      if (!body) return;
      if (body.length > SUPPORT_MESSAGE_MAX_LENGTH) {
        setSendError('Сообщение слишком длинное (до 4000 символов)');
        return;
      }
      const clientMsgId = createClientMsgId();
      const optimistic: UiSupportMessage = {
        id: 0,
        chatId: chat?.id ?? 0,
        senderRole: 'user',
        senderId: null,
        senderName: null,
        body,
        meta: meta || null,
        clientMsgId,
        readAt: null,
        createdAt: new Date().toISOString(),
        status: 'sending',
        key: `c:${clientMsgId}`,
      };
      pendingBodies.current.set(clientMsgId, {body, meta: meta || null});
      setMessages(prev => upsert(prev, optimistic));
      setSendError(null);

      // Сообщили, что перестали печатать.
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      lastTypingSent.current = 0;
      emitSupportFireAndForget('support:typing', {typing: false});

      await sendWithId(clientMsgId, body, meta || null);
    },
    [chat?.id, sendWithId],
  );

  const retry = useCallback(
    async (clientMsgId: string) => {
      const pending = pendingBodies.current.get(clientMsgId);
      if (!pending) return;
      setMessages(prev =>
        prev.map(m => (m.clientMsgId === clientMsgId ? {...m, status: 'sending'} : m)),
      );
      await sendWithId(clientMsgId, pending.body, pending.meta);
    },
    [sendWithId],
  );

  const removeFailed = useCallback((clientMsgId: string) => {
    pendingBodies.current.delete(clientMsgId);
    setMessages(prev => prev.filter(m => m.clientMsgId !== clientMsgId));
  }, []);

  // ---- Typing (троттлинг) ----
  const notifyTyping = useCallback((text: string) => {
    if (!text.trim()) {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (lastTypingSent.current) {
        lastTypingSent.current = 0;
        emitSupportFireAndForget('support:typing', {typing: false});
      }
      return;
    }
    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_THROTTLE_MS) {
      lastTypingSent.current = now;
      emitSupportFireAndForget('support:typing', {typing: true});
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      lastTypingSent.current = 0;
      emitSupportFireAndForget('support:typing', {typing: false});
    }, TYPING_THROTTLE_MS + 500);
  }, []);

  const clearSendError = useCallback(() => setSendError(null), []);

  return {
    chat,
    messages,
    hours,
    hasMore,
    loading,
    loadingMore,
    error,
    sendError,
    staffTyping,
    reload,
    loadMore,
    send,
    retry,
    removeFailed,
    markRead,
    notifyTyping,
    clearSendError,
  };
}

export type UseSupportChat = ReturnType<typeof useSupportChat>;
