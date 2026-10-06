// Back = real history (owner request 06.10.2026): screens that are opened from several places
// are pushed where the user is, so Back returns exactly there, never to a fixed screen.
//
//  - orderDetails: inside the «Заказы» stack it is pushed on top of the list (Back → list);
//    from anywhere else (AI chat, search funnel, support chat, push) it opens as a root screen
//    above the tabs (Back → the screen the user came from). Before: a jump into the Orders tab
//    with a synthetic list under it — Back went to the list / Home / another tab.
//  - the orders list after a finished payment: the payment screens are closed first, then the
//    Orders tab opens (Back → the tab the booking started in).
//  - «К заказу» on the payment screen returns to the checkout already in the stack instead of
//    pushing a second copy.
import { navigateRoot } from './navigationRef';

type Nav = any;

type StackState = { routeNames?: string[]; routes?: Array<{ name: string; params?: any }>; type?: string };

function stackState(navigation: Nav): StackState | undefined {
  try {
    return navigation?.getState?.();
  } catch {
    return undefined;
  }
}

function hasRouteInStack(navigation: Nav, name: string): boolean {
  return Boolean(stackState(navigation)?.routes?.some(r => r.name === name));
}

function stackKnows(navigation: Nav, name: string): boolean {
  return Boolean(stackState(navigation)?.routeNames?.includes(name));
}

/**
 * Open an order. `leaveFlow`: the current screen ends a finished flow (payment success) — it is
 * closed so Back from the order does not return to a paid payment screen.
 */
export function openOrderDetails(navigation: Nav, orderId: string | number, opts: { leaveFlow?: boolean } = {}) {
  const params = { orderId };
  if (stackKnows(navigation, 'orderDetails')) {
    // Already in the Orders stack.
    if (opts.leaveFlow) {
      navigation.reset({
        index: 1,
        routes: [{ name: 'orders' }, { name: 'orderDetails', params }],
      });
      return;
    }
    navigation.navigate('orderDetails', params);
    return;
  }
  if (stackKnows(navigation, 'tab')) {
    // A root screen (payment opened above the tabs): close it, then open the order above the tabs.
    if (opts.leaveFlow && hasRouteInStack(navigation, 'tab')) navigation.popTo('tab');
    navigation.navigate('orderDetails', params);
    return;
  }
  // Any tab stack: the root stack has orderDetails above the tabs.
  navigation.navigate('orderDetails', params);
  if (opts.leaveFlow) {
    try {
      navigation.popToTop();
    } catch {
      /* the screen is the stack root — nothing to close */
    }
  }
}

/** Orders list. `leaveFlow` — see openOrderDetails. */
export function openOrdersList(navigation: Nav, opts: { leaveFlow?: boolean } = {}) {
  if (stackKnows(navigation, 'orders')) {
    if (hasRouteInStack(navigation, 'orders')) {
      navigation.popTo('orders');
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'orders' }] });
    }
    return;
  }
  if (opts.leaveFlow) {
    try {
      navigation.popToTop();
    } catch {
      /* nothing to close */
    }
  }
  // Switch to the Orders tab (history keeps the tab we came from); `pop` returns to an
  // existing list in that stack instead of pushing another one.
  navigateRoot('tab', { screen: 'OrdersStackScreen', params: { screen: 'orders', pop: true } });
}

/** «К заказу» from the payment screen: back to the checkout already in the stack, else open it. */
export function backToCheckout(navigation: Nav, params: { order_id: unknown }) {
  if (hasRouteInStack(navigation, 'checkout')) {
    navigation.popTo('checkout', params);
    return;
  }
  navigation.navigate('checkout', params);
}

const AUTH_ROUTES = new Set(['login', 'signup', 'verification']);

/**
 * After login started from a screen (e.g. «Забронировать» on ticketDetails): go back to THAT screen
 * instead of opening a new copy of it. Before: `navigate('ticketDetails')` from the account stack
 * pushed a second ticketDetails above the tabs — Back from it led into the login screens.
 *  - the screen is in the same stack (e.g. «Избранное» in «Аккаунте») → pop to it;
 *  - otherwise: the login screens are removed from the account stack and the tab the user came
 *    from is shown again (tab history), with its screen still open.
 */
export function returnAfterLogin(navigation: Nav, returnTo: string, returnParams: object) {
  const routes = stackState(navigation)?.routes ?? [];
  if (routes.some(r => r.name === returnTo)) {
    navigation.popTo(returnTo, returnParams);
    return;
  }
  const tabs = navigation.getParent?.();
  if (tabs?.canGoBack?.()) {
    const rest = routes.filter(r => !AUTH_ROUTES.has(r.name));
    const next = rest.some(r => r.name === 'account') ? rest : [{ name: 'account' }, ...rest];
    navigation.reset({ index: next.length - 1, routes: next });
    tabs.goBack();
    return;
  }
  navigation.navigate(returnTo, returnParams);
}
