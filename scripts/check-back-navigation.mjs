// Check: «Назад» (header arrow and Android back) follows the real navigation history.
//
// Run: node scripts/check-back-navigation.mjs   (Node >= 22.18; uses node_modules/@react-navigation/routers,
//      or RN_ROUTERS_DIR=<path to a CommonJS build of @react-navigation/routers>)
//
// Owner report 06.10.2026: Back on the order details opened the AI chat instead of the previous
// screen; Back must return where the user came from everywhere (orders, AI chat, profile,
// favorites, tours…). The real React Navigation 7 routers (StackRouter / TabRouter) run here in a
// small model of the app's navigator tree (src/navigation/authStack.tsx), driven by the real
// helpers (src/navigation/historyNavigation.ts, navigationRef.ts).
//
// Causes found in main:
//  - order details were opened by jumping into the «Заказы» tab (synthetic list under it, or
//    nothing) — Back went to the list / to «Поиск», never to the screen the user was on;
//  - tabs had the default backBehavior 'firstRoute' — Back on a tab root always went to «Поиск»;
//  - navigateRoot('tab', …) while a root screen was open pushed a SECOND tab navigator
//    (React Navigation 7 `navigate` pushes) — Back then walked through the old copy (e.g. AI chat);
//  - «К заказам» / auto-redirect after payment left the paid payment screens in the history;
//  - «К заказу» on the payment screen pushed a second checkout;
//  - login from «Забронировать» opened a second ticketDetails above the tabs;
//  - «Избранное» inside «Аккаунт» could not open a hotel (no route in that stack).

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import module from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = console.log.bind(console);
let failed = 0;
let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    out(`  ok   ${name}`);
  } catch (e) {
    failed++;
    out(`  FAIL ${name}\n       ${e && e.message ? e.message : e}`);
  }
}
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

if (!process.features || !process.features.typescript || typeof module.registerHooks !== 'function') {
  out('SKIP: need Node >= 22.18 (TypeScript type stripping + module.registerHooks)');
  process.exit(0);
}

// ---------------------------------------------------------------- React Navigation routers
const require = module.createRequire(path.join(root, 'package.json'));
let routers = null;
try {
  routers = require('@react-navigation/routers');
} catch {
  if (process.env.RN_ROUTERS_DIR) routers = require(path.resolve(process.env.RN_ROUTERS_DIR));
}
if (!routers) {
  out('SKIP: @react-navigation/routers not installed (npm install) — set RN_ROUTERS_DIR to run');
  process.exit(0);
}
const {StackRouter, TabRouter, CommonActions, StackActions} = routers;

// ---------------------------------------------------------------- app navigator tree (authStack.tsx)
const FUNNEL = ['hotel', 'tickets', 'ticketDetails', 'booking', 'checkout', 'pendingPayment'];
function makeConfig({fixed}) {
  return {
    root: {
      type: 'stack',
      initial: 'tab',
      routeNames: ['onboarding', 'ticketDetails', 'booking', 'checkout', 'pendingPayment', 'hotelFromAi',
        ...(fixed ? ['orderDetails'] : []), 'tab'],
      children: {tab: 'tabs'},
    },
    tabs: {
      type: 'tab',
      backBehavior: fixed ? 'history' : undefined,
      routeNames: ['HomeStackScreen', 'OrdersStackScreen', 'VoiceAssistantStackScreen', 'FavoritesStackScreen', 'AccountStackScreen'],
      children: {
        HomeStackScreen: 'home', OrdersStackScreen: 'orders', VoiceAssistantStackScreen: 'ai',
        FavoritesStackScreen: 'favorites', AccountStackScreen: 'account',
      },
    },
    home: {type: 'stack', routeNames: ['home', 'searchResult', ...FUNNEL]},
    orders: {type: 'stack', routeNames: ['orders', 'orderDetails', 'checkout', 'pendingPayment']},
    ai: {type: 'stack', routeNames: ['aiTextScreen', 'hotelFromAi', 'tickets', 'ticketDetails', 'booking', 'checkout', 'pendingPayment']},
    favorites: {type: 'stack', routeNames: ['favorites', ...FUNNEL]},
    account: {
      type: 'stack',
      initial: 'account',
      routeNames: ['login', 'signup', 'verification', 'account', 'favorites', ...(fixed ? FUNNEL : []),
        'legalDocuments', 'legalDocument', 'privacyPolicy', 'supportChat', 'notifications', 'notificationSettings'],
    },
  };
}

