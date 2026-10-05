/** Native call UI sync (Android: androidCallUi.ts / TotusCallManager.kt). No-ops on iOS. */
import {endAndroidRemoteCall, stopAndroidCallUi, syncAndroidIncomingCall} from './androidCallUi';

/** Android: the call ended elsewhere — only this call's ringing / notification / Telecom call. */
export function nativeEndRemoteCall(callId: string): void {
  endAndroidRemoteCall(callId);
}

export async function nativeStopVoipService(): Promise<void> {
  stopAndroidCallUi();
}

/**
 * Called by VoipService.pushNativeConnectionStatus (Android only):
 * (callId, connectionState, iceConnectionState, isConnecting, isConnected, isIncoming, isOutgoing, callerName)
 */
export async function nativeUpdateConnectionStatus(
  ...args: unknown[]
): Promise<void> {
  const [callId, , , , , isIncoming, , callerName] = args;
  if (typeof callId !== 'string' || !callId) {
    return;
  }
  syncAndroidIncomingCall(callId, Boolean(isIncoming), typeof callerName === 'string' ? callerName : null);
}
