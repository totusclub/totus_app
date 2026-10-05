// Check: a call that ended on another device never comes back as "Входящий звонок"
// (claude/CALL_END_SYNC_RU.md, calling_api_v2 #11).
//
// Run: node scripts/check-call-end-sync.mjs   (Node >= 22.18, no npm install)
//
// Owner scenario 05.10.2026: the account is open on Android, iOS and the web; a call is answered
// and hung up on the web; the next call does not reach the phones; opening the apps shows the
// finished call as incoming. Expected now (Android and iOS alike):
//  - cancel push (FCM / APNs VoIP type=call_ended) ends the call on the phone, never rings;
//  - a finished call is remembered: a late push of it does not ring again;
//  - a call that is only ringing never blocks the next call and never rings longer than 65 s;
//  - opening the app / socket reconnect checks the ringing call (and iOS CallKit calls) with
//    the server and removes finished ones;
//  - "answered elsewhere" never ends the call this phone answered.
// The real VoipService.ts / CallService.js run with mocked native modules; native code
// (AppDelegate, CallKeepHelper, TotusCallManager) is checked from source.

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

if (!process.features || !process.features.typescript || typeof module.registerHooks !== 'function') {
  out('SKIP: need Node >= 22.18 (TypeScript type stripping + module.registerHooks)');
  process.exit(0);
}

// ---------------------------------------------------------------- mocks
const MOCKS = {
  'react-native': `
    const M = () => globalThis.__ce;
    export const Platform = { get OS() { return M().os; }, Version: 34, select: o => (o[M().os] ?? o.default) };
    export const AppState = {
      get currentState() { return M().appState; },
      addEventListener: (ev, cb) => { M().appStateListeners.push(cb); return { remove() {} }; },
    };
    export const PermissionsAndroid = {
      PERMISSIONS: { RECORD_AUDIO: 'RECORD_AUDIO', READ_PHONE_STATE: 'READ_PHONE_STATE', CAMERA: 'CAMERA', BLUETOOTH_CONNECT: 'BLUETOOTH_CONNECT', POST_NOTIFICATIONS: 'POST_NOTIFICATIONS' },
      RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
      check: async () => true,
      request: async () => 'granted',
      requestMultiple: async ps => Object.fromEntries(ps.map(p => [p, 'granted'])),
    };
    export const NativeModules = { get TotusCall() { return M().os === 'android' ? M().totusCall : undefined; } };
    export const DeviceEventEmitter = { addListener: () => ({ remove() {} }), emit(ev, d) { M().deviceEvents.push([ev, d]); } };
    export const AppStateStatus = undefined;
    export default { Platform, AppState, PermissionsAndroid, NativeModules, DeviceEventEmitter };`,
  'react-native-callkeep': `
    const M = () => globalThis.__ce;
    export const IOptions = undefined;
    export default new Proxy({}, { get: (_, k) => (...a) => {
      M().callKeep.push([String(k), ...a]);
      if (k === 'getCalls') return Promise.resolve(M().ckCalls);
      if (k === 'getInitialEvents') return Promise.resolve(M().initialEvents || []);
      if (k === 'addEventListener') { (M().ckListeners[a[0]] ||= []).push(a[1]); return { remove() {} }; }
      return Promise.resolve(true);
    } });`,
  'react-native-voip-push-notification': `
    export default {
      addEventListener(ev, cb) { globalThis.__ce.voipListeners[ev] = cb; },
      removeEventListener() {}, registerVoipToken() {},
    };`,
  '@react-native-async-storage/async-storage': `
    const store = new Map();
    export default { getItem: async k => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async k => { store.delete(k); },
      multiGet: async keys => keys.map(k => [k, store.get(k) ?? null]), multiSet: async p => p.forEach(([k, v]) => store.set(k, v)), multiRemove: async keys => keys.forEach(k => store.delete(k)) };`,
  'react-native-incall-manager': `export default new Proxy({}, { get: () => () => {} });`,
  'socket.io-client': `export default () => { const M = globalThis.__ce; const s = { connected: true, active: true, id: 'sock', io: { on() {}, opts: {} },
    on(ev, cb) { (M.socketHandlers[ev] ||= []).push(cb); return s; }, once() { return s; }, off() { return s; }, removeListener() { return s; }, removeAllListeners() { return s; },
    emit(ev, d) { M.socketEmits.push([ev, d]); return true; }, connect() { return s; }, disconnect() { return s; } }; M.socket = s; return s; };`,
  '@react-native-community/netinfo': `export const NetInfoState = undefined; export default { addEventListener: () => () => {}, fetch: async () => ({ isConnected: true, type: 'wifi' }) };`,
  '@react-native-firebase/messaging': `
    const M = () => globalThis.__ce;
    const m = () => ({ getToken: async () => M().fcmToken, onTokenRefresh: () => () => {}, getInitialNotification: async () => null,
      onMessage: cb => { M().fcm.onMessage = cb; return () => {}; },
      setBackgroundMessageHandler: cb => { M().fcm.background = cb; } });
    export const FirebaseMessagingTypes = undefined;
    export default m;`,
  'react-native-webrtc': `
    const M = () => globalThis.__ce;
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
    export const voipFetch = (...a) => globalThis.__ce.fetch(...a);
    export const voipSocketAuth = cb => cb({ token: 't' });
    export const setVoipAccessToken = () => {};`,
  'modules/voip/AndroidPowerManager': `export const ensureAndroidBatteryOptimizationHandled = async () => {}; export const maybePromptAndroidVoipPowerSetup = async () => {};`,
  'modules/push/pushService': `
    export const displayForegroundNotification = async m => { globalThis.__ce.banners.push(m); };
    export const isSupportChatScreenOpen = () => false;`,
};
module.registerHooks({
  resolve(specifier, context, next) {
    if (MOCKS[specifier]) return {url: `mock:${specifier}`, shortCircuit: true};
    if (specifier.startsWith('.') && context.parentURL && context.parentURL.startsWith('file:')) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      const rel = path.relative(path.join(root, 'src'), base).split(path.sep).join('/');
      if (LOCAL_STUBS[rel]) return {url: `mock-local:${rel}`, shortCircuit: true};
      if (!path.extname(base) && fs.existsSync(base + '.ts')) {
        // Each case gets its own VoipService (the query of the importing module is passed on).
        const q = new URL(context.parentURL).search;
        return {url: pathToFileURL(base + '.ts').href + (rel.endsWith('/VoipService') ? q : ''), shortCircuit: true};
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('mock:')) return {format: 'module', source: MOCKS[url.slice(5)], shortCircuit: true};
    if (url.startsWith('mock-local:')) return {format: 'module', source: LOCAL_STUBS[url.slice(11)], shortCircuit: true};
    if (url.includes('/CallService.js')) {
      const source = fs.readFileSync(fileURLToPath(url.split('?')[0]), 'utf8');
      return {format: 'module', source, shortCircuit: true};
    }
    return next(url, context);
  },
});

