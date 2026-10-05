// Check (Android): the Totus call flow without the system Telecom / CallKeep screen.
//
// Run: node scripts/check-android-call-flow.mjs   (Node >= 22.18, no npm install)
//
// Owner tests 04.10.2026 (Samsung Galaxy A15, Android 16):
//  1. app open: answered, media connected, the call could not be ended;
//  2. app killed: answered, no connection;
//  3. two call screens (Samsung Telecom + CallModal), permissions at first launch;
//  4. (05.10) the ringing could not be silenced with the side keys (volume / power).
// Expected now: CallKeep native is never touched on Android; ringing goes to the native Totus
// call UI (NativeModules.TotusCall); the microphone is asked only on "Ответить" / "Позвонить";
// "Сбросить" during the answer stops it (no "answered" call coming back, no /answer sent);
// "Отклонить" / "Завершить" reach the server (device token taken from FCM if needed).
// The real src/modules/voip/VoipService.ts runs with mocked native modules.

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

// ---------------------------------------------------------------- source guards
out('source');
await check('VoipService: CallKeep is a no-op stub on Android, the real module on iOS', () => {
  const s = read('src/modules/voip/VoipService.ts');
  assert.ok(/Platform\.OS === 'android' \? \(ANDROID_CALLKEEP_STUB as typeof RNCallKeepNative\) : RNCallKeepNative/.test(s));
  assert.ok(!/requestAndroidCallPermissions/.test(s), 'no permission storm at init');
});
await check('CallService: no system incoming screen (RNCallKeep.displayIncomingCall) on Android', () => {
  const s = read('src/modules/voip/CallService.js');
  assert.ok(!/RNCallKeep/.test(s.replace(/'RNCallKeep[A-Za-z]+'/g, '')), 'CallService does not use react-native-callkeep');
  assert.ok(/registerAndroidCallActionHandlers/.test(s));
});
await check('index.js: notification actions reach rejectCall / endCall and wait for the server', () => {
  const s = read('index.js');
  assert.ok(/registerAndroidCallActionHandlers\(\);/.test(s));
  assert.ok(/com\.totus\.com\.voip\.REJECT[\s\S]*voipRejectCall\(callId\)[\s\S]*await waitForAndroidCallActions\(\)/.test(s));
  assert.ok(/com\.totus\.com\.voip\.END[\s\S]*voipEndCall\(\)/.test(s));
});
await check('manifest: microphone call service, action receiver, headless task service', () => {
  const m = read('android/app/src/main/AndroidManifest.xml');
  assert.ok(/FOREGROUND_SERVICE_MICROPHONE/.test(m));
  assert.ok(/\.TotusVoipForegroundService"\s+android:foregroundServiceType="microphone"/.test(m));
  assert.ok(/\.TotusCallActionReceiver"\s+android:exported="false"/.test(m));
  assert.ok(/\.TotusVoipActionTaskService"\s+android:exported="false"/.test(m));
  assert.ok(/USE_FULL_SCREEN_INTENT/.test(m) && /POST_NOTIFICATIONS/.test(m));
});
await check('native: CallStyle + full-screen intent, Answer opens MainActivity, no trampolines', () => {
  const k = read('android/app/src/main/java/com/totus/com/TotusCallManager.kt');
  assert.ok(/CallStyle\.forIncomingCall\(person, decline, answer\)/.test(k));
  assert.ok(/setFullScreenIntent\(fullScreen, true\)/.test(k));
  assert.ok(/PendingIntent\.getActivity\(/.test(k), 'answer = activity PendingIntent');
  assert.ok(/PendingIntent\.FLAG_IMMUTABLE/.test(k));
  assert.ok(/RECORD_AUDIO\) != PackageManager\.PERMISSION_GRANTED/.test(k), 'no mic FGS without RECORD_AUDIO');
  const r = read('android/app/src/main/java/com/totus/com/TotusCallActionReceiver.kt');
  assert.ok(!/startActivity/.test(r), 'receiver never starts an activity');
  const f = read('android/app/src/main/java/com/totus/com/TotusVoipForegroundService.kt');
  assert.ok(/FOREGROUND_SERVICE_TYPE_MICROPHONE/.test(f));
  const a = read('android/app/src/main/java/com/totus/com/MainActivity.kt');
  assert.ok(/override fun onNewIntent\(intent: Intent\)[\s\S]*handleActivityIntent/.test(a));
  assert.ok(/super\.onCreate\(null\)/.test(a));
  const app = read('android/app/src/main/java/com/totusclubapp/MainApplication.kt');
  assert.ok(/add\(TotusCallPackage\(\)\)/.test(app));
});

await check('side keys: self-managed Telecom call -> volume / power while ringing silence it', () => {
  const t = read('android/app/src/main/java/com/totus/com/TotusConnectionService.kt');
  assert.ok(/PhoneAccount\.CAPABILITY_SELF_MANAGED/.test(t), 'self-managed account (no system call screen)');
  assert.ok(/PROPERTY_SELF_MANAGED/.test(t));
  assert.ok(/override fun onShowIncomingCallUi\(\)[\s\S]*startAlerting/.test(t), 'our UI starts from Telecom');
  assert.ok(/override fun onSilence\(\)[\s\S]*silenceIncoming/.test(t), 'volume / power key -> silence');
  assert.ok(/override fun onReject\(\)/.test(t) && /override fun onDisconnect\(\)/.test(t));
  const k = read('android/app/src/main/java/com/totus/com/TotusCallManager.kt');
  assert.ok(/TotusTelecom\.addIncomingCall\(/.test(k), 'incoming registered in Telecom');
  assert.ok(/fun silenceIncoming\(/.test(k) && /SILENCED_CHANNEL_ID/.test(k), 'silenced call stays visible, without sound');
  assert.ok(/postDelayed\(/.test(k), 'UI starts even if Telecom does not answer');
  const m = read('android/app/src/main/AndroidManifest.xml');
  assert.ok(/MANAGE_OWN_CALLS/.test(m));
  assert.ok(/\.TotusConnectionService"\s+android:permission="android\.permission\.BIND_TELECOM_CONNECTION_SERVICE"/.test(m));
});

if (!process.features || !process.features.typescript || typeof module.registerHooks !== 'function') {
  out('SKIP VoipService runtime: need Node >= 22.18');
  out(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------- mocks
const MOCKS = {
  'react-native': `
    const M = () => globalThis.__cf;
    export const Platform = { OS: 'android', Version: 34, select: o => o.android ?? o.default };
    export const AppState = {
      get currentState() { return M().appState; },
      addEventListener: (ev, cb) => { M().appStateListeners.push(cb); return { remove() {} }; },
    };
    export const PermissionsAndroid = {
      PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', READ_PHONE_STATE: 'READ_PHONE_STATE', CAMERA: 'CAMERA', BLUETOOTH_CONNECT: 'BLUETOOTH_CONNECT', POST_NOTIFICATIONS: 'POST_NOTIFICATIONS' },
      RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
      check: async p => M().granted.includes(p),
      request: async p => { M().prompts.push(p); if (M().micAnswer === 'granted') M().granted.push(p); return M().micAnswer; },
      requestMultiple: async ps => { M().prompts.push(...ps); return Object.fromEntries(ps.map(p => [p, 'denied'])); },
    };
    export const NativeModules = { get TotusCall() { return M().totusCall; } };
    export const DeviceEventEmitter = { addListener: () => ({ remove() {} }), emit() {} };
    export const AppStateStatus = undefined;
    export default { Platform, AppState, PermissionsAndroid, NativeModules, DeviceEventEmitter };`,
  'react-native-callkeep': `
    export const IOptions = undefined;
    export default new Proxy({}, { get: (_, k) => (...a) => { globalThis.__cf.callKeepCalls.push(String(k)); return Promise.resolve(true); } });`,
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
    const m = () => ({ getToken: async () => globalThis.__cf.fcmToken, onTokenRefresh: () => () => {}, getInitialNotification: async () => null, onMessage: () => () => {}, setBackgroundMessageHandler: () => {} });
    export const FirebaseMessagingTypes = undefined;
    export default m;`,
  'react-native-webrtc': `
    const M = () => globalThis.__cf;
    export const RTCPeerConnection = function () { return M().makePeer(); };
    export const RTCSessionDescription = function (d) { return d; };
    export const RTCIceCandidate = function (c) { return c; };
    export const MediaStream = function () { return { getTracks: () => [] }; };
    export const RTCAudioSession = { audioSessionDidActivate() {}, audioSessionDidDeactivate() {} };
    export const mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ kind: 'audio', enabled: true, stop() {} }], getAudioTracks: () => [{ enabled: true, stop() {} }] }) };`,
};
const LOCAL_STUBS = {
  'config/server': `export const VOIP_BASE_URL = 'https://voip.test'; export const API_BASE_URL = 'https://api.test';`,
  'modules/api/voipAuth': `
    export const voipFetch = (...a) => globalThis.__cf.fetch(...a);
    export const voipSocketAuth = cb => cb({ token: 't' });
    export const setVoipAccessToken = () => {};`,
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

// App time runs 50x faster (answer waits, offer retries).
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, Math.max(0, Math.floor((ms || 0) / 50)), ...a);
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms, ...a) => realSetInterval(fn, Math.max(5, Math.floor((ms || 0) / 50)), ...a);
const sleep = ms => new Promise(r => realSetTimeout(r, ms));
const unhandled = [];
process.on('unhandledRejection', e => unhandled.push(e));

let n = 0;
async function fresh({granted = [], micAnswer = 'granted', offerDelayMs = 0, fcmToken = 'fcm-1', appState = 'active'} = {}) {
  const M = {
    granted: [...granted], micAnswer, offerDelayMs, fcmToken, appState,
    appStateListeners: [], prompts: [], callKeepCalls: [], posts: [], peers: [], native: [],
  };
  M.totusCall = new Proxy({}, {
    get: (_, k) => (...a) => {
      M.native.push([String(k), ...a]);
      if (k === 'startOngoing') return Promise.resolve(true);
      if (k === 'consumePendingCallAction') return Promise.resolve(null);
      return undefined;
    },
  });
  M.makePeer = () => {
    const p = {
      signalingState: 'stable', connectionState: 'new', iceConnectionState: 'new', iceGatheringState: 'complete',
      localDescription: null, remoteDescription: null,
      addTrack() {}, addEventListener() {}, removeEventListener() {}, getSenders: () => [], getReceivers: () => [], getStats: async () => new Map(),
      async setRemoteDescription(d) { p.remoteDescription = d; p.signalingState = 'have-remote-offer'; },
      async createAnswer() { return {type: 'answer', sdp: 'v=0 answer'}; },
      async createOffer() { return {type: 'offer', sdp: 'v=0 offer'}; },
      async setLocalDescription(d) { p.localDescription = d; p.signalingState = 'stable'; },
      async addIceCandidate() {}, restartIce() {}, close() { p.connectionState = 'closed'; p.closed = true; },
    };
    M.peers.push(p);
    return p;
  };
  M.fetch = async (url, init = {}) => {
    const json = body => ({ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body)});
    if (init.method === 'POST') {
      M.posts.push({url, body: JSON.parse(init.body || '{}')});
    }
    if (/\/api\/calls\/[^/]+$/.test(url) && (!init.method || init.method === 'GET')) {
      if (M.offerDelayMs) await sleep(M.offerDelayMs);
      return json({offer: {type: 'offer', sdp: 'v=0 offer'}});
    }
    if (/candidates/.test(url)) return json({candidates: []});
    if (/ice/.test(url)) return json({iceServers: [{urls: 'stun:stun.test'}], ttl: 3600});
    return json({ok: true});
  };
  globalThis.__cf = M;
  const V = await import(pathToFileURL(path.join(root, 'src/modules/voip/VoipService.ts')).href + `?case=${++n}`);
  return {V, M};
}
const posted = (M, kind, id) => M.posts.filter(p => p.url.endsWith(`/api/calls/${id}/${kind}`));
const nativeCalls = (M, name) => M.native.filter(c => c[0] === name);
async function ringing(V, M, callId) {
  await V.handleAndroidIncomingCallNotification({type: 'incoming_call', callId, uuid: callId, callerName: 'Поддержка Totus'});
  await sleep(10);
}

const quiet = {log: console.log, warn: console.warn, error: console.error};
if (!process.env.VOIP_CHECK_VERBOSE) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

out('VoipService.ts (Android, mocked native modules)');
await check('first launch: no permission prompts, CallKeep / Telecom never touched', async () => {
  const {V, M} = await fresh();
  await V.initVoipAndCallKeep('client-1');
  await sleep(30);
  assert.deepEqual(M.prompts, []);
  assert.deepEqual(M.callKeepCalls, []);
});
await check('incoming (killed / background / lock screen): native Totus call UI rings with the caller name', async () => {
  const {V, M} = await fresh({granted: ['RECORD_AUDIO']});
  await V.initVoipAndCallKeep('client-1');
  await ringing(V, M, 'c1');
  const u = nativeCalls(M, 'updateCall');
  assert.ok(u.some(c => c[1] === 'c1' && c[2] === true && c[3] === 'Поддержка Totus'), JSON.stringify(u));
  assert.equal(V.getCallState().state, 'ringing');
  assert.deepEqual(M.callKeepCalls, []);
});
await check('Answer (mic granted): ringing stops, call service starts, offer -> /answer, connected', async () => {
  const {V, M} = await fresh({granted: ['RECORD_AUDIO']});
  await V.initVoipAndCallKeep('client-1');
  await sleep(20);
  await ringing(V, M, 'c2');
  await V.answerCall('c2');
  await sleep(100);
  assert.equal(V.getCallState().state, 'answered');
  assert.ok(nativeCalls(M, 'updateCall').some(c => c[1] === 'c2' && c[2] === false), 'incoming dismissed');
  assert.ok(nativeCalls(M, 'startOngoing').some(c => c[1] === 'c2'), 'microphone service started');
  assert.equal(posted(M, 'answer', 'c2').length, 1);
  assert.equal(posted(M, 'answer', 'c2')[0].body.deviceId, 'fcm-1');
  assert.deepEqual(M.prompts, [], 'no prompt when already granted');
});
await check('Answer, first time: microphone asked on "Ответить" only', async () => {
  const {V, M} = await fresh({granted: [], micAnswer: 'granted'});
  await V.initVoipAndCallKeep('client-1');
  await sleep(20);
  await ringing(V, M, 'c3');
  assert.deepEqual(M.prompts, []);
  await V.answerCall('c3');
  await sleep(100);
  assert.deepEqual(M.prompts, ['RECORD_AUDIO']);
  assert.equal(posted(M, 'answer', 'c3').length, 1);
});
await check('Answer with microphone denied: call declined on the server, no "answered" without sound', async () => {
  const {V, M} = await fresh({granted: [], micAnswer: 'denied'});
  await V.initVoipAndCallKeep('client-1');
  await sleep(20);
  await ringing(V, M, 'c4');
  await V.answerCall('c4');
  await V.waitForAndroidCallActions();
  await sleep(30);
  assert.equal(posted(M, 'answer', 'c4').length, 0);
  assert.equal(posted(M, 'reject', 'c4').length, 1);
  assert.notEqual(V.getCallState().state, 'answered');
  assert.equal(M.peers.length, 0);
  assert.ok(nativeCalls(M, 'stopAll').length >= 1);
});
await check('Hang up while the answer is still running: call does NOT come back, no /answer, /end sent', async () => {
  const {V, M} = await fresh({granted: ['RECORD_AUDIO'], offerDelayMs: 150});
  await V.initVoipAndCallKeep('client-1');
  await sleep(20);
  await V.handleAndroidIncomingCallNotification({type: 'incoming_call', callId: 'c5', uuid: 'c5', callerName: 'X'});
  const answering = V.answerCall('c5').catch(() => {});
  await sleep(60); // the answer waits for the offer
  V.endCall();
  await answering;
  await sleep(200);
  await V.waitForAndroidCallActions();
  assert.equal(posted(M, 'answer', 'c5').length, 0, 'no /answer after hang-up');
  assert.equal(posted(M, 'end', 'c5').length, 1);
  assert.notEqual(V.getCallState().state, 'answered', `state ${V.getCallState().state}`);
  assert.ok(M.peers.every(p => p.closed), 'peer closed');
  assert.ok(nativeCalls(M, 'stopAll').length >= 1, 'notifications / service stopped');
});
await check('Hang up during the conversation: /end once, call service and notifications stopped', async () => {
  const {V, M} = await fresh({granted: ['RECORD_AUDIO']});
  await V.initVoipAndCallKeep('client-1');
  await sleep(20);
  await ringing(V, M, 'c6');
  await V.answerCall('c6');
  await sleep(100);
  V.endCall();
  await V.waitForAndroidCallActions();
  await sleep(50);
  assert.equal(posted(M, 'end', 'c6').length, 1);
  assert.ok(nativeCalls(M, 'stopAll').length >= 1);
  assert.ok(nativeCalls(M, 'stopOngoing').length >= 1);
  assert.equal(V.getCallState().state, 'idle');
});
await check('"Отклонить" from the notification, app closed (fresh JS, no device id yet): /reject with the FCM token', async () => {
  const {V, M} = await fresh();
  V.rejectCall('c7');
  await V.waitForAndroidCallActions();
  const r = posted(M, 'reject', 'c7');
  assert.equal(r.length, 1);
  assert.equal(r[0].body.deviceId, 'fcm-1');
  assert.ok(nativeCalls(M, 'stopAll').length >= 1);
});
await check('Cold start from "Ответить" (JS restarted): pending answer connects with the caller name', async () => {
  const {V, M} = await fresh({granted: ['RECORD_AUDIO']});
  V.setAndroidPendingCallerName('c8', 'Поддержка Totus');
  V.queuePendingAnswerFromBackground('c8');
  await V.initVoipAndCallKeep('client-1');
  await sleep(400);
  assert.equal(posted(M, 'answer', 'c8').length, 1);
  assert.equal(V.getCallState().state, 'answered');
  assert.equal(V.getCallState().callerName, 'Поддержка Totus');
});
await check('Outgoing call with microphone denied: not started', async () => {
  const {V, M} = await fresh({granted: [], micAnswer: 'denied'});
  await V.initVoipAndCallKeep('client-1');
  await sleep(20);
  await assert.rejects(() => V.startOutgoingVoiceCallByLoyaltyId('1111 2222', 'Поддержка'), /микрофон/);
  assert.equal(M.peers.length, 0);
  assert.equal(M.posts.filter(p => /\/api\/calls$/.test(p.url)).length, 0);
});
await check('no unhandled promise rejections', async () => {
  await sleep(50);
  assert.equal(unhandled.length, 0, unhandled.map(e => (e && e.message) || String(e)).join('; '));
});

Object.assign(console, quiet);
out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
