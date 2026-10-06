// Check: Android push notifications arrive when the app is fully closed (killed), and nothing
// changes for the open app, the app in background and incoming calls.
//
// Run: node scripts/check-android-killed-push.mjs   (Node >= 22.18, no npm install)
//
// Owner report 06.10.2026: Android, app closed — no push (support, orders, admin campaigns);
// the same account was open on the website / iPhone; incoming calls in the closed app work.
// Causes and fixes:
//  1. Support messages: the hub skipped the push when ANY socket of the user was live (website tab,
//     iPhone call socket) -> the closed Android got nothing. Now the hub decides per device
//     (calling_api_v2 lib/notifications/presence.js); the app tells it which socket means
//     "this phone is on screen": the support socket (lives only while the app is active) sends
//     presence 'foreground' + the install deviceId; every app socket sends client 'app'.
//  2. Every hub push: in background / killed the app relied only on the system drawing the FCM
//     `notification`. Now the headless handler (the same path that already delivers incoming calls
//     to the closed app) checks after a short grace period and, if there is no notification on
//     screen, shows the same one through notifee (same channel, text, data, tap -> deep link).
//     If the system has shown it — nothing is added (no duplicates).
// Foreground banners (onMessage), the support socket banner, calls and iOS stay as they are.

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

// ---------------------------------------------------------------- mocks
const MOCKS = {
  'react-native': `
    const M = () => globalThis.__kp;
    export const Platform = { get OS() { return M().os; }, Version: 34, constants: {}, select: o => (o[M().os] ?? o.default) };
    export const AppState = { get currentState() { return M().appState; }, addEventListener: () => ({ remove() {} }) };
    export const DeviceEventEmitter = { addListener: () => ({ remove() {} }), emit(ev, d) { M().deviceEvents.push([ev, d]); } };
    export const Linking = { openURL: async () => {}, openSettings: async () => {} };
    export const NativeModules = {};
    export default { Platform, AppState, DeviceEventEmitter, Linking, NativeModules };`,
  '@react-native-async-storage/async-storage': `
    const s = () => globalThis.__kp.storage;
    export default { getItem: async k => s().get(k) ?? null, setItem: async (k, v) => { s().set(k, v); }, removeItem: async k => { s().delete(k); } };`,
  '@react-native-firebase/messaging': `
    const M = () => globalThis.__kp;
    const m = () => ({ getToken: async () => 'fcm-1', onTokenRefresh: () => () => {}, getInitialNotification: async () => null,
      onNotificationOpenedApp: () => () => {}, hasPermission: async () => 1,
      onMessage: cb => { M().fcm.onMessage = cb; return () => {}; },
      setBackgroundMessageHandler: cb => { M().fcm.background = cb; } });
    export default m;`,
  '@notifee/react-native': `
    const M = () => globalThis.__kp;
    export const AndroidImportance = { HIGH: 4, DEFAULT: 3 };
    export const AuthorizationStatus = { AUTHORIZED: 1, DENIED: 0, NOT_DETERMINED: -1, PROVISIONAL: 2 };
    export const EventType = { PRESS: 1 };
    export default {
      createChannels: async c => { M().channels.push(...c); },
      displayNotification: async n => { M().shown.push(n); return n.id || 'x'; },
      getDisplayedNotifications: async () => { if (M().displayedThrows) throw new Error('boom'); return M().displayed; },
      getInitialNotification: async () => null,
      onForegroundEvent: () => () => {},
    };`,
  'socket.io-client': `export const io = (url, opts) => { globalThis.__kp.socketOpts = opts; const s = { connected: false, active: false, io: { reconnection() {} },
    on() { return s; }, connect() { return s; }, disconnect() { return s; }, removeAllListeners() { return s; }, emit() { return true; } }; return s; };
    export const Socket = undefined;`,
};
const LOCAL_STUBS = {
  'modules/store': `export const store = { dispatch: a => globalThis.__kp.dispatched.push(a), getState: () => ({ auth: {}, notifications: {} }) };`,
  'modules/store/slices/notifications': `
    const a = t => p => ({ type: t, payload: p });
    export const markReadLocal = a('markReadLocal'), notificationReceived = a('notificationReceived'), refreshUnread = a('refreshUnread'),
      setPushPermission = a('setPushPermission'), setPushRegistered = a('setPushRegistered'), setUnread = a('setUnread');`,
  'modules/api/notifications': `export const markNotificationOpened = async () => {}; export const registerPushDevice = async () => ({}); export const unregisterPushDevice = async () => {};`,
  'navigation/navigationRef': `export const navigationRef = { isReady: () => false, getCurrentRoute: () => null }; export const navigateRoot = () => {};`,
  'modules/support/supportConstants': `export const SUPPORT_CHAT_ROUTE = 'supportChat'; export const SUPPORT_PUSH_EVENT = 'support:push';`,
  'config/server': `export const VOIP_BASE_URL = 'https://voip.test';`,
  'modules/voip/VoipService': `
    const M = () => globalThis.__kp;
    export const initVoipAndCallKeep = () => {};
    export const handleAndroidIncomingCallNotification = async d => { M().incoming.push(d); };
    export const answerCall = async () => {}; export const endCall = () => {}; export const rejectCall = () => {};
    export const queuePendingAnswerFromBackground = () => {}; export const getCallState = () => ({});
    export const setAndroidPendingCallerName = () => {};
    export const handleRemoteCallEnded = id => { M().callEnded.push(id); };`,
  'modules/voip/androidCallUi': `export const consumeAndroidCallAction = async () => null; export const onAndroidCallActionAvailable = () => () => {};`,
  'modules/voip/androidCallPermissions': `export const ensureAndroidMicPermission = async () => true;`,
  'modules/voip/micPermission': `export const cancelMicPermissionRequest = () => {}; export const ensureMicPermissionWhenActive = () => {};`,
};
module.registerHooks({
  resolve(specifier, context, next) {
    if (MOCKS[specifier]) return {url: `mock:${specifier}`, shortCircuit: true};
    if (specifier.startsWith('.') && context.parentURL && context.parentURL.startsWith('file:')) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      const rel = path.relative(path.join(root, 'src'), base).split(path.sep).join('/');
      if (LOCAL_STUBS[rel]) return {url: `mock-local:${rel}`, shortCircuit: true};
      if (!path.extname(base) && fs.existsSync(base + '.ts')) return {url: pathToFileURL(base + '.ts').href, shortCircuit: true};
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('mock:')) return {format: 'module', source: MOCKS[url.slice(5)], shortCircuit: true};
    if (url.startsWith('mock-local:')) return {format: 'module', source: LOCAL_STUBS[url.slice(11)], shortCircuit: true};
    if (url.includes('/CallService.js')) {
      return {format: 'module', source: fs.readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true};
    }
    return next(url, context);
  },
});
// App logs ([push], [support-socket]) are not part of the report.
for (const k of ['log', 'warn']) {
  const orig = console[k].bind(console);
  console[k] = (...a) => (typeof a[0] === 'string' && /^\[(push|support-socket)/.test(a[0]) ? undefined : orig(...a));
}
globalThis.require = module.createRequire(path.join(root, 'src/modules/push/pushService.ts'));

// App time runs 50x faster (grace 1.5 s -> 30 ms).
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, Math.max(0, Math.floor((ms || 0) / 50)), ...a);

