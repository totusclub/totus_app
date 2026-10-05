// Check: a VoIP push always reaches CallKit on iOS (owner report 05.10.2026: closed / background /
// locked iPhone does not ring, crash FRONTBOARD 0xbaadca11, Role: Non UI, main thread idle).
//
// Run: node scripts/check-ios-voip-push.mjs   (Node >= 18, no npm install)
//
// iOS 13+ kills an app woken by a VoIP push if it does not report a call to CallKit in the same run
// loop. Before this fix the report went through react-native-callkeep +reportNewIncomingCall, which
// sends it to a lazily created static CXProvider and silently does nothing (no report, completion
// never called) when that provider is missing; JS registerVoipToken() also created a second, local
// PKPushRegistry next to the app one. Expected now (iOS native only, JS and Android untouched):
//  - AppDelegate reports to CallKit first; the JS event (VoIPPushModule) is posted after the report;
//  - CallKeepHelper reports straight to a CXProvider that always exists, logs CallKit's answer,
//    runs the PushKit completion only from CallKit's completion and sends the same
//    didDisplayIncomingCall event as react-native-callkeep;
//  - calls are ended on the same provider;
//  - the process has one PKPushRegistry: the library's voipRegistration only re-sends the token.

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = console.log.bind(console);
let failed = 0;
let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    out(`  ok   ${name}`);
  } catch (e) {
    failed++;
    out(`  FAIL ${name}\n       ${e && e.message ? e.message : e}`);
  }
}
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
// Code only (comments removed).
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"])\/\/.*$/gm, '$1');
// Body of an ObjC method / Swift func starting at `start` (balanced braces).
function body(src, start) {
  const i = src.indexOf(start);
  assert.ok(i >= 0, `not found: ${start}`);
  const open = src.indexOf('{', i);
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === '{') depth++;
    if (src[k] === '}' && --depth === 0) {
      return src.slice(open, k + 1);
    }
  }
  throw new Error(`unbalanced: ${start}`);
}

const ad = code(read('ios/totusClubApp/AppDelegate.swift'));
const m = code(read('ios/totusClubApp/CallKeepHelper.m'));
const vm = code(read('ios/totusClubApp/VoipPushHelper.m'));
const vh = read('ios/totusClubApp/VoipPushHelper.h');