// App time runs 50x faster (ringing timeout 65 s -> 1.3 s).
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, Math.max(0, Math.floor((ms || 0) / 50)), ...a);
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms, ...a) => realSetInterval(fn, Math.max(5, Math.floor((ms || 0) / 50)), ...a);
const sleep = ms => new Promise(r => realSetTimeout(r, ms));
process.on('unhandledRejection', () => {});

let n = 0;
async function fresh({os = 'android', calls = {}, ckCalls = [], withCallService = false, appState = 'background'} = {}) {
  const M = {
    os, appState, fcmToken: 'fcm-1', calls, ckCalls,
    appStateListeners: [], callKeep: [], posts: [], gets: [], peers: [], native: [], banners: [], deviceEvents: [],
    socketHandlers: {}, socketEmits: [], voipListeners: {}, fcm: {}, ckListeners: {},
  };
  M.totusCall = new Proxy({}, {
    get: (_, k) => (...a) => {
      M.native.push([String(k), ...a]);
      if (k === 'startOngoing') return Promise.resolve(true);
      if (k === 'consumePendingCallAction') return Promise.resolve(null);
      if (k === 'canUseFullScreenIntent') return Promise.resolve(true);
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
    const reply = (status, body) => ({ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body)});
    if (init.method === 'POST') {
      M.posts.push({url, body: JSON.parse(init.body || '{}')});
      return reply(200, {ok: true});
    }
    const m = url.match(/\/api\/calls\/([^/?]+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      M.gets.push(id);
      const c = M.calls[id];
      if (c === 404) return reply(404, {error: 'Unknown callId'});
      return reply(200, {callId: id, offer: {type: 'offer', sdp: 'v=0 offer'}, state: 'ringing', ...(c || {})});
    }
    if (/candidates/.test(url)) return reply(200, {candidates: []});
    if (/ice/.test(url)) return reply(200, {iceServers: [{urls: 'stun:stun.test'}], ttl: 3600});
    return reply(200, {ok: true});
  };
  globalThis.__ce = M;
  const q = `?case=${++n}`;
  const V = await import(pathToFileURL(path.join(root, 'src/modules/voip/VoipService.ts')).href + q);
  const C = withCallService ? await import(pathToFileURL(path.join(root, 'src/modules/voip/CallService.js')).href + q) : null;
  return {V, M, C};
}
const posted = (M, kind, id) => M.posts.filter(p => p.url.endsWith(`/api/calls/${id}/${kind}`));
const nativeCalls = (M, name) => M.native.filter(c => c[0] === name);
const rang = (M, id) => nativeCalls(M, 'updateCall').some(c => c[1] === id && c[2] === true);
const ck = (M, name) => M.callKeep.filter(c => c[0] === name);
async function ringing(V, callId) {
  await V.handleAndroidIncomingCallNotification({type: 'incoming_call', callId, uuid: callId, callerName: 'Тест'});
  await sleep(10);
}
async function resume(M) {
  M.appState = 'active';
  for (const cb of M.appStateListeners) cb('active');
  await sleep(60);
}
async function initAndroid(V) {
  await V.initVoipAndCallKeep('client-1');
  await sleep(40);
}

const quiet = {log: console.log, warn: console.warn, error: console.error};
if (!process.env.VOIP_CHECK_VERBOSE) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

out('Android: VoipService.ts (mocked native modules)');
await check('register-device says the app understands call_ended; logout removes only this phone', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  const reg = M.posts.find(p => p.url.endsWith('/api/register-device'));
  assert.ok(reg, 'registered');
  assert.equal(reg.body.callEndedPush, true);
  await V.cleanupVoipOnLogout();
  const un = M.posts.find(p => p.url.endsWith('/api/unregister-device'));
  assert.ok(un, 'unregistered');
  assert.equal(un.body.deviceId, 'fcm-1');
});
await check('owner scenario: ringing call answered on the web -> call_ended -> next call rings', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'c1');
  assert.equal(V.getCallState().state, 'ringing');
  V.handleRemoteCallEnded('c1', 'answered_elsewhere');
  await sleep(10);
  assert.notEqual(V.getCallState().state, 'ringing');
  assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'c1'), 'native ringing / Telecom call ended');
  assert.equal(posted(M, 'reject', 'c1').length + posted(M, 'end', 'c1').length, 0, 'nothing sent for a call ended elsewhere');
  await ringing(V, 'c2');
  assert.equal(V.getCallState().state, 'ringing');
  assert.equal(V.getCallState().callUUID, 'c2');
  assert.ok(rang(M, 'c2'), 'second call rings');
});
await check('late incoming push of a finished call does not ring (and push order does not matter)', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'c3');
  V.handleRemoteCallEnded('c3', 'hangup');
  await sleep(10);
  M.native.length = 0;
  await ringing(V, 'c3');
  assert.ok(!rang(M, 'c3'));
  V.handleRemoteCallEnded('c4', 'caller_cancel'); // cancel arrives before the incoming push
  await ringing(V, 'c4');
  assert.ok(!rang(M, 'c4'));
  assert.notEqual(V.getCallState().state, 'ringing');
});
await check('no cancel received: a call that is only ringing is replaced by the new call (not "busy")', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'c5');
  await ringing(V, 'c6');
  assert.equal(V.getCallState().state, 'ringing');
  assert.equal(V.getCallState().callUUID, 'c6');
  assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'c5'));
  assert.ok(rang(M, 'c6'));
});
await check('a call in progress is not replaced by a new incoming call', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'c7');
  await V.answerCall('c7');
  await sleep(100);
  assert.equal(V.getCallState().state, 'answered');
  await ringing(V, 'c8');
  assert.equal(V.getCallState().callUUID, 'c7');
  assert.equal(V.getCallState().state, 'answered');
});
await check('ringing never lasts longer than the server ring timeout (65 s)', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'c9');
  await sleep(1450);
  assert.notEqual(V.getCallState().state, 'ringing');
  assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'c9'));
});
for (const [label, status, reason] of [
  ['ended on the server', {state: 'ended', endReason: 'hangup'}, 'hangup'],
  ['answered on another device', {state: 'answered', answeredBy: 'web-device'}, 'answered_elsewhere'],
  ['forgotten by the server (404)', 404, 'gone'],
]) {
  await check(`opening the app: ringing call ${label} -> removed`, async () => {
    const {V, M} = await fresh({calls: {r1: status}});
    await initAndroid(V);
    await ringing(V, 'r1');
    await resume(M);
    assert.ok(M.gets.includes('r1'), 'checked with the server');
    assert.notEqual(V.getCallState().state, 'ringing');
    assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'r1'));
  });
}
await check('opening the app: call still ringing on the server stays', async () => {
  const {V, M} = await fresh({calls: {r2: {state: 'ringing'}}});
  await initAndroid(V);
  await ringing(V, 'r2');
  await resume(M);
  assert.equal(V.getCallState().state, 'ringing');
  assert.equal(V.getCallState().callUUID, 'r2');
});
await check('socket reconnect also checks the ringing call', async () => {
  const {V, M} = await fresh({calls: {r3: {state: 'ended', endReason: 'missed'}}});
  await initAndroid(V);
  await ringing(V, 'r3');
  for (const cb of M.socketHandlers.connect || []) cb();
  await sleep(40);
  assert.notEqual(V.getCallState().state, 'ringing');
});
await check('"answered elsewhere" does not end the call this phone answered', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'a1');
  await V.answerCall('a1');
  await sleep(100);
  V.handleRemoteCallEnded('a1', 'answered_elsewhere');
  await sleep(10);
  assert.equal(V.getCallState().state, 'answered');
  assert.equal(nativeCalls(M, 'endRemote').length, 0);
});
await check('hang-up push for the call in progress (socket was asleep) ends it', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 'a2');
  await V.answerCall('a2');
  await sleep(100);
  V.handleRemoteCallEnded('a2', 'hangup');
  await sleep(20);
  assert.notEqual(V.getCallState().state, 'answered');
  assert.ok(M.peers.every(p => p.closed), 'media closed');
  assert.ok(nativeCalls(M, 'stopAll').length >= 1);
});
await check('socket "ended" of the ringing call: removed, a late push of it does not ring again', async () => {
  const {V, M} = await fresh();
  await initAndroid(V);
  await ringing(V, 's1');
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: 's1', state: 'ended'});
  await sleep(10);
  assert.notEqual(V.getCallState().state, 'ringing');
  M.native.length = 0;
  await ringing(V, 's1');
  assert.ok(!rang(M, 's1'));
});
await check('server answer -> finished reason', async () => {
  const {V} = await fresh();
  assert.equal(V.finishedCallReason(404, null, 'd1'), 'gone');
  assert.equal(V.finishedCallReason(500, null, 'd1'), null);
  assert.equal(V.finishedCallReason(200, {state: 'ringing'}, 'd1'), null);
  assert.equal(V.finishedCallReason(200, {state: 'answered', answeredBy: 'd1'}, 'd1'), null);
  assert.equal(V.finishedCallReason(200, {state: 'answered', answeredBy: 'web'}, 'd1'), 'answered_elsewhere');
  assert.equal(V.finishedCallReason(200, {state: 'ended', endReason: 'missed'}, 'd1'), 'missed');
  assert.equal(V.finishedCallReason(200, {state: 'rejected'}, 'd1'), 'rejected');
});