function reset(over = {}) {
  globalThis.__kp = {
    os: 'android', appState: 'background', storage: new Map(), fcm: {}, channels: [], shown: [], displayed: [],
    displayedThrows: false, dispatched: [], deviceEvents: [], incoming: [], callEnded: [], ...over,
  };
  return globalThis.__kp;
}
reset();
const push = await import(pathToFileURL(path.join(root, 'src/modules/push/pushService.ts')).href);
const callService = await import(pathToFileURL(path.join(root, 'src/modules/voip/CallService.js')).href);

const hubMessage = (type, extra = {}) => ({
  notification: {title: 'Оплата прошла', body: 'Заказ 48213 оплачен'},
  data: {type, route: 'order', orderId: '48213', notificationId: '901', title: 'Оплата прошла', body: 'Заказ 48213 оплачен', ...extra},
});
const supportMessage = () => ({
  notification: {title: 'Поддержка Totus', body: 'Здравствуйте! Чем помочь?'},
  data: {type: 'support_message', route: 'support_chat', chatId: '5', messageId: '77', notificationId: '902'},
});

out('Android push in a closed app');
await check('killed, system notification missing -> the app shows the same notification (channel, text, tap data)', async () => {
  const M = reset();
  assert.equal(await push.displayBackgroundHubNotification(hubMessage('payment_success')), true);
  assert.equal(M.shown.length, 1);
  const n = M.shown[0];
  assert.equal(n.id, 'hub-901', 'same id as the foreground banner -> never two of the same');
  assert.equal(n.title, 'Оплата прошла');
  assert.equal(n.body, 'Заказ 48213 оплачен');
  assert.equal(n.android.channelId, 'orders');
  assert.deepEqual(n.android.pressAction, {id: 'default'});
  assert.equal(n.data.route, 'order');
  assert.equal(n.data.orderId, '48213');
  assert.ok(M.channels.some(c => c.id === 'orders'), 'channels created before showing');
});
await check('support message -> support_chat channel, chat route', async () => {
  const M = reset();
  await push.displayBackgroundHubNotification(supportMessage());
  assert.equal(M.shown[0].android.channelId, 'support_chat');
  assert.equal(M.shown[0].data.route, 'support_chat');
});
await check('system already showed it (FCM notification on screen) -> nothing added, no duplicate', async () => {
  const M = reset({displayed: [{id: '0', notification: {id: '0', title: 'Оплата прошла', body: 'Заказ 48213 оплачен', android: {channelId: 'orders', tag: 'FCM-Notification:1'}}}]});
  assert.equal(await push.displayBackgroundHubNotification(hubMessage('payment_success')), false);
  assert.equal(M.shown.length, 0);
});
await check('our own notification already shown (second delivery) -> nothing added', async () => {
  const M = reset({displayed: [{id: 'hub-901', notification: {id: 'hub-901', title: 'x', body: 'y'}}]});
  assert.equal(await push.displayBackgroundHubNotification(hubMessage('payment_success')), false);
  assert.equal(M.shown.length, 0);
});
await check('cannot read the shade -> do not risk a duplicate', async () => {
  const M = reset({displayedThrows: true});
  assert.equal(await push.displayBackgroundHubNotification(hubMessage('payment_success')), false);
  assert.equal(M.shown.length, 0);
});
await check('silent / data-only hub message -> never shown', async () => {
  const M = reset();
  assert.equal(await push.displayBackgroundHubNotification({data: {type: 'system', title: 'a', body: 'b'}}), false);
  assert.equal(M.shown.length, 0);
});
await check('app opened during the grace period -> foreground path owns the banner', async () => {
  const M = reset();
  const p = push.displayBackgroundHubNotification(hubMessage('payment_success'));
  M.appState = 'active';
  assert.equal(await p, false);
  assert.equal(M.shown.length, 0);
});
await check('iOS -> unchanged (APNs shows the notification)', async () => {
  const M = reset({os: 'ios'});
  assert.equal(await push.displayBackgroundHubNotification(hubMessage('payment_success')), false);
  assert.equal(M.shown.length, 0);
});

