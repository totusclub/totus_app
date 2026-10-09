// Check: no English text on the call screens (owner request 09.10.2026: «перевести все английские
// надписи на экранах звонков… не должно оставаться английского текста»).
//
// Run: node scripts/check-call-texts-ru.mjs   (Node >= 18; the callText.ts part needs Node >= 22.18)
//
// What is covered:
//  - CallModal / MinimizedCallView / IncomingCallNotification: every visible text is Russian
//    (iOS had SPEAKER / MUTE, Android already had ДИНАМИК / МИКРОФОН);
//  - caller name when a push has none: the internal English placeholders of VoipService
//    ('Incoming call', 'Totus call') reach the screen and the Android notifications only through
//    callerNameForDisplay() -> «Входящий звонок» / «Totus Club»; iOS CallKit (AppDelegate,
//    CallKeepHelper) shows «Входящий звонок»; VoipService / CallService are not changed;
//  - call errors in alerts are Russian (callErrorText), not raw English exception text;
//  - Android call strings (strings.xml) and the iOS microphone / Bluetooth prompts are Russian.
// Call logic is untouched: only literals change (see the call-flow checks for behaviour).

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';

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
// Code only (comments removed).
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"])\/\/.*$/gm, '$1').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
// Brand and technical words allowed inside a visible Russian text.
const ALLOWED_LATIN = new Set(['Totus', 'Club', 'ID', 'Bluetooth']);
function englishWords(text) {
  // ${…} is code inside a template literal, not text.
  return (text.replace(/\$\{[^}]*\}/g, ' ').match(/[A-Za-z]{3,}/g) || []).filter(w => !ALLOWED_LATIN.has(w));
}