out('Android: CallService.js (FCM)');
await check('FCM call_ended (app in background / killed): ends the call, never shows an incoming call', async () => {
  const {V, M, C} = await fresh({withCallService: true});
  C.registerAndroidCallBackgroundHandlers();
  await M.fcm.background({data: {type: 'incoming_call', callId: 'f1', callerName: 'Тест'}});
  await sleep(20);
  assert.ok(rang(M, 'f1'));
  M.native.length = 0;
  await M.fcm.background({data: {type: 'call_ended', callId: 'f1', reason: 'answered_elsewhere'}});
  await sleep(20);
  assert.ok(!rang(M, 'f1'), 'no incoming call from the cancel push');
  assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'f1'));
  assert.notEqual(V.getCallState().state, 'ringing');
});
await check('FCM call_ended in foreground: no banner, no incoming call', async () => {
  const {M, C} = await fresh({withCallService: true});
  C.registerAndroidCallBackgroundHandlers();
  await M.fcm.onMessage({data: {type: 'call_ended', callId: 'f2', reason: 'hangup'}});
  await sleep(10);
  assert.equal(M.banners.length, 0);
  assert.ok(!rang(M, 'f2'));
  assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'f2'));
});
await check('headless entry (index.js): call_ended is not treated as an incoming call', async () => {
  const {M, C} = await fresh({withCallService: true});
  await C.handleIncomingPush({data: {type: 'call_ended', callId: 'f3', reason: 'missed'}}, 'test');
  await sleep(10);
  assert.ok(!rang(M, 'f3'));
  assert.ok(nativeCalls(M, 'endRemote').some(c => c[1] === 'f3'));
});

