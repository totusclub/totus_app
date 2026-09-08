import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

const AI_TAB = 'VoiceAssistantStackScreen';

/** Screens that always hide the tab bar (even outside the AI tab). */
const ROOT_SCREENS_WITHOUT_TAB_BAR = new Set([
  'aiTextScreen',
  'hotelFromAi',
  'ticketDetails',
  'booking',
  'checkout',
  'orderDetails',
  'supportChat',
]);

/**
 * True when the bottom tab bar is visible (needs extra scroll padding).
 * False for the entire AI assistant tab (chat + hotel/tickets flow).
 *
 * Note: do not detect the AI stack by screen names like `tickets` —
 * those also exist on HomeStack.
 */
export function useHasBottomTabBar(): boolean {
  const navigation = useNavigation();
  const route = useRoute();

  if (ROOT_SCREENS_WITHOUT_TAB_BAR.has(route.name)) {
    return false;
  }

  let current: ReturnType<typeof useNavigation> | undefined = navigation;

  while (current) {
    const state = current.getState?.() as
      | { index?: number; routes?: { name: string }[] }
      | undefined;

    if (state?.routes?.length) {
      const focusedRoute = state.routes[state.index ?? 0];
      if (focusedRoute?.name === AI_TAB) {
        return false;
      }
    }

    current = current.getParent?.();
  }

  return true;
}