// ---------------------------------------------------------------- minimal NavigationContainer model
// Same rules as @react-navigation/core: an action goes to the screen's navigator and bubbles up to
// parents when unhandled; nested `params.screen` (initial / pop / merge) is applied to a child
// navigator when it mounts or when the parent route's params change; tabs mount lazily.
function createApp({fixed}) {
  const config = makeConfig({fixed});
  const opts = cfg => ({routeNames: cfg.routeNames, routeParamList: {}, routeGetIdList: {}});

  function makeNode(cfgName, parent, parentRouteKey, params) {
    const cfg = config[cfgName];
    const router = cfg.type === 'tab'
      ? TabRouter({backBehavior: cfg.backBehavior, initialRouteName: cfg.initial})
      : StackRouter({initialRouteName: cfg.initial});
    const node = {cfgName, cfg, router, parent, parentRouteKey, children: new Map(), lastParams: params, state: null};
    if (params && typeof params.screen === 'string' && params.initial !== false) {
      node.state = router.getRehydratedState({routes: [{name: params.screen, params: params.params}]}, opts(cfg));
    } else {
      node.state = router.getInitialState(opts(cfg));
      if (params && typeof params.screen === 'string') {
        const s = router.getStateForAction(node.state, CommonActions.navigate({name: params.screen, params: params.params, pop: params.pop}), opts(cfg));
        if (s) node.state = s;
      }
    }
    sync(node);
    return node;
  }

  function sync(node) {
    const keys = new Set(node.state.routes.map(r => r.key));
    for (const k of [...node.children.keys()]) if (!keys.has(k)) node.children.delete(k);
    node.state.routes.forEach((route, i) => {
      const childCfg = node.cfg.children?.[route.name];
      if (!childCfg) return;
      const child = node.children.get(route.key);
      if (!child) {
        if (i === node.state.index) node.children.set(route.key, makeNode(childCfg, node, route.key, route.params));
        return;
      }
      if (route.params !== child.lastParams) {
        child.lastParams = route.params;
        const p = route.params;
        if (p && typeof p.screen === 'string') {
          apply(child, CommonActions.navigate({name: p.screen, params: p.params, merge: p.merge, pop: p.pop}));
        }
      }
    });
  }

  function apply(node, action) {
    let s = node.router.getStateForAction(node.state, action, opts(node.cfg));
    if (s == null) return false;
    if (s.stale !== false) s = node.router.getRehydratedState(s, opts(node.cfg));
    node.state = s;
    sync(node);
    return true;
  }

  function dispatchFrom(node, action) {
    for (let n = node; n; n = n.parent) if (apply(n, action)) return true;
    return false;
  }

  const rootNode = makeNode('root', null, null, undefined);

  function deepestFocused() {
    let node = rootNode;
    for (;;) {
      const route = node.state.routes[node.state.index];
      const child = node.children.get(route.key);
      if (!child) return node;
      node = child;
    }
  }

  function screenNav(node) {
    return {
      navigate: (name, params, o) => dispatchFrom(node, CommonActions.navigate(name, params, o)),
      goBack: () => dispatchFrom(node, CommonActions.goBack()),
      popToTop: () => dispatchFrom(node, StackActions.popToTop()),
      popTo: (name, params, o) => dispatchFrom(node, StackActions.popTo(name, params, o)),
      reset: state => dispatchFrom(node, CommonActions.reset(state)),
      canGoBack: () => {
        for (let n = node; n; n = n.parent) {
          if (n.router.getStateForAction(n.state, CommonActions.goBack(), opts(n.cfg)) != null) return true;
        }
        return false;
      },
      getState: () => node.state,
      getParent: () => (node.parent ? screenNav(node.parent) : undefined),
    };
  }

  const app = {
    root: rootNode,
    /** Navigation prop of the focused screen. */
    nav: () => screenNav(deepestFocused()),
    /** Android back / header arrow with goBack(). */
    back: () => dispatchFrom(deepestFocused(), CommonActions.goBack()),
    /** Focused screen path, e.g. "tab>OrdersStackScreen>orderDetails". */
    where() {
      const parts = [];
      let node = rootNode;
      for (;;) {
        const route = node.state.routes[node.state.index];
        parts.push(route.name);
        const child = node.children.get(route.key);
        if (!child) return parts.join('>');
        node = child;
      }
    },
    rootRoutes: () => rootNode.state.routes.map(r => r.name),
    stack(tabName) {
      const tabs = rootNode.children.get(rootNode.state.routes.find(r => r.name === 'tab').key);
      const route = tabs.state.routes.find(r => r.name === tabName);
      const child = tabs.children.get(route.key);
      return child ? child.state.routes.map(r => r.name) : null;
    },
    tabNode() {
      return rootNode.children.get(rootNode.state.routes.find(r => r.name === 'tab').key);
    },
    ref: {
      isReady: () => true,
      getRootState: () => rootNode.state,
      dispatch: action => dispatchFrom(deepestFocused(), action),
      navigate: (name, params) => dispatchFrom(deepestFocused(), CommonActions.navigate(name, params)),
    },
    /** Tap on a bottom tab. */
    tapTab(name) {
      const tabs = app.tabNode();
      apply(tabs, {type: 'JUMP_TO', payload: {name}});
    },
  };
  return app;
}

