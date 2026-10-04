// Check: one call window for the whole app (owner report 05.10.2026, Android + iOS).
//
// Run: node scripts/check-call-modal-owner.mjs   (Node >= 18, no npm install)
//
// "Аккаунт" -> "Звонок в поддержку" -> support answers -> the call window does not react to any
// tap (Завершить, microphone, speaker, minimize). Cause: Account.tsx opened its own second
// CallModal right after the answer, on top of the global one in App.tsx (two native modal
// windows for one call). Expected now:
//  - only App.tsx renders <CallModal> (every screen just starts the call, like the support chat);
//  - Account starts the call only after its "Звонок в поддержку" sheet has closed (iOS does not
//    show a modal presented while another one is being dismissed);
//  - the end / reject buttons close the window even if ending the call throws.

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

function sourceFiles(dir) {
  const res = [];
  if (!fs.existsSync(dir)) {
    return res;
  }
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'assets') {
        res.push(...sourceFiles(p));
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      res.push(p);
    }
  }
  return res;
}
// Code only (comments removed), so a comment mentioning <CallModal> does not count.
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

out('Call window owner');
check('only App.tsx renders <CallModal> (one window per call)', () => {
  const files = [path.join(root, 'App.tsx'), ...sourceFiles(path.join(root, 'src'))];
  const renderers = files
    .filter(f => /<CallModal[\s/>]/.test(code(fs.readFileSync(f, 'utf8'))))
    .map(f => path.relative(root, f).split(path.sep).join('/'));
  assert.deepEqual(renderers, ['App.tsx']);
});
check('Account: no own call window, the call starts after the support sheet has closed', () => {
  const a = code(read('src/component/account/Account.tsx'));
  assert.ok(!/import\s*\{[^}]*\bCallModal\b[^}]*\}/.test(a), 'CallModal is not imported');
  assert.ok(!/setCallModalVisible/.test(a), 'no local call window state');
  const fn = a.slice(a.indexOf('const handleCallSupportApp'), a.indexOf('const handlePrivacyPolicy'));
  const wait = fn.indexOf('await closeSupportSheet()');
  const start = fn.indexOf('startOutgoingVoiceCallByLoyaltyId(');
  assert.ok(wait >= 0 && start > wait, 'sheet closed before the call starts');
  assert.ok(/onDismiss=\{onDismissed\}/.test(a), 'sheet reports the end of its dismissal (iOS)');
  assert.ok(/onDismissed=\{\(\) => supportSheetClosedRef\.current\?\.\(\)\}/.test(a));
  assert.ok(/setTimeout\(done, \d+\)/.test(a), 'fallback if onDismiss never comes');
});
check('CallModal: Завершить / Сбросить always close the window', () => {
  const m = code(read('src/component/UI/callModal/CallModal.tsx'));
  const end = m.slice(m.indexOf('const handleEndCall'), m.indexOf('const handleRejectCall'));
  assert.ok(/try \{\s*endCall\(\);\s*\} finally \{\s*onClose\?\.\(\);\s*\}/.test(end), end);
  const rej = m.slice(m.indexOf('const handleRejectCall'), m.indexOf('// Always read fresh state'));
  assert.ok(/\} finally \{\s*onClose\?\.\(\);\s*\}/.test(rej), rej);
});
check('App.tsx: the global window follows the call state (closes when the call is idle / ended)', () => {
  const app = code(read('App.tsx'));
  assert.ok(/<CallModal\s+visible=\{callModalVisible && !isMinimized\}/.test(app));
  assert.ok(/currentState === 'ended' \|\| currentState === 'rejected'[\s\S]{0,120}setCallModalVisible\(false\)/.test(app));
  assert.ok(/currentState === 'idle'\)\s*\{[\s\S]{0,160}setCallModalVisible\(false\)/.test(app));
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
