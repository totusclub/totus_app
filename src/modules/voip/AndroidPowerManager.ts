/** Android battery / power prompts — no-ops on iOS. */

export async function ensureAndroidBatteryOptimizationHandled(): Promise<void> {
  // no-op on iOS
}

export async function maybePromptAndroidVoipPowerSetup(
  _reason?: string,
): Promise<void> {
  // no-op on iOS
}
