// Android: microphone permission only when the user starts or answers a call (owner decision
// 03.10.2026: no permission prompts at first launch). iOS: always true here (micPermission.ts).
import {AppState, PermissionsAndroid, Platform} from 'react-native';

function showMicSettingsAlert(): void {
  try {
    // Loaded lazily: Alert / Linking are only needed on this rare path.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {Alert, Linking} = require('react-native');
    Alert.alert(
      'Нет доступа к микрофону',
      'Чтобы разговаривать, разрешите Totus Club доступ к микрофону в настройках телефона.',
      [
        {text: 'Не сейчас', style: 'cancel'},
        {text: 'Открыть настройки', onPress: () => Linking.openSettings()},
      ],
    );
  } catch (e) {
    console.warn('[mic] settings alert failed', e);
  }
}

/**
 * true -> RECORD_AUDIO granted. Asks only while the app is on screen (a prompt cannot be
 * shown from the background); after "Don't ask again" offers the system settings.
 */
export async function ensureAndroidMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  try {
    if (await PermissionsAndroid.check(perm)) {
      return true;
    }
  } catch {
    // fall through to the request
  }
  if (AppState.currentState !== 'active') {
    return false;
  }
  try {
    const result = await PermissionsAndroid.request(perm, {
      title: 'Доступ к микрофону',
      message: 'Микрофон нужен, чтобы разговаривать со службой поддержки Totus Club.',
      buttonPositive: 'Разрешить',
      buttonNegative: 'Не сейчас',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showMicSettingsAlert();
    }
    return false;
  } catch (e) {
    console.warn('[mic] request failed', e);
    return false;
  }
}
