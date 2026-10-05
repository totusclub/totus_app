import {AppState, DeviceEventEmitter, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {
  initVoipAndCallKeep,
  handleAndroidIncomingCallNotification,
  answerCall as voipAnswerCall,
  endCall as voipEndCall,
  rejectCall as voipRejectCall,
  queuePendingAnswerFromBackground,
  getCallState,
  setAndroidPendingCallerName,
  handleRemoteCallEnded,
} from './VoipService';
import {consumeAndroidCallAction, onAndroidCallActionAvailable} from './androidCallUi';
import {ensureAndroidMicPermission} from './androidCallPermissions';
import {
  displayForegroundNotification,
  isSupportChatScreenOpen,
} from '../push/pushService';

let androidMessagingHandlersRegistered = false;
let androidVoipInitialized = false;

// Пуш чата с поддержкой (calling_api_v2): data.type === 'support_message'.
// В фоне ничего не показываем сами — FCM `notification` отрисовывает система.
// В foreground сообщаем в приложение (SupportSocketBridge → счётчик непрочитанных).
const SUPPORT_PUSH_EVENT = 'support:push';

function isSupportMessage(data) {
  return Boolean(data) && data.type === 'support_message';
}

// Любой пуш хаба уведомлений (data.type задан, не звонок): в foreground показываем
// баннер через notifee (pushService), в фоне ничего не делаем — `notification` рисует система.
function isHubNotificationMessage(data) {
  return Boolean(data) && Boolean(data.type) && !isIncomingCallMessage(data) && !isCallEndedMessage(data);
}

// Отменяющий push звонка (calling_api_v2, CALL_END_SYNC_RU.md): звонок закончился на другом
// устройстве / у звонящего. data: {type: 'call_ended', callId, reason}. Не входящий и не баннер.
function isCallEndedMessage(data) {
  return Boolean(data) && data.type === 'call_ended';
}

function handleCallEndedMessage(data) {
  handleRemoteCallEnded(data.callId || data.callUUID || data.uuid || null, data.reason || null);
}

function isIncomingCallMessage(data) {
  if (!data) {
    return false;
  }
  if (isCallEndedMessage(data)) {
    return false;
  }
  if (data.type === 'incoming_call') {
    return true;
  }
  return Boolean(data.callId || data.callUUID || data.uuid);
}

function ensureAndroidVoipReady(loyaltyId) {
  if (Platform.OS !== 'android' || androidVoipInitialized) {
    return;
  }
  initVoipAndCallKeep(loyaltyId);
  androidVoipInitialized = true;
}

function normalizeIncomingPayload(data) {
  if (!data) {
    return null;
  }

  const uuid = data.uuid || data.callUUID || data.callId;
  if (!uuid) {
    return null;
  }

  return {
    uuid: String(uuid),
    handle: data.handle || data.fromDevice || data.from || 'Unknown',
    callerName: data.callerName || data.caller_name || 'Incoming Call',
    toLoyaltyId: data.toLoyaltyId || data.toUserId || null,
    offerSdp: data.offerSdp || null,
    offerType: data.offerType || null,
  };
}

export function registerAndroidCallBackgroundHandlers() {
  if (Platform.OS !== 'android' || androidMessagingHandlersRegistered) {
    return;
  }

  try {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      const data = remoteMessage?.data;
      if (isCallEndedMessage(data)) {
        handleCallEndedMessage(data);
        return;
      }
      if (isSupportMessage(data) || isHubNotificationMessage(data)) {
        return;
      }
      if (isIncomingCallMessage(data)) {
        await displayIncomingCall(data);
      }
    });

    messaging().onMessage(async remoteMessage => {
      const data = remoteMessage?.data;
      if (isCallEndedMessage(data)) {
        handleCallEndedMessage(data);
        return;
      }
      if (isSupportMessage(data)) {
        DeviceEventEmitter.emit(SUPPORT_PUSH_EVENT, data);
        if (!isSupportChatScreenOpen()) {
          await displayForegroundNotification(remoteMessage);
        }
        return;
      }
      if (isHubNotificationMessage(data)) {
        await displayForegroundNotification(remoteMessage);
        return;
      }
      if (isIncomingCallMessage(data)) {
        await displayIncomingCall(data);
      }
    });
  } catch (e) {
    console.warn(
      '[firebase] Default app is not configured. Add android/app/google-services.json and rebuild.',
      e?.message || e,
    );
    return;
  }

  androidMessagingHandlersRegistered = true;
}

export async function initCallKeep(loyaltyId) {
  if (Platform.OS === 'android') {
    ensureAndroidVoipReady(loyaltyId);
    registerAndroidCallBackgroundHandlers();
    return;
  }
  initVoipAndCallKeep(loyaltyId);
}

export async function displayIncomingCall(data) {
  if (Platform.OS !== 'android') {
    return;
  }

  const normalized = normalizeIncomingPayload(data);
  if (!normalized) {
    return;
  }
  ensureAndroidVoipReady();

  // Android (owner decision 04.10.2026): no system Telecom screen. Setting the "ringing" state
  // syncs the native Totus call UI: notification with full-screen intent when the app is not on
  // screen (killed / background / lock screen), ringtone + CallModal when it is.
  await handleAndroidIncomingCallNotification({
    ...data,
    uuid: normalized.uuid,
    callId: normalized.uuid,
    callerName: normalized.callerName,
    handle: normalized.handle,
    toLoyaltyId: normalized.toLoyaltyId,
    offerSdp: normalized.offerSdp,
    offerType: normalized.offerType,
  }, {skipNativeDisplay: true});
}