out('iOS: VoipService.ts (mocked CallKit)');
async function initIos(V) {
  await V.initVoipAndCallKeep('client-1');
  globalThis.__ce.voipListeners.register?.('ios-voip-token'); // PushKit token -> device id, socket
  await sleep(40);
}
await check('VoIP push call_ended while JS runs: state reset, CallKit told "answered elsewhere", nothing sent', async () => {
  const {V, M} = await fresh({os: 'ios', appState: 'active'});
  await initIos(V);
  M.voipListeners.notification({type: 'incoming_call', callId: 'i1', callerName: 'Тест'});
  assert.equal(V.getCallState().state, 'ringing');
  M.voipListeners.notification({type: 'call_ended', callId: 'i1', reason: 'answered_elsewhere'});
  await sleep(10);
  assert.notEqual(V.getCallState().state, 'ringing');
  assert.ok(ck(M, 'reportEndCallWithUUID').some(c => c[1] === 'i1' && c[2] === 4), JSON.stringify(ck(M, 'reportEndCallWithUUID')));
  assert.equal(ck(M, 'endCall').filter(c => c[1] === 'i1').length, 0, 'no endCall action (it would POST /end)');
  assert.equal(posted(M, 'end', 'i1').length + posted(M, 'reject', 'i1').length, 0);
});
await check('iOS: the cancel push is never shown as a new incoming call; next call rings', async () => {
  const {V, M} = await fresh({os: 'ios'});
  await initIos(V);
  M.voipListeners.notification({type: 'call_ended', callId: 'i2', reason: 'hangup'});
  assert.notEqual(V.getCallState().state, 'ringing');
  M.voipListeners.notification({type: 'incoming_call', callId: 'i2'});
  assert.notEqual(V.getCallState().state, 'ringing', 'late push of the finished call ignored');
  M.voipListeners.notification({type: 'incoming_call', callId: 'i3'});
  assert.equal(V.getCallState().state, 'ringing');
  assert.equal(V.getCallState().callUUID, 'i3');
});
await check('iOS, opening the app: CallKit call that already ended on the server is ended', async () => {
  const {V, M} = await fresh({
    os: 'ios',
    calls: {k1: {state: 'ended', endReason: 'hangup'}, k2: {state: 'ringing'}},
    ckCalls: [
      {callUUID: 'k1', hasConnected: false, hasEnded: false, outgoing: false},
      {callUUID: 'k2', hasConnected: false, hasEnded: false, outgoing: false},
      {callUUID: 'k3', hasConnected: true, hasEnded: false, outgoing: false},
    ],
  });
  await initIos(V);
  await resume(M);
  const ended = ck(M, 'reportEndCallWithUUID').map(c => c[1]);
  assert.ok(ended.includes('k1'), JSON.stringify(ended));
  assert.ok(!ended.includes('k2'), 'still ringing on the server');
  assert.ok(!ended.includes('k3'), 'connected call untouched');
});

