import {DeviceEventEmitter, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import RNCallKeep from 'react-native-callkeep';
import {
  initVoipAndCallKeep,
  handleAndroidIncomingCallNotification,
  answerCall as voipAnswerCall,
  endCall as voipEndCall,
  rejectCall as voipRejectCall,
  queuePendingAnswerFromBackground,
} from './VoipService';
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
  return Boolean(data) && Boolean(data.type) && !isIncomingCallMessage(data);
}

function isIncomingCallMessage(data) {
  if (!data) {
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

function bringAndroidAppToForeground(reason) {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    const callKeepAny = RNCallKeep;
    if (typeof callKeepAny?.backToForeground === 'function') {
      callKeepAny.backToForeground();
      console.log(`Android: app moved to foreground (${reason})`);
    }
  } catch (e) {
    console.warn('Android: failed to bring app to foreground', e);
  }
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

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    const data = remoteMessage?.data;
    if (isSupportMessage(data) || isHubNotificationMessage(data)) {
      return;
    }
    if (isIncomingCallMessage(data)) {
      await displayIncomingCall(data);
    }
  });

  messaging().onMessage(async remoteMessage => {
    const data = remoteMessage?.data;
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

  // Explicit Android incoming UI trigger requested for CallKeep.
  let didShowNativeIncoming = false;
  try {
    RNCallKeep.displayIncomingCall(
      normalized.uuid,
      normalized.handle || 'Unknown',
      normalized.callerName || 'Incoming Call',
      'generic',
      true,
    );
    didShowNativeIncoming = true;
  } catch (e) {
    console.warn('Android: failed to show native incoming call UI', e);
  }

  // Fallback for devices/ROMs where incoming CallKeep UI is not shown:
  // bring the app to foreground so custom modal can be shown.
  if (!didShowNativeIncoming) {
    bringAndroidAppToForeground('incoming-call-fallback');
  }

  // Keep VoIP/WebRTC state synchronized with native CallKeep UI.
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
    // In killed/locked state, avoid duplicating native answer flow.
    // Queue answer explicitly so JS side always continues WebRTC flow.
    ensureAndroidVoipReady();
    queuePendingAnswerFromBackground(callUUID);
    bringAndroidAppToForeground('background-answer-event');
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

