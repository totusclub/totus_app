// Check: the app has no access PIN screen (owner request 06.10.2026).
//
// Run: node scripts/check-no-app-pin.mjs   (Node >= 18, no npm install)
//
// Since the first commit the Home tab showed PasscodeModal ("Введите пароль" / "Для доступа к
// приложению", code 2103 hard-coded) until the code was entered once (AsyncStorage 'pinCode').
// The same gate was removed from the website in totus_WEB #17. Expected now:
//  - PasscodeModal does not exist and nothing imports it;
//  - no source reads or writes the 'pinCode' key or contains the code;
//  - the Home tab renders its content right away (search, trips, destinations).
// Login by e-mail code (Verification) is not a PIN screen and is not touched.

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
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

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
const files = [
  ...['App.tsx', 'index.js'].map(f => path.join(root, f)).filter(f => fs.existsSync(f)),
  ...sourceFiles(path.join(root, 'src')),
];
const rel = f => path.relative(root, f).split(path.sep).join('/');

out('No access PIN in the app');
check('PasscodeModal is gone and nothing imports it', () => {
  assert.ok(!fs.existsSync(path.join(root, 'src/component/home/PasscodeModal.tsx')), 'file removed');
  const users = files.filter(f => /PasscodeModal/.test(code(fs.readFileSync(f, 'utf8')))).map(rel);
  assert.deepEqual(users, []);
});
check("no 'pinCode' gate and no hard-coded access code in the sources", () => {
  const hits = files
    .filter(f => {
      const c = code(fs.readFileSync(f, 'utf8'));
      return /['"]pinCode['"]/.test(c) || /['"]2103['"]/.test(c) || /CORRECT_PASSCODE/.test(c);
    })
    .map(rel);
  assert.deepEqual(hits, []);
});
check('Home tab shows its content at once (no hidden empty screen)', () => {
  const home = code(read('src/component/home/Home.tsx'));
  assert.ok(!/isPasscodeVerified|showPasscodeModal|AsyncStorage/.test(home), 'no gate state');
  assert.match(home, /return \(\s*<ScrollView/, 'ScrollView rendered directly');
  for (const part of ['<Search ', '<PlaningTrip ', '<PopularDestinationsList ']) {
    assert.ok(home.includes(part), part);
  }
});
check('login by e-mail code is unchanged (not a PIN)', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/component/auth/Verification.tsx')));
  assert.ok(fs.existsSync(path.join(root, 'src/component/UI/verificationCode/index.tsx')));
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
