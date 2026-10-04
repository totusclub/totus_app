// Android call UI (owner decision 04.10.2026): own incoming-call notification / ringing and a
// microphone foreground service during the call, instead of the system Telecom screen of
// CallKeep. Native side: android/.../TotusCallManager.kt (NativeModules.TotusCall).
// On iOS (and in tests without the native module) every function is a no-op.
import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';

export type AndroidCallAction = {
  action: 'answer' | 'show' | 'open' | string;
  callId: string;
  callerName?: string;
};

const ACTION_AVAILABLE_EVENT = 'TotusCallActionAvailable';

function native(): any {
  if (Platform.OS !== 'android') {
    return null;
  }
  return (NativeModules as any)?.TotusCall || null;
}

/** Ringing (incoming) -> notification or in-app ringtone; anything else -> stop alerting. */
export function syncAndroidIncomingCall(callId: string, isIncoming: boolean, callerName?: string | null): void {
  const m = native();
  if (!m || !callId) {
    return;
  }
  try {
    m.updateCall(String(callId), Boolean(isIncoming), callerName ? String(callerName) : '');
  } catch (e) {
    console.warn('[android-call-ui] updateCall failed', e);
  }
}

export async function startAndroidOngoingCall(callId: string, callerName?: string | null): Promise<boolean> {
  const m = native();
  if (!m || !callId) {
    return false;
  }
  try {
    return Boolean(await m.startOngoing(String(callId), callerName ? String(callerName) : ''));
  } catch (e) {
    console.warn('[android-call-ui] startOngoing failed', e);
    return false;
  }
}

export function stopAndroidOngoingCall(): void {
  const m = native();
  if (!m) {
    return;
  }
  try {
    m.stopOngoing();
  } catch (e) {
    console.warn('[android-call-ui] stopOngoing failed', e);
  }
}

/** Call finished: no ringing, no notifications, no service, normal lock screen. */
export function stopAndroidCallUi(): void {
  const m = native();
  if (!m) {
    return;
  }
  try {
    m.stopAll();
  } catch (e) {
    console.warn('[android-call-ui] stopAll failed', e);
  }
}

export async function consumeAndroidCallAction(): Promise<AndroidCallAction | null> {
  const m = native();
  if (!m) {
    return null;
  }
  try {
    const a = await m.consumePendingCallAction();
    if (!a || !a.action || !a.callId) {
      return null;
    }
    return {action: String(a.action), callId: String(a.callId), callerName: a.callerName ? String(a.callerName) : ''};
  } catch (e) {
    console.warn('[android-call-ui] consumePendingCallAction failed', e);
    return null;
  }
}

/** The native side has an action from a call notification (answer / show / open). */
export function onAndroidCallActionAvailable(listener: () => void): {remove: () => void} {
  if (!native()) {
    return {remove() {}};
  }
  const sub = DeviceEventEmitter.addListener(ACTION_AVAILABLE_EVENT, listener);
  return {remove: () => sub.remove()};
}

export async function canUseAndroidFullScreenIntent(): Promise<boolean> {
  const m = native();
  if (!m) {
    return true;
  }
  try {
    return Boolean(await m.canUseFullScreenIntent());
  } catch {
    return true;
  }
}

export function openAndroidFullScreenIntentSettings(): void {
  const m = native();
  if (m) {
    try {
      m.openFullScreenIntentSettings();
    } catch {}
  }
}