/** Visible strings of a React Native screen: JSX text, string literals rendered in {…}, Alert texts. */
function visibleStrings(src) {
  const c = code(src);
  const res = [];
  for (const m of c.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)) {
    const inner = m[1];
    for (const t of inner.replace(/\{[\s\S]*?\}/g, ' ').split('\n')) {
      if (t.trim()) res.push(t.trim());
    }
    // String literals rendered as text; comparison operands (state === 'answered') are not text.
    for (const lit of inner.matchAll(/'([^'\n]*)'/g)) {
      if (!/[=!]==\s*$/.test(inner.slice(0, lit.index))) res.push(lit[1]);
    }
  }
  for (const m of c.matchAll(/(?:statusText|hint|displayName|title|label)\s*=\s*[^;]*?'([^'\n]+)'/g)) res.push(m[1]);
  for (const m of c.matchAll(/Alert\.alert\(\s*'([^']*)'(?:\s*,\s*[`']([^`']*)[`'])?/g)) {
    res.push(m[1]);
    if (m[2]) res.push(m[2]);
  }
  for (const m of c.matchAll(/(?:placeholder|accessibilityLabel)="([^"]+)"/g)) res.push(m[1]);
  for (const m of c.matchAll(/setError\('([^']+)'\)/g)) res.push(m[1]);
  return res;
}

out('Call screens (React Native)');
for (const rel of [
  'src/component/UI/callModal/CallModal.tsx',
  'src/component/UI/callModal/MinimizedCallView.tsx',
  'src/component/UI/incomingCallNotification/IncomingCallNotification.tsx',
  'src/screens/calls/CallsScreen.tsx',
  'src/screens/calls/AddContactModal.tsx',
]) {
  await check(`${rel}: every visible text is Russian`, () => {
    const strings = visibleStrings(read(rel));
    assert.ok(strings.length > 0, 'texts found');
    const bad = strings.filter(s => englishWords(s).length > 0);
    assert.deepEqual(bad, []);
  });
}
await check('CallModal: iOS labels are the same Russian labels as Android (no SPEAKER / MUTE)', () => {
  const c = code(read('src/component/UI/callModal/CallModal.tsx'));
  assert.ok(!/'SPEAKER'|'MUTE'/.test(c));
  assert.equal((c.match(/>ДИНАМИК</g) || []).length, 2, 'speaker label while calling and while talking');
  assert.equal((c.match(/>МИКРОФОН</g) || []).length, 1);
  for (const t of ['Входящий звонок', 'Нет ответа', 'ОТВЕТИТЬ', 'ПОЗВОНИТЬ', 'Закрыть', 'Звонок завершён', 'Звонок отклонён']) {
    assert.ok(c.includes(t), t);
  }
});

out('\nCaller name when the push has none');
await check('JS: screens and Android notifications show the name through callerNameForDisplay()', () => {
  const uses = [
    ['src/component/UI/callModal/CallModal.tsx', /const displayName = callerNameForDisplay\(effectiveState\.callerName\) \|\| 'Неизвестный';/],
    ['src/component/UI/callModal/MinimizedCallView.tsx', /const displayName = callerNameForDisplay\(currentState\.callerName\) \|\| 'Неизвестный';/],
    ['src/component/UI/incomingCallNotification/IncomingCallNotification.tsx', /\{callerNameForDisplay\(callerName\) \|\| 'Неизвестный'\}/],
    ['src/modules/voip/androidCallUi.ts', /m\.updateCall\(String\(callId\), Boolean\(isIncoming\), callerName \? callerNameForDisplay\(String\(callerName\)\) : ''\)/],
    ['src/modules/voip/androidCallUi.ts', /m\.startOngoing\(String\(callId\), callerName \? callerNameForDisplay\(String\(callerName\)\) : ''\)/],
  ];
  for (const [rel, re] of uses) {
    assert.ok(re.test(code(read(rel))), `${rel}: ${re}`);
  }
});
await check('VoipService / CallService untouched: internal placeholders stay as the call logic expects', () => {
  const v = read('src/modules/voip/VoipService.ts');
  assert.ok(/value === 'Incoming call'/.test(v), 'rememberCallerName still skips the internal placeholder');
  assert.ok(/callerName \|\| 'Totus call'/.test(v));
});
await check('iOS: CallKit fallback name is «Входящий звонок» (AppDelegate, CallKeepHelper)', () => {
  const ad = code(read('ios/totusClubApp/AppDelegate.swift'));
  const m = code(read('ios/totusClubApp/CallKeepHelper.m'));
  assert.ok(!/"Incoming call"/.test(ad) && !/@"Incoming call"/.test(m));
  assert.ok(/let reportName = callerName \?\? "Входящий звонок"/.test(ad));
  assert.ok(/callerName: "Входящий звонок",/.test(ad), 'bad-payload branch');
  assert.ok(/callerName : @"Входящий звонок";/.test(m));
});

out('\nNative texts');
await check('Android strings.xml: call texts are Russian', () => {
  const x = read('android/app/src/main/res/values/strings.xml');
  const items = [...x.matchAll(/<string name="(totus_[^"]+)">([^<]*)<\/string>/g)];
  assert.ok(items.length >= 15, 'call strings found');
  const bad = items.filter(([, , v]) => englishWords(v).length > 0).map(([, k, v]) => `${k}=${v}`);
  assert.deepEqual(bad, []);
});
await check('Android: call notifications take texts from resources only (no English literals)', () => {
  const k = code(read('android/app/src/main/java/com/totus/com/TotusCallManager.kt'));
  for (const fn of ['setContentText(', 'addAction(0, ', 'NotificationChannel(']) {
    for (const m of k.matchAll(new RegExp(fn.replace(/[()]/g, '\\$&') + '[^\\n]*', 'g'))) {
      assert.ok(!/"[A-Za-z][^"]*"/.test(m[0]) || /CHANNEL_ID/.test(m[0]), m[0]);
    }
  }
});
await check('iOS Info.plist: microphone and Bluetooth prompts (shown for calls) are Russian', () => {
  const p = read('ios/totusClubApp/Info.plist');
  for (const key of ['NSMicrophoneUsageDescription', 'NSBluetoothPeripheralUsageDescription']) {
    const m = p.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
    assert.ok(m, key);
    assert.deepEqual(englishWords(m[1]), [], `${key}: ${m[1]}`);
  }
});

out('\nErrors when a call cannot start');
await check('Account, support chat and «Звонки» show callErrorText(e), not the raw exception', () => {
  for (const rel of ['src/component/account/Account.tsx', 'src/component/support/SupportChat.tsx', 'src/screens/calls/CallsScreen.tsx']) {
    const c = code(read(rel));
    assert.ok(/import \{\s*callErrorText\s*\} from '\.\.\/\.\.\/modules\/voip\/callText';/.test(c), `${rel}: import`);
    assert.ok(/\$\{callErrorText\(e\)\}/.test(c), `${rel}: used`);
    assert.ok(!/`Не удалось (?:позвонить в поддержку|начать звонок): \$\{errorMessage\}`/.test(c), `${rel}: raw message gone`);
  }
});

if (!process.features || !process.features.typescript) {
  out('SKIP callText.ts runtime: need Node >= 22.18');
} else {
  const t = await import(pathToFileURL(path.join(root, 'src/modules/voip/callText.ts')).href);
  await check('callText: internal English names become Russian, real names stay as they are', () => {
    const d = t.callerNameForDisplay;
    assert.equal(d('Incoming call'), 'Входящий звонок', 'VoipService');
    assert.equal(d('Incoming Call'), 'Входящий звонок', 'CallService');
    assert.equal(d('Входящий звонок'), 'Входящий звонок', 'iOS AppDelegate');
    assert.equal(d('Totus call'), 'Totus Club', 'ongoing-call notification');
    assert.equal(d('Поддержка Totus'), 'Поддержка Totus');
    assert.equal(d('Иван Петров'), 'Иван Петров');
    assert.equal(d(''), '');
    assert.equal(d(null), '');
    assert.equal(d(undefined), '');
  });
  await check('callText: every VoipService error becomes a Russian reason', () => {
    const cases = [
      ['Нет доступа к микрофону', 'нет доступа к микрофону'],
      ['Target loyaltyId is required', 'не указан получатель звонка'],
      ['Device ID (VoIP token) not available. Please wait for VoIP initialization.', 'устройство ещё не зарегистрировано'],
      ['Another call is already in progress', 'у вас уже есть активный звонок'],
      ['Network error: Failed to start call: User is offline', 'собеседник сейчас не в сети'],
      ['Network error: Failed to start call: Backend returned 500', 'сервер звонков временно недоступен'],
      ['Network error: Network request failed', 'нет связи с сервером'],
      ['Local description not set after createOffer', 'попробуйте ещё раз чуть позже'],
    ];
    for (const [msg, expected] of cases) {
      const text = t.callErrorText(new Error(msg));
      assert.ok(text.startsWith(expected), `${msg} -> ${text}`);
      assert.deepEqual(englishWords(text), [], text);
    }
    assert.deepEqual(englishWords(t.callErrorText(null)), []);
    assert.deepEqual(englishWords(t.callErrorText({})), []);
  });
}

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