out('Outgoing call (Аккаунт / чат -> поддержка): end from the call window');
for (const os of ['android', 'ios']) {
  await check(`${os}: support answers, "Завершить" -> call ended, media closed, server told`, async () => {
    const {V, M} = await fresh({os});
    await V.initVoipAndCallKeep('client-1');
    if (os === 'ios') M.voipListeners.register?.('ios-voip-token');
    await sleep(40);
    const starting = V.startOutgoingVoiceCallByLoyaltyId('0978 6356 3712 8057', 'Поддержка Totus').catch(() => {});
    await sleep(40);
    const id = V.getCallState().callUUID;
    assert.equal(V.getCallState().state, 'calling');
    for (const cb of M.socketHandlers.answer || []) cb({callId: id, answer: {type: 'answer', sdp: 'v=0 a'}});
    for (const cb of M.socketHandlers['call-state'] || []) cb({callId: id, state: 'answered'});
    await starting;
    await sleep(20);
    assert.equal(V.getCallState().state, 'answered');
    V.endCall();
    await sleep(30);
    assert.equal(V.getCallState().state, 'idle');
    assert.equal(V.getCallState().callUUID, null);
    assert.ok(M.peers.every(p => p.closed), 'media closed');
    assert.ok(posted(M, 'end', id).length >= 1, 'server told');
    await sleep(400);
    assert.equal(V.getCallState().state, 'idle', 'nothing brings the call back');
  });
}