out('\nCallService (FCM handlers)');
reset();
callService.registerAndroidCallBackgroundHandlers();
const handlers = {...globalThis.__kp.fcm};
await check('background / killed handler: hub and support pushes go to the fallback', async () => {
  const M = reset();
  await handlers.background(hubMessage('payment_success'));
  await handlers.background(supportMessage());
  assert.deepEqual(M.shown.map(n => n.id), ['hub-901', 'hub-902']);
  assert.equal(M.incoming.length, 0, 'never an incoming call');
});
await check('background / killed handler: incoming call and call_ended unchanged', async () => {
  const M = reset();
  await handlers.background({data: {type: 'incoming_call', callId: 'c1', callerName: 'Поддержка'}});
  await handlers.background({data: {type: 'call_ended', callId: 'c1', reason: 'answered_elsewhere'}});
  assert.equal(M.incoming.length, 1);
  assert.equal(M.incoming[0].callId, 'c1');
  assert.deepEqual(M.callEnded, ['c1']);
  assert.equal(M.shown.length, 0, 'calls never produce a hub notification');
});
await check('foreground (onMessage): local banner as before, no fallback wait', async () => {
  const M = reset({appState: 'active'});
  await handlers.onMessage(hubMessage('payment_success'));
  assert.equal(M.shown.length, 1);
  assert.equal(M.shown[0].id, 'hub-901');
  const src = code(read('src/modules/voip/CallService.js'));
  const onMessage = src.slice(src.indexOf('messaging().onMessage('));
  assert.ok(!/displayBackgroundHubNotification/.test(onMessage.slice(0, onMessage.indexOf('} catch'))), 'onMessage does not use the fallback');
});
await check('tap on the app-shown notification opens the same screen (background + cold start)', () => {
  const idx = code(read('index.js'));
  assert.match(idx, /notifee\.onBackgroundEvent\(handleNotifeeBackgroundEvent\)/);
  const src = code(read('src/modules/push/pushService.ts'));
  assert.match(src, /notifee\.getInitialNotification\(\)/);
  assert.match(src, /type === EventType\.PRESS\) \{\s*await savePendingPress/);
});

out('\nSockets tell the hub which phone is on screen');
await check('every app socket: client app; call socket never claims "on screen"', async () => {
  const {voipSocketAuth} = await import(pathToFileURL(path.join(root, 'src/modules/api/voipAuth.ts')).href);
  const M = reset();
  M.storage.set('persist:root', JSON.stringify({auth: JSON.stringify({accessToken: 'jwt-1'})}));
  const auth = await new Promise(r => voipSocketAuth(r));
  assert.deepEqual(auth, {token: 'jwt-1', client: 'app'});
  assert.match(code(read('src/modules/voip/VoipService.ts')), /auth: voipSocketAuth/, 'VoipService socket uses the shared auth');
});
await check('support socket (only while the app is active): presence foreground + install deviceId', async () => {
  const sup = await import(pathToFileURL(path.join(root, 'src/modules/support/supportSocket.ts')).href);
  const M = globalThis.__kp;
  M.storage.set('push:deviceId', 'android-k1-abc');
  sup.connectSupportSocket('app');
  const auth = await new Promise(r => M.socketOpts.auth(r));
  assert.deepEqual(auth, {token: 'jwt-1', client: 'app', presence: 'foreground', deviceId: 'android-k1-abc'});
  const src = code(read('src/modules/support/supportSocket.ts'));
  assert.match(src, /export function pauseSupportSocketForBackground[\s\S]*?socket\.disconnect\(\)/, 'still closed in background');
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
