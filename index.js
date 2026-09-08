/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {
  answerCall as handleVoipAnswerCall,
  endCall as handleVoipEndCall,
  handleIncomingPush,
  handleBackgroundCallKeepEvent,
  registerAndroidCallBackgroundHandlers,
  queuePendingAnswerFromBackground,
} from './src/modules/voip/CallService';
import notifee from '@notifee/react-native';
import {handleNotifeeBackgroundEvent} from './src/modules/push/pushService';

registerAndroidCallBackgroundHandlers();

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
    if ((action === 'com.totus.com.voip.REJECT' || action === 'com.totus.com.voip.END') && callId) {
      handleVoipEndCall(callId);
    }
  },
);

AppRegistry.registerComponent(appName, () => App);
