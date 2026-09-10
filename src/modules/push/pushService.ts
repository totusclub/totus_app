// Push-уведомления (этап 2 плана PUSH_NOTIFICATIONS_PLAN_RU.md): разрешение, регистрация
// устройства в хабе calling_api_v2 (POST /api/push/devices), Android-каналы notifee,
// показ баннера в foreground, обработка тапа (deep link по data.route).
//
// Звонки сюда не заходят: iOS — PushKit/CallKit (VoipService), Android — CallService.js
// сам отфильтровывает incoming_call и передаёт нам только «обычные» пуши хаба.
// Разрешение запрашивается из JS после входа (PushBridge → PushPermissionSheet), а не при запуске.
import {AppState, Linking, NativeModules, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, {type FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  type Event as NotifeeEvent,
} from '@notifee/react-native';
import {store} from '../store';
import {
  markReadLocal,
  notificationReceived,
  refreshUnread,
  setPushPermission,
  setPushRegistered,
  setUnread,
  type PushPermission,
} from '../store/slices/notifications';
import {
  markNotificationOpened,
  registerPushDevice as apiRegisterPushDevice,
  unregisterPushDevice as apiUnregisterPushDevice,
  type NotificationData,
  type NotificationItem,
} from '../api/notifications';
import {navigateRoot, navigationRef} from '../../navigation/navigationRef';
import {SUPPORT_CHAT_ROUTE} from '../support/supportConstants';
import {
  ANDROID_CHANNELS,
  FIREBASE_GCM_SENDER_ID,
  NOTIFICATIONS_ROUTE,
  PUSH_STORAGE_DEVICE_ID,
  PUSH_STORAGE_GCM_SENDER,
  PUSH_STORAGE_PENDING_PRESS,
  PUSH_STORAGE_TOKEN,
  categoryForType,
  channelForType,
} from './pushConstants';

const packageJson = require('../../../package.json') as {version?: string};

export type PushStatus = {
  permission: PushPermission;
  registered: boolean;
  token?: string;
};

export type PushMessageData = NotificationData & {
  type?: string;
  title?: string;
  body?: string;
  [key: string]: unknown;
};

let handlersInitialized = false;
let channelsReady: Promise<void> | null = null;
let registering: Promise<boolean> | null = null;
let unsubscribeTokenRefresh: (() => void) | null = null;
let unsubscribeForeground: (() => void) | null = null;
let unsubscribeOpened: (() => void) | null = null;
let unsubscribeIosMessage: (() => void) | null = null;

function log(...args: unknown[]): void {
  console.log('[push]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[push]', ...args);
}

// ---------------------------------------------------------------------------
// Разрешение
// ---------------------------------------------------------------------------

function mapAuthorizationStatus(status: number | null | undefined): PushPermission {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      return 'granted';
    case AuthorizationStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

/**
 * Текущее состояние: разрешение системы и зарегистрировано ли устройство в хабе.
 * Android до 13 всегда granted; Android 13+ не различает «не спрашивали» и «отказ»,
 * поэтому до первого предзапроса (prompted=false) «отказ» считаем undetermined.
 */
export async function getPushStatus(): Promise<PushStatus> {
  let permission: PushPermission = 'undetermined';
  try {
    const settings = await notifee.getNotificationSettings();
    permission = mapAuthorizationStatus(settings?.authorizationStatus);
  } catch (e) {
    try {
      permission = mapAuthorizationStatus(await messaging().hasPermission());
    } catch {
      permission = 'undetermined';
    }
  }
  if (Platform.OS === 'android' && permission === 'denied') {
    const prompted = Boolean(store.getState().notifications?.prompted);
    if (!prompted) permission = 'undetermined';
  }
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(PUSH_STORAGE_TOKEN);
  } catch {
    token = null;
  }
  store.dispatch(setPushPermission(permission));
  store.dispatch(setPushRegistered(Boolean(token)));
  return {permission, registered: Boolean(token), token: token || undefined};
}

/**
 * Системный диалог (iOS) / POST_NOTIFICATIONS (Android 13+), затем регистрация устройства.
 * Возвращает итоговое разрешение.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  let permission: PushPermission = 'undetermined';
  try {
    const settings = await notifee.requestPermission({
      alert: true,
      badge: true,
      sound: true,
    });
    permission = mapAuthorizationStatus(settings?.authorizationStatus);
  } catch (e) {
    warn('requestPermission failed', e);
    permission = 'denied';
  }
  store.dispatch(setPushPermission(permission));
  if (permission === 'granted') {
    await registerPushDevice();
  }
  return permission;
}

/** Открыть системные настройки уведомлений приложения. */
export async function openSystemNotificationSettings(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await notifee.openNotificationSettings();
      return;
    }
    await Linking.openSettings();
  } catch (e) {
    warn('openSettings failed', e);
  }
}

