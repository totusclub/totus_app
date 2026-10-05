/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {
  answerCall as handleVoipAnswerCall,
  handleIncomingPush,
  handleBackgroundCallKeepEvent,
  registerAndroidCallBackgroundHandlers,
  registerAndroidCallActionHandlers,
  queuePendingAnswerFromBackground,
} from './src/modules/voip/CallService';
import {
  endCall as voipEndCall,
  rejectCall as voipRejectCall,
  getCallState as getVoipCallState,
  waitForAndroidCallActions,
} from './src/modules/voip/VoipService';
import notifee from '@notifee/react-native';
import {handleNotifeeBackgroundEvent} from './src/modules/push/pushService';

registerAndroidCallBackgroundHandlers();
// Android: "Ответить" / full-screen incoming / ongoing call from the Totus call notifications.
registerAndroidCallActionHandlers();

// Тап по уведомлению notifee в фоне/после закрытия: data → AsyncStorage push:pendingPress,
// обработка (deep link) — в PushBridge при следующем активном состоянии.
notifee.onBackgroundEvent(handleNotifeeBackgroundEvent);

// CallKeep headless hook for Android killed/background process.
// RNCallKeepBackgroundMessagingService triggers this task name.
AppRegistry.registerHeadlessTask(
  'RNCallKeepBackgroundMessage',
  () => async message => {
    console.log('[VOIP_PUSH_ANDROID] headless_task_started', {
      hasData: !!message?.data,
      eventName: message?.name || message?.data?.name || null,
      callId:
        message?.data?.callId ||
        message?.data?.callUUID ||
        message?.data?.uuid ||
        null,
    });
    await handleBackgroundCallKeepEvent(message);
    await handleIncomingPush(message, 'RNCallKeepBackgroundMessage');
  },
);

AppRegistry.registerHeadlessTask(
  'TotusVoipActionTask',
  () => async payload => {
    const action = payload?.action || '';
    let callId = payload?.callId || '';
    const payloadJson = payload?.payloadJson || '';
    if (!action) {
      return;
    }
    if (!callId && payloadJson) {
      try {
        const parsed = JSON.parse(payloadJson);
        callId = parsed?.callId || parsed?.callUUID || parsed?.uuid || '';
      } catch (_) {}
    }
    if (action === 'com.totus.com.voip.INCOMING_PUSH') {
      let dataPayload = {};
      if (payloadJson) {
        try {
          dataPayload = JSON.parse(payloadJson);
        } catch (e) {
          console.warn('[VOIP_PUSH_ANDROID] incoming_prepare_payload_parse_failed', e);
        }
      }
      await handleIncomingPush(
        {data: dataPayload},
        'TotusVoipActionTask:incoming_prepare',
      );
      return;
    }
    if (action === 'com.totus.com.voip.ANSWER' && callId) {
      queuePendingAnswerFromBackground(callId);
      await handleVoipAnswerCall(callId);
      return;
    }
    // Android notification actions (TotusCallActionReceiver): "Отклонить" / "Завершить".
    if (action === 'com.totus.com.voip.REJECT' && callId) {
      voipRejectCall(callId);
      await waitForAndroidCallActions();
      return;
    }
    if (action === 'com.totus.com.voip.END' && callId) {
      const state = getVoipCallState();
      if (state.callUUID && state.callUUID !== callId) {
        return; // another call is active now
      }
      if (state.state === 'ringing') {
        voipRejectCall(callId);
      } else {
        voipEndCall();
      }
      await waitForAndroidCallActions();
    }
  },
);

AppRegistry.registerComponent(appName, () => App);