out('iOS: answer on Android / answer from the lock screen (owner 05.10, after #26)');
const AND_ID = '7a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const ringingCk = id => [{callUUID: id.toUpperCase(), hasConnected: false, hasEnded: false, outgoing: false}];
await check('iPhone not on screen, answered on Android: the ringing CallKit call is left to the cancel push (no repeated incoming)', async () => {
  // Before: JS ended CallKit on the socket 'ended', the cancel VoIP push then found no call and
  // AppDelegate had to show a placeholder incoming call and end it — "the iPhone rings again".
  const {V, M} = await fresh({os: 'ios', ckCalls: ringingCk(AND_ID)});
  await initIos(V);
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: AND_ID, state: 'ended', reason: 'answered_elsewhere'});
  await sleep(20);
  assert.equal(ck(M, 'reportEndCallWithUUID').filter(c => c[1] === AND_ID).length, 0, 'not ended before the cancel push');
  assert.notEqual(V.getCallState().state, 'ringing');
  M.ckCalls = []; // the cancel push ended it natively (CallKeepHelper.reportCallEnded, same UUID)
  await sleep(90); // 3 s wait (scaled)
  assert.equal(ck(M, 'reportEndCallWithUUID').filter(c => c[1] === AND_ID).length, 0);
  assert.equal(ck(M, 'endCall').filter(c => c[1] === AND_ID).length, 0);
  assert.equal(posted(M, 'end', AND_ID).length + posted(M, 'reject', AND_ID).length, 0, 'nothing sent');
});
await check('iPhone not on screen, cancel push lost: JS ends the ringing CallKit call after 3 s', async () => {
  const {V, M} = await fresh({os: 'ios', ckCalls: ringingCk(AND_ID)});
  await initIos(V);
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: AND_ID, state: 'ended', reason: 'answered_elsewhere'});
  await sleep(90);
  assert.ok(ck(M, 'reportEndCallWithUUID').some(c => c[1] === AND_ID && c[2] === 4), 'ended as answered elsewhere');
});
await check('app on screen: the CallKit call is ended at once (the cancel push then shows nothing)', async () => {
  const {V, M} = await fresh({os: 'ios', appState: 'active', ckCalls: ringingCk(AND_ID)});
  await initIos(V);
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: AND_ID, state: 'ended', reason: 'answered_elsewhere'});
  await sleep(20);
  assert.ok(ck(M, 'reportEndCallWithUUID').some(c => c[1] === AND_ID && c[2] === 4));
});
await check('iPhone not on screen, a call in progress ended by the other side: CallKit ends at once', async () => {
  const {V, M} = await fresh({os: 'ios', ckCalls: [{callUUID: AND_ID.toUpperCase(), hasConnected: true, hasEnded: false, outgoing: false}]});
  await initIos(V);
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: AND_ID, state: 'ended', reason: 'hangup'});
  await sleep(20);
  assert.ok(ck(M, 'reportEndCallWithUUID').some(c => c[1] === AND_ID), 'no 3 s of a dead conversation on screen');
});
await check('answer in CallKit for a call JS saw only in CallKit: the call window shows the caller, not «Неизвестный»', async () => {
  const {V, M} = await fresh({os: 'ios'});
  await initIos(V);
  for (const cb of M.ckListeners.didDisplayIncomingCall || []) cb({callUUID: 'f00d0000-0000-4000-8000-000000000001', localizedCallerName: 'Totus', payload: {placeholderFor: AND_ID}});
  for (const cb of M.ckListeners.didDisplayIncomingCall || []) cb({callUUID: AND_ID, localizedCallerName: 'Поддержка Totus', payload: {}});
  for (const cb of M.ckListeners.answerCall || []) cb({callUUID: AND_ID});
  await sleep(10);
  assert.equal(V.getCallState().state, 'answered');
  assert.equal(V.getCallState().callerName, 'Поддержка Totus');
});
await check('answer on the lock screen before JS started: the name comes from the CallKit event queue', async () => {
  const {V, M} = await fresh({os: 'ios'});
  M.initialEvents = [
    {name: 'RNCallKeepDidDisplayIncomingCall', data: {callUUID: AND_ID, localizedCallerName: 'Поддержка Totus', payload: {}}},
    {name: 'RNCallKeepPerformAnswerCallAction', data: {callUUID: AND_ID}},
  ];
  await initIos(V);
  await sleep(40);
  assert.equal(V.getCallState().state, 'answered');
  assert.equal(V.getCallState().callUUID, AND_ID);
  assert.equal(V.getCallState().callerName, 'Поддержка Totus');
});
await check('no name from CallKit: the call window takes the caller name from the server', async () => {
  const {V, M} = await fresh({os: 'ios', calls: {[AND_ID]: {state: 'ringing', callerName: 'Оператор'}}});
  M.initialEvents = [{name: 'RNCallKeepPerformAnswerCallAction', data: {callUUID: AND_ID}}];
  await initIos(V);
  await sleep(150);
  assert.equal(V.getCallState().callUUID, AND_ID);
  assert.equal(V.getCallState().callerName, 'Оператор');
});
await check('Android: caller names from CallKit / server are not applied (Android flow unchanged)', async () => {
  const {V, M} = await fresh({calls: {a9: {state: 'ringing', callerName: 'Сервер'}}});
  await initAndroid(V);
  await ringing(V, 'a9');
  assert.equal(V.getCallState().callerName, 'Тест');
});

