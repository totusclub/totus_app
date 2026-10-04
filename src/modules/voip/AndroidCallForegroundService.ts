/** Android: microphone foreground service for a call in progress. No-ops on iOS. */
import {startAndroidOngoingCall, stopAndroidOngoingCall} from './androidCallUi';

export async function startAndroidCallForegroundService(
  callUUID?: string,
  title?: string,
): Promise<void> {
  if (!callUUID) {
    return;
  }
  await startAndroidOngoingCall(callUUID, title || '');
}

export async function stopAndroidCallForegroundService(): Promise<void> {
  stopAndroidOngoingCall();
}
