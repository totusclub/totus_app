/** Last bottom-tab the user was on before opening Totus AI. */
let lastNonAiTab = 'HomeStackScreen';

const AI_TAB = 'VoiceAssistantStackScreen';

export function rememberNonAiTab(routeName: string | undefined | null) {
  if (!routeName || routeName === AI_TAB) return;
  lastNonAiTab = routeName;
}

export function getAiReturnTab(): string {
  return lastNonAiTab || 'HomeStackScreen';
}
