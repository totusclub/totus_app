import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

/**
 * Root navigation ref — used by the floating AI chat (outside screen tree)
 * to open hotel details and by push taps.
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Navigate from outside the screen tree.
 * 'tab' (the bottom tabs) already exists in the root stack. In React Navigation 7 `navigate`
 * pushes a new route when the name differs from the focused one, so calling it while a root
 * screen (orderDetails, hotelFromAi, checkout…) is above the tabs used to push a SECOND tab
 * navigator — Back then went through the old copy (e.g. to the AI chat). Return to the existing
 * tabs first, then switch tab.
 */
export function navigateRoot(name: string, params?: object) {
  if (!navigationRef.isReady()) return;
  if (name === 'tab') {
    const state = navigationRef.getRootState() as
      | { index?: number; routes?: Array<{ name: string }> }
      | undefined;
    const routes = state?.routes ?? [];
    const focused = routes[state?.index ?? routes.length - 1];
    if (focused && focused.name !== 'tab' && routes.some(r => r.name === 'tab')) {
      navigationRef.dispatch(StackActions.popTo('tab'));
    }
  }
  // Root AuthStack screens (e.g. hotelFromAi, orderDetails) or the tabs.
  (navigationRef as any).navigate(name, params);
}
