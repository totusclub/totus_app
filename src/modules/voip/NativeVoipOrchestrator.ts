/** Native VoIP orchestrator stubs (Android-focused). */

export async function nativeStopVoipService(): Promise<void> {
  // no-op when native module is unavailable
}

export async function nativeUpdateConnectionStatus(
  ..._args: unknown[]
): Promise<void> {
  // no-op when native module is unavailable
}
