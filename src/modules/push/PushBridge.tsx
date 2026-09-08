// Невидимый компонент на уровне App (рядом с SupportSocketBridge):
//   - initPushHandlers() один раз (notifee/FCM-обработчики, Android-каналы);
//   - после входа: статус разрешения → регистрация устройства (если разрешено)
//     или шторка предзапроса (один раз, PushPermissionSheet);
//   - при логауте: снятие флага регистрации (DELETE делает Account.tsx до logoutReducer);
//   - notify:new / notify:badge по сокету чата (pushSocket.ts);
//   - AppState active → refreshUnread + отложенный тап из фона (push:pendingPress);
//   - холодный старт по тапу → deep link после готовности navigationRef.
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../store';
import {refreshUnread, setPushPrompted, setPushRegistered} from '../store/slices/notifications';
import PushPermissionSheet from '../../component/notifications/PushPermissionSheet';
import {subscribePushSocket, unsubscribePushSocket} from './pushSocket';
import {
  getPushStatus,
  handleNotificationPress,
  initPushHandlers,
  processInitialNotification,
  registerPushDevice,
  requestPushPermission,
  takePendingPress,
} from './pushService';

/** Пауза перед шторкой после входа — чтобы не перекрывать анимацию перехода на «Аккаунт». */
const SHEET_DELAY_MS = 900;

const PushBridge: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const fullAuth = useSelector((state: RootState) => state.auth.fullAuth);
  const prompted = useSelector((state: RootState) => state.notifications?.prompted ?? false);
  const isLoggedIn = Boolean(fullAuth && accessToken);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const initialHandled = useRef(false);
  const promptedRef = useRef(prompted);
  promptedRef.current = prompted;

  // Обработчики — один раз на жизнь приложения.
  useEffect(() => {
    initPushHandlers();
  }, []);

  // Вход / выход.
  useEffect(() => {
    if (!isLoggedIn) {
      unsubscribePushSocket();
      dispatch(setPushRegistered(false));
      setSheetVisible(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    subscribePushSocket();
    dispatch(refreshUnread());

    getPushStatus()
      .then(status => {
        if (cancelled) return;
        if (status.permission === 'granted') {
          // Разрешение уже есть (дано раньше) — регистрируем без шторки; при каждом входе.
          void registerPushDevice();
          return;
        }
        if (status.permission === 'undetermined' && !promptedRef.current) {
          timer = setTimeout(() => {
            if (!cancelled) setSheetVisible(true);
          }, SHEET_DELAY_MS);
        }
      })
      .catch(() => undefined);

    // Холодный старт по тапу на уведомление.
    if (!initialHandled.current) {
      initialHandled.current = true;
      processInitialNotification().catch(() => undefined);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [dispatch, isLoggedIn]);

  // Возврат в foreground: бейдж + отложенный тап из фона (notifee.onBackgroundEvent → push:pendingPress).
  useEffect(() => {
    if (!isLoggedIn) return;

    const onChange = (status: AppStateStatus) => {
      if (status !== 'active') return;
      dispatch(refreshUnread());
      takePendingPress()
        .then(data => {
          if (data) handleNotificationPress(data);
        })
        .catch(() => undefined);
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [dispatch, isLoggedIn]);

  const handleEnable = useCallback(async () => {
    setSheetBusy(true);
    dispatch(setPushPrompted(true));
    try {
      await requestPushPermission();
    } finally {
      setSheetBusy(false);
      setSheetVisible(false);
    }
  }, [dispatch]);

  const handleNotNow = useCallback(() => {
    dispatch(setPushPrompted(true));
    setSheetVisible(false);
  }, [dispatch]);

  return (
    <PushPermissionSheet
      visible={sheetVisible}
      busy={sheetBusy}
      onEnable={handleEnable}
      onDismiss={handleNotNow}
    />
  );
};

export default PushBridge;
