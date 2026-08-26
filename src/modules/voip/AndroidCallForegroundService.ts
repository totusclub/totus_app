/** Android-only no-ops on iOS. */

export async function startAndroidCallForegroundService(
  _callUUID?: string,
  _title?: string,
): Promise<void> {
  // no-op on iOS
}

export async function stopAndroidCallForegroundService(): Promise<void> {
  // no-op on iOS
}