// ---------------------------------------------------------------------------
// Устройство
// ---------------------------------------------------------------------------

function randomId(): string {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${Platform.OS}-${Date.now().toString(36)}-${a}${b}`;
}

/** Стабильный id установки (VoipService в качестве deviceId использует FCM-токен — он меняется). */
export async function getPushDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(PUSH_STORAGE_DEVICE_ID);
    if (existing) return existing;
  } catch {
    /* ignore */
  }
  const created = randomId();
  try {
    await AsyncStorage.setItem(PUSH_STORAGE_DEVICE_ID, created);
  } catch {
    /* ignore */
  }
  return created;
}

/** Имя устройства без персональных данных (react-native-device-info в проекте нет). */
export function getDeviceName(): string {
  if (Platform.OS === 'ios') {
    return (Platform as {isPad?: boolean}).isPad ? 'iPad' : 'iPhone';
  }
  const constants = (Platform as {constants?: {Brand?: string; Model?: string}}).constants || {};
  const name = [constants.Brand, constants.Model].filter(Boolean).join(' ').trim();
  return name || 'Android';
}

function getLocale(): string {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings || {};
      const locale: string | undefined =
        settings.AppleLocale || (Array.isArray(settings.AppleLanguages) ? settings.AppleLanguages[0] : undefined);
      if (locale) return String(locale).slice(0, 2).toLowerCase();
    } else {
      const locale: string | undefined = NativeModules.I18nManager?.localeIdentifier;
      if (locale) return String(locale).slice(0, 2).toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return 'ru';
}

export function getAppVersion(): string {
  return packageJson?.version || '0.0.0';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * iOS: FCM getToken needs an APNs token (firebase-ios-sdk ≥ 10.4).
 * After registerDeviceForRemoteMessages, APNs can arrive a few hundred ms later.
 */
async function waitForApnsToken(timeoutMs = 12000): Promise<string | null> {
  if (Platform.OS !== 'ios') return 'ok';
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const apns = await messaging().getAPNSToken();
      if (apns) {
        log('APNs token ready');
        return apns;
      }
    } catch (e) {
      warn('getAPNSToken', e);
    }
    await sleep(400);
  }
  warn('APNs token not available within timeout');
  return null;
}

/**
 * If GoogleService-Info / google-services.json project changed, drop the stale FCM token
 * (old sender id tokens are rejected by the new Firebase project).
 */
async function invalidateTokenIfFirebaseProjectChanged(): Promise<void> {
  let previous: string | null = null;
  try {
    previous = await AsyncStorage.getItem(PUSH_STORAGE_GCM_SENDER);
  } catch {
    previous = null;
  }
  if (previous && previous !== FIREBASE_GCM_SENDER_ID) {
    log('Firebase project changed', previous, '→', FIREBASE_GCM_SENDER_ID, '— refreshing FCM token');
    try {
      await messaging().deleteToken();
    } catch (e) {
      warn('deleteToken after project change failed', e);
    }
    try {
      await AsyncStorage.removeItem(PUSH_STORAGE_TOKEN);
    } catch {
      /* ignore */
    }
  }
  try {
    await AsyncStorage.setItem(PUSH_STORAGE_GCM_SENDER, FIREBASE_GCM_SENDER_ID);
  } catch {
    /* ignore */
  }
}

async function getFcmToken(): Promise<string | null> {
  try {
    await invalidateTokenIfFirebaseProjectChanged();

    if (Platform.OS === 'ios') {
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        log('registerDeviceForRemoteMessages…');
        await messaging().registerDeviceForRemoteMessages();
      }
      const apns = await waitForApnsToken();
      if (!apns) {
        warn('register aborted: no APNs token (check Push capability / aps-environment / physical device)');
        return null;
      }
    }

    let token = await messaging().getToken();
    if (token) return token;

    // One recovery path: delete + re-fetch (helps after plist swap / corrupted cache)
    warn('empty FCM token — deleteToken + retry');
    try {
      await messaging().deleteToken();
    } catch {
      /* ignore */
    }
    if (Platform.OS === 'ios') {
      const apns = await waitForApnsToken(8000);
      if (!apns) return null;
    }
    token = await messaging().getToken();
    return token || null;
  } catch (e) {
    warn('getToken failed', e);
    try {
      await messaging().deleteToken();
      if (Platform.OS === 'ios') {
        if (!messaging().isDeviceRegisteredForRemoteMessages) {
          await messaging().registerDeviceForRemoteMessages();
        }
        const apns = await waitForApnsToken(8000);
        if (!apns) return null;
      }
      const token = await messaging().getToken();
      return token || null;
    } catch (e2) {
      warn('getToken retry failed', e2);
      return null;
    }
  }
}

/**
 * POST /api/push/devices — после входа, при смене токена и после выдачи разрешения.
 * Токен кэшируется в AsyncStorage (push:token) только после успешной регистрации.
 */
export function registerPushDevice(): Promise<boolean> {
  if (registering) return registering;
  registering = (async () => {
    try {
      const accessToken = store.getState().auth?.accessToken;
      if (!accessToken) {
        log('register skipped: not logged in');
        return false;
      }
      const token = await getFcmToken();
      if (!token) {
        warn('register skipped: no FCM token (check APNs / Firebase / google-services)');
        return false;
      }
      const deviceId = await getPushDeviceId();
      const response = await apiRegisterPushDevice({
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        channel: 'fcm',
        token,
        deviceId,
        deviceName: getDeviceName(),
        appVersion: getAppVersion(),
        locale: getLocale(),
      });
      try {
        await AsyncStorage.setItem(PUSH_STORAGE_TOKEN, token);
      } catch {
        /* ignore */
      }
      store.dispatch(setPushRegistered(true));
      if (typeof response?.unread === 'number') {
        store.dispatch(setUnread(response.unread));
      }
      log('device registered', `…${token.slice(-8)}`);
      return true;
    } catch (e) {
      warn('register failed', (e as Error)?.message || e);
      return false;
    } finally {
      registering = null;
    }
  })();
  return registering;
}

/**
 * DELETE /api/push/devices {token} — при логауте / выключении push на устройстве.
 * Дожидаемся запроса (или ~3 с таймаута), чтобы DELETE ушёл с Bearer текущего пользователя
 * до того, как logoutReducer сбросит auth; ошибки самого запроса не пробрасываем.
 */
export async function unregisterPushDevice(): Promise<void> {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(PUSH_STORAGE_TOKEN);
  } catch {
    token = null;
  }
  if (!token) {
    try {
      token = await messaging().getToken();
    } catch {
      token = null;
    }
  }
  if (token) {
    const request = apiUnregisterPushDevice(token).catch(e => warn('unregister failed', (e as Error)?.message || e));
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 3000));
    await Promise.race([request, timeout]).catch(() => {});
  }
  try {
    await AsyncStorage.removeItem(PUSH_STORAGE_TOKEN);
  } catch {
    /* ignore */
  }
  store.dispatch(setPushRegistered(false));
}

// ---------------------------------------------------------------------------
// Android-каналы
// ---------------------------------------------------------------------------

/** Каналы notifee (VoipService использует свой 'totus-call-channel' — не пересекаемся). */
export function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelsReady) {
    channelsReady = notifee
      .createChannels(
        ANDROID_CHANNELS.map(channel => ({
          id: channel.id,
          name: channel.name,
          importance: channel.importance === 'high' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
        })),
      )
      .catch(e => {
        channelsReady = null;
        warn('createChannels failed', e);
      });
  }
  return channelsReady || Promise.resolve();
}

// ---------------------------------------------------------------------------
// Показ в foreground
// ---------------------------------------------------------------------------

function toStringMap(data: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value === null || value === undefined) return;
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  });
  return out;
}

export function isSupportChatScreenOpen(): boolean {
  try {
    if (!navigationRef.isReady()) return false;
    return navigationRef.getCurrentRoute()?.name === SUPPORT_CHAT_ROUTE;
  } catch {
    return false;
  }
}

/** Элемент списка из data пуша (для мгновенного появления в центре уведомлений). */
export function notificationItemFromPush(data: PushMessageData | null | undefined): NotificationItem | null {
  if (!data) return null;
  const id = Number(data.notificationId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const type = String(data.type || 'system');
  return {
    id,
    type,
    category: categoryForType(type),
    title: String(data.title || ''),
    body: String(data.body || ''),
    data: {
      route: data.route ? String(data.route) : undefined,
      orderId: data.orderId != null ? String(data.orderId) : undefined,
      chatId: data.chatId != null ? String(data.chatId) : undefined,
      url: data.url ? String(data.url) : undefined,
      notificationId: String(id),
    },
    source: 'push',
    readAt: null,
    openedAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Local banner while the app is open (FCM does not show a system alert in foreground).
 * Background / killed: do NOT display locally — OS shows the FCM `notification` payload.
 * One banner only: firebase.json has no foreground banner/sound; plus short dedupe.
 */
export async function displayForegroundNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | {data?: Record<string, unknown>; notification?: {title?: string; body?: string}} | null | undefined,
): Promise<void> {
  const data = (remoteMessage?.data || {}) as PushMessageData;
  const title = remoteMessage?.notification?.title || (data.title ? String(data.title) : '') || 'Totus Club';
  const body = remoteMessage?.notification?.body || (data.body ? String(data.body) : '');

  const item = notificationItemFromPush(data);
  if (item) store.dispatch(notificationReceived(item));

  // Background / inactive → native FCM tray already (or will) show the push.
  if (AppState.currentState !== 'active') {
    log('skip local banner (background/closed — system FCM)', AppState.currentState);
    return;
  }

  if (data.type === 'support_message' && isSupportChatScreenOpen()) {
    return;
  }

  const notificationId =
    data.notificationId != null && String(data.notificationId) !== ''
      ? String(data.notificationId)
      : '';
  const dedupeKey = notificationId || `${String(data.type || '')}:${title}:${body}`;
  if (shouldSkipDuplicateBanner(dedupeKey)) {
    log('skip duplicate local banner', dedupeKey);
    return;
  }

  try {
    await ensureAndroidChannels();
    await notifee.displayNotification({
      // Stable id → same hub notification replaces itself instead of stacking a 2nd banner.
      ...(notificationId ? {id: `hub-${notificationId}`} : {}),
      title,
      body,
      data: toStringMap(data),
      android: {
        channelId: channelForType(data.type),
        pressAction: {id: 'default'},
        // smallIcon не указываем: ресурса ic_notification в проекте нет — notifee возьмёт иконку приложения.
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          banner: true,
          list: true,
          sound: true,
          badge: true,
        },
      },
    });
  } catch (e) {
    warn('displayNotification failed', e);
  }
}

const recentBannerKeys = new Map<string, number>();
const BANNER_DEDUPE_MS = 4000;

function shouldSkipDuplicateBanner(key: string): boolean {
  if (!key) return false;
  const now = Date.now();
  for (const [k, at] of recentBannerKeys) {
    if (now - at > BANNER_DEDUPE_MS) recentBannerKeys.delete(k);
  }
  const prev = recentBannerKeys.get(key);
  if (prev && now - prev < BANNER_DEDUPE_MS) return true;
  recentBannerKeys.set(key, now);
  return false;
}

// ---------------------------------------------------------------------------
// Тап по уведомлению
// ---------------------------------------------------------------------------

function isHttpUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function toOrderId(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : String(value);
}

/**
 * Deep link по data.route (API.md §2). Навигация — через корневой navigationRef
 * (экран 'tab' → вкладка → вложенный экран), как OrdersStackScreen/orderDetails из чата;
 * `initial: false` — чтобы под экраном оставался корень вкладки (назад → список/аккаунт).
 */
export function handleNotificationPress(data: PushMessageData | null | undefined): void {
  const payload = (data || {}) as PushMessageData;
  const route = String(payload.route || '');
  const orderId = toOrderId(payload.orderId);

  switch (route) {
    case 'order':
    case 'documents':
    case 'order_request':
      if (orderId != null) {
        navigateRoot('tab', {
          screen: 'OrdersStackScreen',
          params: {screen: 'orderDetails', params: {orderId}, initial: false},
        });
      } else {
        navigateRoot('tab', {screen: 'OrdersStackScreen', params: {screen: 'orders'}});
      }
      break;
    case 'orders':
      navigateRoot('tab', {screen: 'OrdersStackScreen', params: {screen: 'orders'}});
      break;
    case 'support_chat':
      navigateRoot('tab', {
        screen: 'AccountStackScreen',
        params: {screen: SUPPORT_CHAT_ROUTE, initial: false},
      });
      break;
    case 'account':
      // Экран «Аккаунт» (корень стека), а не список уведомлений — missed_call/support маршрут account
      // должен просто открыть вкладку «Аккаунт» (API.md §2, §7).
      navigateRoot('tab', {screen: 'AccountStackScreen'});
      break;
    case 'notifications':
      navigateRoot('tab', {
        screen: 'AccountStackScreen',
        params: {screen: NOTIFICATIONS_ROUTE, initial: false},
      });
      break;
    case 'url':
      if (isHttpUrl(payload.url)) {
        Linking.openURL(payload.url).catch(e => warn('openURL failed', e));
      } else {
        navigateRoot('tab', {screen: 'HomeStackScreen', params: {screen: 'home'}});
      }
      break;
    case 'search':
    case 'home':
    default:
      navigateRoot('tab', {screen: 'HomeStackScreen', params: {screen: 'home'}});
      break;
  }

  const notificationId = Number(payload.notificationId);
  if (Number.isFinite(notificationId) && notificationId > 0) {
    store.dispatch(markReadLocal(notificationId));
    markNotificationOpened(notificationId).catch(() => undefined);
  }
  store.dispatch(refreshUnread());
}

/** Тап в фоне (index.js → notifee.onBackgroundEvent): сохраняем data, обрабатываем в PushBridge. */
export async function savePendingPress(data: Record<string, unknown> | null | undefined): Promise<void> {
  if (!data) return;
  try {
    await AsyncStorage.setItem(PUSH_STORAGE_PENDING_PRESS, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Забрать и удалить сохранённый тап (push:pendingPress). */
export async function takePendingPress(): Promise<PushMessageData | null> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_STORAGE_PENDING_PRESS);
    if (!raw) return null;
    await AsyncStorage.removeItem(PUSH_STORAGE_PENDING_PRESS);
    return JSON.parse(raw) as PushMessageData;
  } catch {
    return null;
  }
}

/** Обработчик для notifee.onBackgroundEvent (регистрируется в index.js). */
export async function handleNotifeeBackgroundEvent({type, detail}: NotifeeEvent): Promise<void> {
  if (type === EventType.PRESS) {
    await savePendingPress(detail?.notification?.data as Record<string, unknown> | undefined);
  }
}

function isHubMessage(data: Record<string, unknown> | null | undefined): boolean {
  if (!data || !data.type) return false;
  if (data.type === 'incoming_call') return false;
  return !(data.callId || data.callUUID || data.uuid);
}

/**
 * Холодный старт / фон → тап. Обрабатываем после готовности navigationRef.
 * Возвращает true, если тап был.
 */
export async function processInitialNotification(): Promise<boolean> {
  let data: PushMessageData | null = null;

  try {
    const initial = await notifee.getInitialNotification();
    if (initial?.notification?.data) data = initial.notification.data as PushMessageData;
  } catch {
    /* ignore */
  }
  if (!data) {
    try {
      const initial = await messaging().getInitialNotification();
      if (initial?.data && isHubMessage(initial.data)) data = initial.data as PushMessageData;
    } catch {
      /* ignore */
    }
  }
  if (!data) data = await takePendingPress();
  if (!data) return false;

  await waitForNavigation();
  handleNotificationPress(data);
  return true;
}

function waitForNavigation(timeoutMs = 8000): Promise<void> {
  return new Promise(resolve => {
    const started = Date.now();
    const tick = () => {
      if (navigationRef.isReady() || Date.now() - started > timeoutMs) {
        resolve();
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  });
}

// ---------------------------------------------------------------------------
// Инициализация (один раз из PushBridge)
// ---------------------------------------------------------------------------

export function initPushHandlers(): void {
  if (handlersInitialized) return;
  handlersInitialized = true;

  void ensureAndroidChannels();

  // Тап по баннеру notifee, когда приложение открыто.
  unsubscribeForeground = notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      handleNotificationPress(detail?.notification?.data as PushMessageData | undefined);
    }
  });

  // Тап по системному уведомлению FCM (фон → открытие).
  unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    const data = remoteMessage?.data as Record<string, unknown> | undefined;
    if (isHubMessage(data)) handleNotificationPress(data as PushMessageData);
  });

  // Смена FCM-токена → перерегистрация в хабе.
  unsubscribeTokenRefresh = messaging().onTokenRefresh(() => {
    void registerPushDevice();
  });

  // iOS: foreground-сообщения (звонки идут через PushKit и сюда не приходят).
  // Android: onMessage регистрирует CallService.js и передаёт нам не-звонковые пуши.
  if (Platform.OS === 'ios') {
    unsubscribeIosMessage = messaging().onMessage(async remoteMessage => {
      const data = remoteMessage?.data as Record<string, unknown> | undefined;
      if (!isHubMessage(data)) return;
      await displayForegroundNotification(remoteMessage);
    });
  }
}

export function teardownPushHandlers(): void {
  unsubscribeForeground?.();
  unsubscribeOpened?.();
  unsubscribeTokenRefresh?.();
  unsubscribeIosMessage?.();
  unsubscribeForeground = null;
  unsubscribeOpened = null;
  unsubscribeTokenRefresh = null;
  unsubscribeIosMessage = null;
  handlersInitialized = false;
}