export async function answerCall(callUUID) {
  if (Platform.OS !== 'android') {
    return;
  }
  ensureAndroidVoipReady();
  await voipAnswerCall(callUUID);
}

export function endCall(callUUID) {
  if (Platform.OS !== 'android') {
    return;
  }
  ensureAndroidVoipReady();

  if (callUUID) {
    voipRejectCall(callUUID);
    return;
  }
  voipEndCall();
}

export async function handleBackgroundCallKeepEvent(message) {
  if (Platform.OS !== 'android' || !message) {
    return;
  }

  const eventName = message?.name || message?.data?.name || '';
  const callUUID =
    message?.callUUID ||
    message?.data?.callUUID ||
    message?.data?.callId ||
    message?.callId ||
    null;

  if (!eventName || !callUUID) {
    return;
  }

  if (
    eventName === 'RNCallKeepPerformAnswerCallAction' ||
    eventName === 'answerCall'
  ) {
    // Legacy CallKeep event (CallKeep is not used on Android any more).
    ensureAndroidVoipReady();
    queuePendingAnswerFromBackground(callUUID);
    return;
  }

  if (
    eventName === 'RNCallKeepPerformEndCallAction' ||
    eventName === 'endCall'
  ) {
    endCall(callUUID);
  }
}

/**
 * Headless / background FCM entry (index.js CallKeep tasks).
 * Hub notifications (orders/support/promo): system tray shows FCM `notification` payload.
 * Incoming call: hand off to CallKeep display flow.
 */
export async function handleIncomingPush(message, source = 'unknown') {
  try {
    const data = message?.data || message || null;
    console.log('[push/voip] handleIncomingPush', source, {
      type: data?.type || null,
      hasCallId: Boolean(data?.callId || data?.callUUID || data?.uuid),
    });
    if (!data) return;

    if (isCallEndedMessage(data)) {
      handleCallEndedMessage(data);
      return;
    }

    if (isSupportMessage(data) || isHubNotificationMessage(data)) {
      // Background: OS already displays notification payload. Foreground path is onMessage.
      return;
    }

    if (isIncomingCallMessage(data)) {
      await displayIncomingCall(data);
    }
  } catch (e) {
    console.warn('[push/voip] handleIncomingPush failed', source, e?.message || e);
  }
}

/** Re-export for index.js headless answer flow. */
export {queuePendingAnswerFromBackground};

// ---------------------------------------------------------------------------
// Android: actions from the Totus call notifications that open the app
// ("Ответить", full-screen incoming over the lock screen, tap on the ongoing call).
// "Отклонить" / "Завершить" do not open the app: TotusVoipActionTask (index.js).
// ---------------------------------------------------------------------------
let androidCallActionsRegistered = false;
let androidCallActionRunning = false;

function waitForAppActive(timeoutMs) {
  if (AppState.currentState === 'active') {
    return Promise.resolve(true);
  }
  return new Promise(resolve => {
    let done = false;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && !done) {
        done = true;
        sub.remove();
        resolve(true);
      }
    });
    setTimeout(() => {
      if (!done) {
        done = true;
        sub.remove();
        resolve(AppState.currentState === 'active');
      }
    }, timeoutMs);
  });
}

async function handleAndroidCallAction(action) {
  if (!action || !action.callId) {
    return;
  }
  ensureAndroidVoipReady();
  const {callId, callerName} = action;
  setAndroidPendingCallerName(callId, callerName);
  if (action.action !== 'answer') {
    // 'show' / 'open': the CallModal follows the call state by itself.
    return;
  }
  const state = getCallState();
  if (state.callUUID === callId && state.state === 'answered') {
    return; // already answering / answered
  }
  // The permission prompt needs the activity on screen.
  await waitForAppActive(5000);
  const hasMic = await ensureAndroidMicPermission();
  if (!hasMic) {
    console.warn('[android-call] answer: no microphone permission, declining', callId);
    voipRejectCall(callId);
    return;
  }
  const fresh = getCallState();
  if (fresh.state === 'ringing' && fresh.callUUID === callId) {
    await voipAnswerCall(callId);
  } else {
    // JS was restarted (no ringing state in memory): answer through the pending-answer path
    // (offer from the server, socket, device id).
    queuePendingAnswerFromBackground(callId);
  }
}

async function drainAndroidCallActions() {
  if (androidCallActionRunning) {
    return;
  }
  androidCallActionRunning = true;
  try {
    for (let i = 0; i < 3; i++) {
      const action = await consumeAndroidCallAction();
      if (!action) {
        break;
      }
      try {
        await handleAndroidCallAction(action);
      } catch (e) {
        console.warn('[android-call] action failed', action.action, e?.message || e);
      }
    }
  } finally {
    androidCallActionRunning = false;
  }
}

export function registerAndroidCallActionHandlers() {
  if (Platform.OS !== 'android' || androidCallActionsRegistered) {
    return;
  }
  androidCallActionsRegistered = true;
  onAndroidCallActionAvailable(() => {
    drainAndroidCallActions();
  });
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      drainAndroidCallActions();
    }
  });
  drainAndroidCallActions();
}