// ---------------------------------------------------------------- real helpers of the app
let current = null;
globalThis.__navTest = {ref: () => current.ref, StackActions};
module.registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@react-navigation/native') return {url: 'mock:rn-native', shortCircuit: true};
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      if (!path.extname(base) && fs.existsSync(base + '.ts')) return {url: pathToFileURL(base + '.ts').href, shortCircuit: true};
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:rn-native') {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          export const StackActions = globalThis.__navTest.StackActions;
          export const createNavigationContainerRef = () => new Proxy({}, { get: (_, k) => globalThis.__navTest.ref()[k] });`,
      };
    }
    return next(url, context);
  },
});
const helpers = await import(pathToFileURL(path.join(root, 'src/navigation/historyNavigation.ts')).href);
const {navigateRoot} = await import(pathToFileURL(path.join(root, 'src/navigation/navigationRef.ts')).href);

function fresh(fixed = true) {
  current = createApp({fixed});
  return current;
}
/** Push screens one by one from the focused screen (same-stack `navigate`, as the app does). */
function go(app, ...names) {
  for (const name of names) app.nav().navigate(name, {});
}
/** AI chat «←» (TotusAiChatScreen.handleBack). */
function aiBack(app) {
  const parent = app.nav().getParent();
  if (parent?.canGoBack?.()) parent.goBack();
}

out('Back follows the history');

await check('before the fix (premise): order from support chat → Back lands on «Поиск», not the chat', () => {
  const app = fresh(false);
  app.tapTab('AccountStackScreen');
  go(app, 'supportChat');
  app.nav().navigate('OrdersStackScreen', {screen: 'orderDetails', params: {orderId: 7}});
  app.back();
  assert.equal(app.where(), 'tab>HomeStackScreen>home');
});

await check('Orders list → order → Back → list', () => {
  const app = fresh();
  app.tapTab('OrdersStackScreen');
  app.nav().navigate('orderDetails', {orderId: 1});
  assert.equal(app.where(), 'tab>OrdersStackScreen>orderDetails');
  app.back();
  assert.equal(app.where(), 'tab>OrdersStackScreen>orders');
});

await check('support chat → order card → Back → support chat', () => {
  const app = fresh();
  app.tapTab('AccountStackScreen');
  go(app, 'supportChat');
  helpers.openOrderDetails(app.nav(), 7);
  assert.equal(app.where(), 'orderDetails');
  app.back();
  assert.equal(app.where(), 'tab>AccountStackScreen>supportChat');
});

await check('Мила: hotel → … → payment success → «Открыть заказ» → Back → the chat (paid screens closed)', () => {
  const app = fresh();
  app.tapTab('VoiceAssistantStackScreen');
  go(app, 'hotelFromAi', 'tickets', 'ticketDetails', 'booking', 'checkout', 'pendingPayment');
  helpers.openOrderDetails(app.nav(), 900000001, {leaveFlow: true});
  assert.equal(app.where(), 'orderDetails');
  app.back();
  assert.equal(app.where(), 'tab>VoiceAssistantStackScreen>aiTextScreen');
  assert.deepEqual(app.stack('VoiceAssistantStackScreen'), ['aiTextScreen']);
});

await check('search funnel → paid → «Мои заказы» → Back → the search tab, no paid screens left', () => {
  const app = fresh();
  go(app, 'searchResult', 'hotel', 'tickets', 'ticketDetails', 'booking', 'checkout', 'pendingPayment');
  helpers.openOrdersList(app.nav(), {leaveFlow: true});
  assert.equal(app.where(), 'tab>OrdersStackScreen>orders');
  app.back();
  assert.equal(app.where(), 'tab>HomeStackScreen>home');
});

await check('Orders: order → checkout → payment → paid → list (no duplicate list / order)', () => {
  const app = fresh();
  app.tapTab('OrdersStackScreen');
  go(app, 'orderDetails', 'checkout', 'pendingPayment');
  helpers.openOrdersList(app.nav(), {leaveFlow: true});
  assert.deepEqual(app.stack('OrdersStackScreen'), ['orders']);
});

await check('«К заказу» on the payment screen → back to the same checkout (no second copy)', () => {
  const app = fresh();
  app.tapTab('OrdersStackScreen');
  go(app, 'orderDetails', 'checkout', 'pendingPayment');
  helpers.backToCheckout(app.nav(), {order_id: 5});
  assert.deepEqual(app.stack('OrdersStackScreen'), ['orders', 'orderDetails', 'checkout']);
});

await check('push about an order while in «Избранное» → order on top → Back → where the user was', () => {
  const app = fresh();
  app.tapTab('FavoritesStackScreen');
  go(app, 'hotel');
  navigateRoot('orderDetails', {orderId: 3});
  assert.equal(app.where(), 'orderDetails');
  app.back();
  assert.equal(app.where(), 'tab>FavoritesStackScreen>hotel');
});

await check('push about an order while in «Заказы» → pushed above the list', () => {
  const app = fresh();
  app.tapTab('OrdersStackScreen');
  navigateRoot('orderDetails', {orderId: 3});
  assert.equal(app.where(), 'tab>OrdersStackScreen>orderDetails');
  app.back();
  assert.equal(app.where(), 'tab>OrdersStackScreen>orders');
});

await check('a tab push while a root screen is open does not create a second tab navigator', () => {
  const app = fresh();
  app.tapTab('AccountStackScreen');
  go(app, 'supportChat');
  helpers.openOrderDetails(app.nav(), 7); // root orderDetails above the tabs
  navigateRoot('tab', {screen: 'AccountStackScreen', params: {screen: 'notifications', initial: false}});
  assert.deepEqual(app.rootRoutes(), ['tab']);
  assert.equal(app.where(), 'tab>AccountStackScreen>notifications');
});

await check('before the fix (premise): the same push stacked a second "tab" route', () => {
  const app = fresh(false);
  app.nav().navigate('hotelFromAi', {});
  app.ref.navigate('tab', {screen: 'AccountStackScreen', params: {screen: 'notifications'}});
  assert.deepEqual(app.rootRoutes(), ['tab', 'hotelFromAi', 'tab']);
});

await check('tabs keep history: «Поиск» → «Заказы» → «Избранное», Back → «Заказы» → «Поиск»', () => {
  const app = fresh();
  app.tapTab('OrdersStackScreen');
  app.tapTab('FavoritesStackScreen');
  app.back();
  assert.equal(app.where(), 'tab>OrdersStackScreen>orders');
  app.back();
  assert.equal(app.where(), 'tab>HomeStackScreen>home');
});

await check('AI chat «←» and Android back → the tab and screen the user came from', () => {
  const app = fresh();
  app.tapTab('OrdersStackScreen');
  go(app, 'orderDetails');
  app.tapTab('VoiceAssistantStackScreen');
  aiBack(app);
  assert.equal(app.where(), 'tab>OrdersStackScreen>orderDetails');
  app.tapTab('VoiceAssistantStackScreen');
  app.back(); // Android back on the chat root
  assert.equal(app.where(), 'tab>OrdersStackScreen>orderDetails');
});

await check('«Избранное» in «Аккаунт» → hotel → tickets → Back step by step', () => {
  const app = fresh();
  app.tapTab('AccountStackScreen');
  go(app, 'favorites', 'hotel', 'tickets');
  assert.equal(app.where(), 'tab>AccountStackScreen>tickets');
  app.back();
  app.back();
  assert.equal(app.where(), 'tab>AccountStackScreen>favorites');
});

await check('«Забронировать» without login → login → code → back to the same ticket (no copy above tabs)', () => {
  const app = fresh();
  go(app, 'searchResult', 'hotel', 'tickets', 'ticketDetails');
  app.nav().navigate('tab', {screen: 'AccountStackScreen', params: {screen: 'login', params: {returnTo: 'ticketDetails'}}});
  go(app, 'verification');
  helpers.returnAfterLogin(app.nav(), 'ticketDetails', {});
  assert.equal(app.where(), 'tab>HomeStackScreen>ticketDetails');
  assert.deepEqual(app.rootRoutes(), ['tab']);
  assert.deepEqual(app.stack('AccountStackScreen'), ['account']);
  app.back();
  assert.equal(app.where(), 'tab>HomeStackScreen>tickets');
});

out('\nCode');
await check('authStack: tab history, orderDetails above the tabs, hotel funnel in «Аккаунт»', () => {
  const src = code(read('src/navigation/authStack.tsx'));
  assert.match(src, /backBehavior="history"/);
  assert.match(src, /<Stack\.Screen name="orderDetails" component=\{OrderDetailsScreen\} \/>\s*<Stack\.Screen name="tab" component=\{TabBar\} \/>/);
  const account = src.slice(src.indexOf('const AccountStackScreen'), src.indexOf('const TabBar'));
  for (const name of FUNNEL) assert.ok(account.includes(`name="${name}"`), name);
});
await check('call sites use the history helpers (no fixed jumps into the Orders tab)', () => {
  const files = ['src/component/checkout/TotusBookingSuccess.tsx', 'src/component/checkout/PendingPayment.tsx',
    'src/component/checkout/Checkout.tsx', 'src/component/support/SupportChat.tsx'];
  for (const f of files) assert.ok(!/navigate\('OrdersStackScreen'/.test(code(read(f))), f);
  assert.match(code(read('src/component/checkout/TotusBookingSuccess.tsx')), /openOrderDetails\(navigation, orderId, \{ leaveFlow: true \}\)/);
  assert.match(code(read('src/component/support/SupportChat.tsx')), /openOrderDetails\(navigation, orderId\)/);
  assert.match(code(read('src/component/checkout/PendingPayment.tsx')), /backToCheckout\(navigation, \{ order_id: orderId \}\)/);
  assert.match(code(read('src/modules/push/pushService.ts')), /navigateRoot\('orderDetails', \{orderId\}\)/);
  assert.match(code(read('src/component/auth/Verification.tsx')), /returnAfterLogin\(navigation, returnTo, returnParams \|\| \{\}\)/);
  const ai = code(read('src/screens/ai/TotusAiChatScreen.tsx'));
  assert.match(ai, /if \(parent\?\.canGoBack\?\.\(\)\) \{\s*parent\.goBack\(\);/);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
