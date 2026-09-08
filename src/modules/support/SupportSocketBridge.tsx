// Невидимый компонент на уровне App: держит сокет чата с поддержкой, пока
// пользователь авторизован и приложение активно (AppState), и обновляет
// счётчик непрочитанных в Redux по support:message / support:chat-updated
// и по foreground-пушу (Android, CallService.js → DeviceEventEmitter 'support:push').
// Экран чата сам подписывается на события и обнуляет счётчик при фокусе.
import React, {useEffect} from 'react';
import {AppState, AppStateStatus, DeviceEventEmitter} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../store';
import {
  incrementSupportUnread,
  setSupportChatInfo,
} from '../store/slices/supportChat';
import {
  connectSupportSocket,
  isSupportSocketConnected,
  onSupportEvent,
  releaseSupportSocket,
} from './supportSocket';
import {SUPPORT_PUSH_EVENT} from './supportConstants';
import type {SupportChat, SupportMessage} from '../api/supportChat';

const HOLDER = 'app';

const SupportSocketBridge: React.FC = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const isLoggedIn = Boolean(accessToken);

  // Соединение: авторизован + приложение активно.
  useEffect(() => {
    if (!isLoggedIn) {
      releaseSupportSocket(HOLDER);
      return;
    }

    const apply = (status: AppStateStatus) => {
      if (status === 'active') {
        connectSupportSocket(HOLDER);
      } else {
        releaseSupportSocket(HOLDER);
      }
    };

    apply(AppState.currentState);
    const sub = AppState.addEventListener('change', apply);
    return () => {
      sub.remove();
      releaseSupportSocket(HOLDER);
    };
  }, [isLoggedIn]);

  // Счётчик непрочитанных вне экрана чата.
  useEffect(() => {
    if (!isLoggedIn) return;

    const offMessage = onSupportEvent(
      'support:message',
      (payload: {chat?: SupportChat; message?: SupportMessage}) => {
        const chat = payload?.chat;
        if (chat && typeof chat.id === 'number') {
          dispatch(
            setSupportChatInfo({
              id: chat.id,
              userUnread: chat.userUnread,
              status: chat.status,
              lastMessageAt: chat.lastMessageAt,
            }),
          );
        } else if (payload?.message && payload.message.senderRole !== 'user') {
          dispatch(incrementSupportUnread());
        }
      },
    );

    const offUpdated = onSupportEvent('support:chat-updated', (payload: {chat?: SupportChat}) => {
      const chat = payload?.chat;
      if (!chat) return;
      dispatch(
        setSupportChatInfo({
          id: chat.id,
          userUnread: chat.userUnread,
          status: chat.status,
          lastMessageAt: chat.lastMessageAt,
        }),
      );
    });

    // Пуш приходит, только когда у сервера нет живого сокета пользователя.
    const pushSub = DeviceEventEmitter.addListener(SUPPORT_PUSH_EVENT, () => {
      if (!isSupportSocketConnected()) {
        dispatch(incrementSupportUnread());
      }
    });

    return () => {
      offMessage();
      offUpdated();
      pushSub.remove();
    };
  }, [dispatch, isLoggedIn]);

  return null;
};

export default SupportSocketBridge;