out('iOS: support call while the iPhone is in the background / closed (05.10)');
const UP = id => id.toUpperCase(); // CallKit getCalls() returns upper-case UUIDs
const SUP = '5e1f0c2a-7d3b-4c6e-9a1f-2b3c4d5e6f70';
await check('iPhone woken by the VoIP push: the ringing CallKit call is NOT ended by the server check', async () => {
  const {V, M} = await fresh({os: 'ios', calls: {[SUP]: {state: 'ringing', callerName: 'Поддержка Totus'}},
    ckCalls: [{callUUID: UP(SUP), hasConnected: false, hasEnded: false, outgoing: false}]});
  await initIos(V);
  for (const cb of M.socketHandlers.connect || []) cb();
  await sleep(60);
  assert.ok(M.gets.includes(SUP), 'asked the server with the lower-case call id');
  assert.ok(!M.gets.includes(UP(SUP)), 'never with the upper-case CallKit UUID (server: 404)');
  const ended = [...ck(M, 'reportEndCallWithUUID'), ...ck(M, 'endCall')].filter(c => String(c[1]).toLowerCase() === SUP);
  assert.deepEqual(ended, [], 'CallKit call left ringing');
});
await check('iPhone opened while CallKit rings: the call becomes the app call (one call in window and CallKit)', async () => {
  const {V, M} = await fresh({os: 'ios', calls: {[SUP]: {state: 'ringing', callerName: 'Поддержка Totus'}},
    ckCalls: [{callUUID: UP(SUP), hasConnected: false, hasEnded: false, outgoing: false}]});
  await initIos(V);
  await resume(M);
  assert.equal(V.getCallState().state, 'ringing');
  assert.equal(V.getCallState().callUUID, SUP);
  assert.equal(V.getCallState().callerName, 'Поддержка Totus');
  assert.equal(ck(M, 'reportEndCallWithUUID').length, 0);
});
await check('declined on Android while the iPhone app is open: window and CallKit both end (reportEndCall, declinedElsewhere)', async () => {
  const {V, M} = await fresh({os: 'ios', calls: {[SUP]: {state: 'ringing'}},
    ckCalls: [{callUUID: UP(SUP), hasConnected: false, hasEnded: false, outgoing: false}]});
  await initIos(V);
  await resume(M);
  assert.equal(V.getCallState().state, 'ringing');
  M.ckCalls.length = 0; // CallKit closes the call on reportEndCall
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: SUP, state: 'ended', reason: 'rejected_elsewhere'});
  await sleep(60);
  assert.notEqual(V.getCallState().state, 'ringing');
  assert.ok(ck(M, 'reportEndCallWithUUID').some(c => c[1] === SUP && c[2] === 5), JSON.stringify(ck(M, 'reportEndCallWithUUID')));
  assert.equal(ck(M, 'endCall').length, 0, 'no CXEndCallAction needed');
  assert.equal(posted(M, 'end', SUP).length + posted(M, 'reject', SUP).length, 0, 'nothing sent for a call ended elsewhere');
});
await check('ended elsewhere, JS never knew the call (only CallKit): CallKit ends', async () => {
  const {V, M} = await fresh({os: 'ios', appState: 'active'});
  await initIos(V);
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: SUP, state: 'ended', reason: 'answered_elsewhere'});
  await sleep(20);
  assert.ok(ck(M, 'reportEndCallWithUUID').some(c => c[1] === SUP && c[2] === 4));
});
await check('CallKit still shows the call after reportEndCall: ended by CXEndCallAction, no /end, current state untouched', async () => {
  const {V, M} = await fresh({os: 'ios', appState: 'active', ckCalls: [{callUUID: UP(SUP), hasConnected: false, hasEnded: false, outgoing: false}]});
  await initIos(V);
  for (const cb of M.socketHandlers['call-state'] || []) cb({callId: SUP, state: 'ended', reason: 'hangup'});
  await sleep(80); // 1.5 s check (scaled)
  assert.ok(ck(M, 'endCall').some(c => c[1] === SUP), 'fallback endCall');
  for (const cb of M.ckListeners.endCall || []) cb({callUUID: SUP}); // CallKit performEndCallAction -> JS
  await sleep(20);
  assert.equal(posted(M, 'end', SUP).length, 0, 'the app-initiated end is not sent to the server');
});

console.log = quiet.log;
console.warn = quiet.warn;
console.error = quiet.error;