out('iOS VoIP push -> CallKit');
check('AppDelegate: every push branch reports to CallKit before anything else is posted', () => {
  const h = body(ad, 'func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith');
  assert.ok(!/NotificationCenter\.default\.post/.test(h), 'no direct NotificationCenter post in the handler');
  const reports = [...h.matchAll(/CallKeepHelper\.(reportCallEnded|reportIncomingCall)\(/g)].map(x => x.index);
  const posts = [...h.matchAll(/postVoIPPushReceived\(/g)].map(x => x.index);
  assert.equal(reports.length, 3, 'call_ended, incoming and bad-payload branches report');
  assert.equal(posts.length, 3, 'each branch posts the JS event once');
  for (let i = 0; i < 3; i++) {
    assert.ok(reports[i] < posts[i], `branch ${i + 1}: report before the JS event`);
  }
  assert.ok(reports[0] > h.indexOf('== "call_ended"'), 'cancel push branch first');
  assert.ok(/NSLog\("\[TotusVoIP\] VoIP push received/.test(h), 'handler entry visible in Console.app');
});
check('AppDelegate: PushKit completion runs only from the CallKit report callbacks', () => {
  const h = body(ad, 'func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith');
  const calls = [...h.matchAll(/completion\(\)/g)].length;
  const inCallbacks = [...h.matchAll(/\) \{\s*completion\(\)\n/g)].length;
  assert.equal(calls, 3);
  assert.equal(inCallbacks, 3, 'completion() only inside the CallKeepHelper callbacks');
  const post = body(ad, 'private func postVoIPPushReceived');
  assert.ok(/name: NSNotification\.Name\("VoIPPushReceived"\)/.test(post), 'VoIPPushModule event kept');
});
check('CallKeepHelper: the report goes straight to a CXProvider, completion from CallKit only', () => {
  const r = body(m, '+ (void)reportIncomingCall:(NSString *)callId');
  assert.ok(!/\[RNCallKeep reportNewIncomingCall/.test(r), 'no silent no-op path through the library static');
  assert.ok(/CXProvider \*provider = \[self callKitProvider\];/.test(r));
  const cb = r.slice(r.indexOf('[provider reportNewIncomingCallWithUUID:uuid update:update completion:'));
  assert.ok(cb.length > 0 && cb.indexOf('completion();') > 0, 'completion inside the CallKit completion');
  assert.ok(/CallKit refused incoming call/.test(cb), 'CallKit error logged');
  assert.ok(!/getBridge/.test(r), 'no React Native bridge needed');
  assert.ok(/initWithUUIDString:safeCallId[^]*if \(uuid == nil\)[^]*\[NSUUID UUID\]/.test(r), 'a non-UUID id never reaches CallKit as nil');
  assert.ok(/initWithType:CXHandleTypeGeneric value:safeHandle/.test(r), 'same generic handle as before');
  assert.ok(/removeObjectForKey:@"offer"/.test(r), 'SDP offer not kept in the event payload');
});
check('CallKeepHelper: same didDisplayIncomingCall event as react-native-callkeep (JS unchanged)', () => {
  const r = body(m, '+ (void)reportIncomingCall:(NSString *)callId');
  assert.ok(/sendEventWithNameWrapper:@"RNCallKeepDidDisplayIncomingCall"/.test(r));
  for (const key of ['error', 'errorCode', 'callUUID', 'handle', 'localizedCallerName', 'hasVideo', 'supportsHolding',
    'supportsDTMF', 'supportsGrouping', 'supportsUngrouping', 'fromPushKit', 'payload']) {
    assert.ok(r.includes(`@"${key}":`), `event key ${key}`);
  }
  assert.ok(/respondsToSelector:@selector\(sendEventWithNameWrapper:body:\)/.test(r), 'private API guarded');
});
check('CallKeepHelper: a CallKit provider always exists (library one, or a fallback with the same delegate)', () => {
  const p = body(m, '+ (CXProvider *)callKitProvider');
  assert.ok(/RNCallKeep \*callKeep = \[RNCallKeep allocWithZone:nil\];/.test(p));
  assert.ok(/if \(callKeep\.callKeepProvider != nil\) \{\s*return callKeep\.callKeepProvider;/.test(p), 'library provider first');
  assert.ok(/fallbackProvider = \[\[CXProvider alloc\] initWithConfiguration:config\];/.test(p));
  assert.ok(/\[fallbackProvider setDelegate:callKeep queue:nil\];/.test(p), 'answer / end still reach RNCallKeep -> JS');
  assert.ok(/callKeep\.callKeepProvider = fallbackProvider;/.test(p));
  assert.ok(/config\.supportsVideo = NO;[^]*maximumCallGroups = 1;[^]*maximumCallsPerCallGroup = 1;/.test(p), 'same options');
  assert.ok(/return fallbackProvider;\s*\}$/.test(p), 'never returns without a provider');
  const s = body(m, '+ (void)setupCallKitNatively');
  assert.ok(/\[self callKitOptions\]/.test(s) && /\[RNCallKeep setup:options\]/.test(s), 'native setup kept');
});
check('CallKeepHelper: calls are ended on the provider they were reported to', () => {
  const e = body(m, '+ (void)endCallKitCall:(NSString *)callId reason:(int)reason');
  assert.ok(/\[\[self callKitProvider\] reportCallWithUUID:uuid endedAtDate:\[NSDate date\] reason:endedReason\]/.test(e));
  for (const [n, r] of [[1, 'Failed'], [3, 'Unanswered'], [4, 'AnsweredElsewhere'], [5, 'DeclinedElsewhere']]) {
    assert.ok(new RegExp(`case ${n}: endedReason = CXCallEndedReason${r};`).test(e), `reason ${n}`);
  }
  assert.ok(/default: endedReason = CXCallEndedReasonRemoteEnded;/.test(e));
  const ended = body(m, '+ (void)reportCallEnded:(NSString *)callId');
  assert.ok(!/\[RNCallKeep endCallWithUUID/.test(ended), 'no silent no-op end through the library static');
  assert.equal([...ended.matchAll(/\[self endCallKitCall:/g)].length, 2);
});
check('One PKPushRegistry: created at launch, the library no longer creates its own', () => {
  const launch = body(ad, 'func application(\n    _ application: UIApplication,\n    didFinishLaunchingWithOptions');
  const guard = launch.indexOf('VoipPushHelper.useAppRegistryOnly(registry)');
  assert.ok(guard > launch.indexOf('PKPushRegistry(queue: .main)'), 'guard gets the app registry');
  assert.ok(guard < launch.indexOf('registry.desiredPushTypes = [.voIP]'), 'guard before the registry is active');
  assert.ok(launch.indexOf('CallKeepHelper.setupCallKitNatively()') < guard, 'CallKit still set up first');
  assert.ok(/\+ \(void\)useAppRegistryOnly:\(PKPushRegistry \*\)registry;/.test(vh));
  const u = body(vm, '+ (void)useAppRegistryOnly:(PKPushRegistry *)registry');
  assert.ok(/dispatch_once/.test(u) && /method_exchangeImplementations\(original, replacement\)/.test(u));
  assert.ok(/class_getClassMethod\(cls, @selector\(voipRegistration\)\)/.test(u));
  assert.ok(/class_getClassMethod\(cls, @selector\(totus_voipRegistration\)\)/.test(u));
  const t = body(vm, '+ (void)totus_voipRegistration');
  assert.ok(!/PKPushRegistry alloc/.test(t), 'no second registry');
  assert.ok(/didUpdatePushCredentials:totusLastCredentials forType:totusLastType/.test(t), 'token re-sent to JS');
  assert.ok(/pushTokenForType:PKPushTypeVoIP/.test(t), 'token read from the app registry otherwise');
  const d = body(vm, '+ (void)didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type');
  assert.ok(/totusLastCredentials = credentials;/.test(d) && /\[RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:type\]/.test(d));
});
check('Cancel push with no CallKit call: nothing shown in the foreground / during another call (no repeated incoming)', () => {
  // Owner 05.10: answered on Android -> the iPhone showed an incoming call again and ended it.
  // Apple DTS: a VoIP push needs no new call while the app is in the foreground or on a call.
  const e = body(m, '+ (void)reportCallEnded:(NSString *)callId');
  const skip = e.indexOf('if ([self isAppInForeground] || otherLiveCall) {');
  const placeholder = e.indexOf('NSString *placeholderId');
  assert.ok(skip > 0 && placeholder > skip, 'foreground / other call checked before the placeholder');
  const branch = e.slice(skip, placeholder);
  assert.ok(/completion\(\);[^]*return;/.test(branch) && !/reportIncomingCall/.test(branch), 'completion only, no report');
  assert.ok(/if \(call\.hasEnded\) \{\s*continue;/.test(e) && /otherLiveCall = YES;/.test(e), 'live calls counted');
  const t = body(m, '+ (void)trackForegroundState');
  for (const n of ['UIApplicationWillEnterForegroundNotification', 'UIApplicationDidBecomeActiveNotification', 'UIApplicationDidEnterBackgroundNotification']) {
    assert.ok(t.includes(n), n);
  }
  assert.ok(/atomic_store\(&totusAppInForeground/.test(t) && /atomic_load\(&totusAppInForeground\)/.test(m), 'atomic: read on the PushKit queue');
  assert.ok(/\[self trackForegroundState\];/.test(body(m, '+ (void)setupCallKitNatively')), 'tracked from launch');
});
check('AppDelegate: React Native starts in the background only after CallKit has the incoming call', () => {
  const h = body(ad, 'func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith');
  const starts = [...h.matchAll(/startReactNativeAfterCallKitReport\(\)/g)].map(x => x.index);
  assert.equal(starts.length, 1, 'only the incoming-call branch');
  const report = h.lastIndexOf('CallKeepHelper.reportIncomingCall(\n        reportCallId', starts[0]);
  const done = h.indexOf('completion()', report);
  assert.ok(report > 0 && done > report && starts[0] > done, 'inside the report callback, after completion()');
  assert.ok(h.indexOf('== "call_ended"') < report, 'not for the cancel push');
  const a = body(ad, 'fileprivate func startReactNativeAfterCallKitReport()');
  assert.ok(/incomingCallReported = true/.test(a));
  assert.ok(/rootViewFactory\.view\(\s*withModuleName: "totusClubApp"/.test(a), 'no window yet: JS without a window');
  const s = body(ad, 'func startReactNativeIfNeeded()');
  assert.ok(/if let rootView = backgroundRootView/.test(s) && /window\.rootViewController = rootViewController/.test(s), 'same JS shown when opened');
  assert.ok(/applicationState == \.background && !appDelegate\.incomingCallReported/.test(ad), 'scene in background: start only after the report');
  assert.ok(/func sceneDidBecomeActive[^]*startReactNativeIfNeeded\(\)/.test(ad), 'opening the app still starts / shows JS');
});
check('JS and Android untouched: JS still registers the token and reads CallKeep events as before', () => {
  const js = read('src/modules/voip/VoipService.ts');
  assert.ok(/VoipPushNotification\.registerVoipToken\(\)/.test(js));
  assert.ok(/addEventListener\('didDisplayIncomingCall'/.test(js));
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
