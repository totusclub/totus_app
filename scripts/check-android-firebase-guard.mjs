// Check (Android, stage 2): the app keeps working when Firebase is not configured, and the
// Samsung phone-account call never runs without READ_PHONE_STATE.
//
// Run: node scripts/check-android-firebase-guard.mjs   (Node >= 22.18, no npm install)
//
// Found 04.10.2026 on main ba34be4a (Samsung Galaxy A15, Android 16, no google-services.json):
//  - messaging() throws "No Firebase App '[DEFAULT]'" synchronously. initVoipAndCallKeep caught it
//    in its outer catch and returned halfway: no CallKeep listeners, no recovery of CallKeep events,
//    no resume handler. setUserLoyaltyId called messaging() without try -> exception after sign-in.
//  - openAndroidCallingAccountSettings called hasDefaultPhoneAccount without READ_PHONE_STATE
//    (Samsung: TelecomManager.getDefaultOutgoingPhoneAccount -> SecurityException).
//  - MainActivity restored react-native-screens fragments after process death (crash).
// iOS paths are not touched: every messaging() call stays inside Platform.OS === 'android'.

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

const voipSrc = fs.readFileSync(path.join(root, 'src/modules/voip/VoipService.ts'), 'utf8');

// ---------------------------------------------------------------- source guards
out('source');
await check('messaging() is called only inside getAndroidMessaging() (no unguarded Firebase call)', () => {
  const calls = voipSrc.match(/\bmessaging\(\)/g) || [];
  // one call in the helper + one mention in its comment
  const code = voipSrc.replace(/\/\/[^\n]*/g, '');
  const codeCalls = code.match(/\bmessaging\(\)/g) || [];
  assert.equal(codeCalls.length, 1, `messaging() calls in code: ${codeCalls.length}`);
  assert.ok(calls.length >= 1);
  const helper = code.slice(code.indexOf('function getAndroidMessaging'), code.indexOf('export async function ensureAndroidTelecomReady'));
  assert.ok(/try\s*{\s*return messaging\(\);/.test(helper), 'helper wraps messaging() in try');
});
await check('every getAndroidMessaging() use is in an Android-only branch', () => {
  const code = voipSrc.replace(/\/\/[^\n]*/g, '');
  let uses = 0;
  for (const m of code.matchAll(/getAndroidMessaging\(\)(?!:)/g)) {
    uses++;
    const before = code.slice(Math.max(0, m.index - 4000), m.index);
    // notifyServerAndroid() itself is called only from Android branches (checked below)
    const inAndroidHelper = /function notifyServerAndroid\(/.test(before.slice(-1500));
    assert.ok(inAndroidHelper || /Platform\.OS === 'android'/.test(before), `use #${uses} not under an Android check`);
  }
  assert.equal(uses, 3, `uses: ${uses}`);
  for (const m of code.matchAll(/notifyServerAndroid\((?!callId: string)/g)) {
    const before = code.slice(Math.max(0, m.index - 300), m.index);
    assert.ok(/Platform\.OS === 'android'/.test(before), 'notifyServerAndroid() outside an Android branch');
  }
});
await check('MainActivity drops saved state (react-native-screens) ', () => {
  const ma = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/totus/com/MainActivity.kt'), 'utf8');
  assert.ok(/override fun onCreate\(savedInstanceState: Bundle\?\)\s*{\s*super\.onCreate\(null\)/.test(ma));
  assert.ok(/import android\.os\.Bundle/.test(ma));
});

if (!process.features || !process.features.typescript || typeof module.registerHooks !== 'function') {
  out('SKIP VoipService runtime: need Node >= 22.18');
  out(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------- mocks
const MOCKS = {
  'react-native': `
    const M = () => globalThis.__fbMock;
    export const Platform = { get OS() { return M().os; }, get Version() { return 35; }, select: o => o.android ?? o.default };
    export const AppState = { addEventListener: (ev, cb) => { M().appStateListeners.push(cb); return { remove() {} }; }, get currentState() { return 'active'; } };
    export const PermissionsAndroid = {
      PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', READ_PHONE_STATE: 'READ_PHONE_STATE', CAMERA: 'CAMERA', BLUETOOTH_CONNECT: 'BLUETOOTH_CONNECT', POST_NOTIFICATIONS: 'POST_NOTIFICATIONS' },
      RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
      check: async p => M().granted.includes(p),
      request: async p => (M().granted.includes(p) ? 'granted' : 'denied'),
      requestMultiple: async ps => Object.fromEntries(ps.map(p => [p, M().granted.includes(p) ? 'granted' : 'denied'])),
    };
    export const NativeModules = {};
    export const AppStateStatus = undefined;
    export default { Platform, AppState, PermissionsAndroid };`,
  // Proxy: every case installs a fresh mock (module mocks are cached across imports).
  'react-native-callkeep': `export const IOptions = undefined;
    export default new Proxy({}, { get: (_, k) => globalThis.__fbMock.callKeep[k] });`,
  'react-native-voip-push-notification': `export default { addEventListener() {}, removeEventListener() {}, registerVoipToken() {} };`,
  '@react-native-async-storage/async-storage': `
    const store = new Map();
    export default { getItem: async k => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async k => { store.delete(k); },
      multiGet: async keys => keys.map(k => [k, store.get(k) ?? null]), multiSet: async p => p.forEach(([k, v]) => store.set(k, v)), multiRemove: async keys => keys.forEach(k => store.delete(k)) };`,
  'react-native-incall-manager': `export default new Proxy({}, { get: () => () => {} });`,
  'socket.io-client': `export default () => { const s = { connected: true, active: true, id: 'sock', io: { on() {}, opts: {} },
    on() { return s; }, once() { return s; }, off() { return s; }, removeListener() { return s; }, removeAllListeners() { return s; },
    emit() { return true; }, connect() { return s; }, disconnect() { return s; } }; return s; };`,
  '@react-native-community/netinfo': `export const NetInfoState = undefined; export default { addEventListener: () => () => {}, fetch: async () => ({ isConnected: true, type: 'wifi' }) };`,
  '@react-native-firebase/messaging': `
    const M = () => globalThis.__fbMock;
    const m = () => {
      M().messagingCalls++;
      if (!M().firebase) throw new Error("No Firebase App '[DEFAULT]' has been created - call firebase.initializeApp()");
      return { getToken: async () => { M().tokenRequests++; return 'fcm-token-1'; }, onTokenRefresh: () => () => {}, getInitialNotification: async () => null, onMessage: () => () => {}, setBackgroundMessageHandler: () => {} };
    };
    export const FirebaseMessagingTypes = undefined;
    export default m;`,
  'react-native-webrtc': `
    export const RTCPeerConnection = function () { return { addTrack() {}, addEventListener() {}, close() {}, getSenders: () => [] }; };
    export const RTCSessionDescription = function (d) { return d; };
    export const RTCIceCandidate = function (c) { return c; };
    export const MediaStream = function () { return { getTracks: () => [] }; };
    export const RTCAudioSession = { audioSessionDidActivate() {}, audioSessionDidDeactivate() {} };
    export const mediaDevices = { getUserMedia: async () => ({ getTracks: () => [], getAudioTracks: () => [] }) };`,
};
const LOCAL_STUBS = {
  'config/server': `export const VOIP_BASE_URL = 'https://voip.test'; export const API_BASE_URL = 'https://api.test';`,
  'modules/api/voipAuth': `
    export const voipFetch = async (url, init = {}) => { globalThis.__fbMock.fetches.push({ url, body: init.body || '' }); return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '{}' }; };
    export const voipSocketAuth = cb => cb({ token: 't' });
    export const setVoipAccessToken = () => {};`,
  'modules/voip/AndroidCallForegroundService': `export const startAndroidCallForegroundService = async () => {}; export const stopAndroidCallForegroundService = async () => {};`,
  'modules/voip/NativeVoipOrchestrator': `export const nativeStopVoipService = () => {}; export const nativeUpdateConnectionStatus = () => {}; export const nativeEndRemoteCall = () => {};`,
  'modules/voip/AndroidPowerManager': `export const ensureAndroidBatteryOptimizationHandled = async () => {}; export const maybePromptAndroidVoipPowerSetup = async () => {};`,
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
    return next(url, context);
  },
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const unhandled = [];
process.on('unhandledRejection', e => unhandled.push(e));

let n = 0;
async function fresh({os = 'android', firebase = false, granted = ['RECORD_AUDIO']} = {}) {
  const M = {
    os, firebase, granted,
    appStateListeners: [], fetches: [], messagingCalls: 0, tokenRequests: 0,
    listeners: {}, initialEventsReads: 0, defaultAccountCalls: 0, openedAccounts: 0,
  };
  M.callKeep = {
    setup: async () => true, setAvailable() {}, setCurrentCallActive() {}, setMutedCall() {}, answerIncomingCall() {},
    displayIncomingCall() {}, reportNewIncomingCall() {}, startCall() {}, endCall() {}, endAllCalls() {},
    addEventListener(name, cb) { (M.listeners[name] ||= []).push(cb); },
    removeEventListener() {},
    getInitialEvents: async () => { M.initialEventsReads++; return []; },
    clearInitialEvents() {},
    hasPhoneAccount: async () => true,
    checkPhoneAccountEnabled: async () => true,
    hasDefaultPhoneAccount: () => {
      M.defaultAccountCalls++;
      if (!M.granted.includes('READ_PHONE_STATE')) throw new Error('SecurityException: getDefaultOutgoingPhoneAccount needs READ_PHONE_STATE');
      return true;
    },
    openPhoneAccounts() { M.openedAccounts++; },
  };
  globalThis.__fbMock = M;
  const V = await import(pathToFileURL(path.join(root, 'src/modules/voip/VoipService.ts')).href + `?case=${++n}`);
  return {V, M};
}

const quiet = {log: console.log, warn: console.warn, error: console.error};
if (!process.env.VOIP_CHECK_VERBOSE) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

out('VoipService.ts (Android, mocked native modules)');
await check('no google-services.json: init does not stop halfway (resume handler registered)', async () => {
  const {V, M} = await fresh({firebase: false});
  await V.initVoipAndCallKeep('client-1');
  await sleep(50);
  assert.ok(M.messagingCalls >= 1, 'Firebase was tried');
  assert.ok(M.appStateListeners.length >= 1, 'resume handler registered');
});
await check('no google-services.json: sign-in (setUserLoyaltyId) does not throw', async () => {
  const {V} = await fresh({firebase: false});
  await V.initVoipAndCallKeep();
  await sleep(20);
  assert.doesNotThrow(() => V.setUserLoyaltyId('client-2'));
  await sleep(20);
});
await check('with Firebase: FCM token is requested and the device is registered on the calling server', async () => {
  const {V, M} = await fresh({firebase: true});
  await V.initVoipAndCallKeep('client-3');
  await sleep(50);
  assert.ok(M.tokenRequests >= 1, 'getToken called');
  assert.ok(M.fetches.some(f => /register/i.test(f.url) && f.body.includes('fcm-token-1')), `register fetch: ${JSON.stringify(M.fetches.map(f => f.url))}`);
});
await check('Samsung: CallKeep native is never called on Android (no getDefaultOutgoingPhoneAccount crash)', async () => {
  const {V, M} = await fresh({granted: ['RECORD_AUDIO']});
  await V.initVoipAndCallKeep('client-4');
  assert.doesNotThrow(() => V.openAndroidCallingAccountSettings());
  await sleep(20);
  assert.equal(M.defaultAccountCalls, 0);
  assert.equal(M.openedAccounts, 0, 'no system phone-account screen');
});
await check('no unhandled promise rejections', async () => {
  await sleep(50);
  assert.equal(unhandled.length, 0, unhandled.map(e => (e && e.message) || String(e)).join('; '));
});

Object.assign(console, quiet);
out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