out('Native sources');
await check('iOS AppDelegate: VoIP push call_ended ends the CallKit call; incoming path unchanged', async () => {
  const ad = read('ios/totusClubApp/AppDelegate.swift');
  const cancel = ad.indexOf('== "call_ended"');
  const incoming = ad.indexOf('CallKeepHelper.reportIncomingCall(\n        reportCallId');
  assert.ok(cancel > 0 && incoming > cancel, 'cancel handled before the incoming report');
  const block = ad.slice(cancel, incoming);
  assert.ok(/CallKeepHelper\.reportCallEnded\(/.test(block));
  assert.ok(/completion\(\)/.test(block) && /return\n/.test(block));
  assert.ok(/PKPushRegistry\(queue: voipPushQueue\)/.test(ad), 'registry still created at launch (own queue)');
});
await check('iOS CallKeepHelper: PushKit completion runs while the call is still in CallKit, the end comes after', async () => {
  // iOS 13+: at completion the app must have a call in CallKit; ending it before completion makes
  // iOS kill the app and, after a few pushes, stop delivering VoIP pushes (no incoming calls at all).
  const m = read('ios/totusClubApp/CallKeepHelper.m');
  const h = read('ios/totusClubApp/CallKeepHelper.h');
  assert.ok(/\+ \(void\)reportCallEnded:\(NSString \*\)callId/.test(h));
  const body = m.slice(m.indexOf('+ (void)reportCallEnded:'), m.lastIndexOf('@end'));
  const exist = body.slice(body.indexOf('if (existing) {'), body.indexOf('NSString *placeholderId'));
  assert.ok(exist.indexOf('completion();') >= 0 && exist.indexOf('completion();') < exist.indexOf('endCallKitCall:safeCallId'),
    'existing call: completion before the end');
  assert.ok(/dispatch_async\(dispatch_get_main_queue\(\), \^\{\s*\[self endCallKitCall:safeCallId/.test(exist), 'end on the next run-loop turn');
  assert.ok(/existing\.hasConnected && \[reason isEqualToString:@"answered_elsewhere"\]/.test(exist), 'answered call kept on answered_elsewhere');
  assert.ok(!/reportIncomingCall:safeCallId/.test(body), 'an ended call UUID is never reported again');
  const ph = body.slice(body.indexOf('NSString *placeholderId'));
  assert.ok(/placeholderId = \[\[NSUUID UUID\] UUIDString\]/.test(ph), 'placeholder gets a new UUID');
  assert.ok(/\[self reportIncomingCall:placeholderId/.test(ph), 'no call in CallKit: a placeholder is reported');
  assert.ok(ph.indexOf('completion();') >= 0 && ph.indexOf('completion();') < ph.indexOf('endCallKitCall:placeholderId'),
    'placeholder: completion before the end');
  for (const [r, v] of [['answered_elsewhere', 4], ['rejected', 5], ['missed', 3]]) {
    assert.ok(new RegExp(`"${r}"[^]*?return ${v};`).test(m), r);
  }
});
await check('iOS: CallKit provider is set up natively at launch, before PushKit (closed / background iPhone rings)', async () => {
  // Crash reports 05.10 (TestFlight 1.0.19 (8) and (10)): FRONTBOARD 0xbaadca11, Role: Non UI —
  // iOS killed the app launched in the background by the VoIP push because no call was reported.
  const ad = read('ios/totusClubApp/AppDelegate.swift');
  const setup = ad.indexOf('CallKeepHelper.setupCallKitNatively()');
  const registry = ad.indexOf('PKPushRegistry(queue: voipPushQueue)');
  assert.ok(setup > 0 && registry > setup, 'CallKit set up before the PushKit registry');
  const m = read('ios/totusClubApp/CallKeepHelper.m');
  const fn = m.slice(m.indexOf('+ (void)setupCallKitNatively'), m.indexOf('+ (void)reportIncomingCall:'));
  assert.ok(/\[RNCallKeep setup:options\]/.test(fn), 'react-native-callkeep native setup');
  const js = read('src/modules/voip/VoipService.ts');
  const jsName = (js.match(/ios:\s*\{\s*appName:\s*'([^']+)'/) || [])[1];
  const opts = m.slice(m.indexOf('+ (NSDictionary *)callKitOptions'), m.indexOf('+ (void)setupCallKitNatively'));
  assert.ok(/\[self callKitOptions\]/.test(fn), 'setup uses the shared CallKit options');
  assert.ok(jsName && opts.includes(`@"appName": @"${jsName}"`), 'same appName as JS CALLKEEP_OPTIONS');
  const report = m.slice(m.indexOf('+ (void)reportIncomingCall:'), m.indexOf('// RNCallKeep endCallWithUUID'));
  assert.ok(!/getBridge/.test(report), 'reporting a call does not touch the React Native bridge');
  assert.ok(/\+ \(void\)setupCallKitNatively;/.test(read('ios/totusClubApp/CallKeepHelper.h')));
});
await check('Android native: endRemote ends only this call (ringing, notification, Telecom); late Telecom call finished', async () => {
  const mod = read('android/app/src/main/java/com/totus/com/TotusCallModule.kt');
  const man = read('android/app/src/main/java/com/totus/com/TotusCallManager.kt');
  const svc = read('android/app/src/main/java/com/totus/com/TotusConnectionService.kt');
  assert.ok(/fun endRemote\(callId: String\)[^}]*TotusCallManager\.endRemote/.test(mod));
  const fn = man.slice(man.indexOf('fun endRemote('), man.indexOf('private fun cancelIncomingNotification'));
  assert.ok(/dismissIncoming\(context, callId\)/.test(fn) && /TotusTelecom\.disconnect\(callId/.test(fn));
  assert.ok(!/stopAll|disconnectAll/.test(fn), 'other calls untouched');
  assert.ok(/isFinished\(callId\)[^]*finish\(DisconnectCause\.REMOTE\)/.test(svc));
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
