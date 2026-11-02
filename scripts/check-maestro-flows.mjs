// Check: Maestro scenarios in .maestro/ are consistent with the app code and safe to run daily.
//
// Run: node scripts/check-maestro-flows.mjs   (Node >= 18, no npm install)
//
// What is checked (scenarios: .maestro/README_RU.md):
//  - every flow in .maestro/flows has appId ${APP_ID}, a name and a known tag (daily / auth / fresh);
//  - every runFlow file exists;
//  - every on-screen text a flow waits for or taps exists in the app sources (src/), so a renamed
//    button breaks this check before it breaks the morning run. Texts of the Маша package
//    (@tosmedia/ai-assistant-native) and of iOS/Android system dialogs are listed below;
//  - flows never type text and never tap buttons that send, pay, log in or delete
//    (no personal data, no real orders, no messages to Маша or to support staff);
//  - the runner scripts/maestro-checkup.sh exists, is executable and runs the daily tag.

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

function filesIn(dir, ext) {
  const res = [];
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) {
    return res;
  }
  for (const e of fs.readdirSync(abs, {withFileTypes: true})) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      res.push(...filesIn(rel, ext));
    } else if (ext.some(x => e.name.endsWith(x))) {
      res.push(rel);
    }
  }
  return res;
}

const flows = filesIn('.maestro/flows', ['.yaml']);
const subflows = filesIn('.maestro/subflows', ['.yaml']);
const allFlows = [...flows, ...subflows];

// All app source text in one string (for "does this text exist in the app").
const srcText = filesIn('src', ['.ts', '.tsx', '.js', '.jsx']).map(read).join('\n');

// Texts that live outside src/: the Маша chat package (totus_ai_v2/packages/ai-assistant-native,
// ChatPanel.tsx) and system dialogs (iOS App Tracking Transparency, permission prompts).
const EXTERNAL_TEXTS = [
  'Маша · Тотус клуб',
  'Онлайн · подбор туров',
  'Спросите совет или опишите тур…',
  'Назад',
  'Попросить приложение не отслеживать',
  'Попросить не отслеживать',
  'Ask App Not to Track',
  'Не разрешать',
  'Запретить',
  'Don',
  'llow',
];

// Selectors the app must show: text: "…" / visible: "…" (single line, double quotes).
// Skipped: assertNotVisible / notVisible — those texts are expected to be absent
// (e.g. the removed PIN screen), so they may not exist in src/ at all.
function selectors(rel) {
  const res = [];
  let command = '';
  for (const line of read(rel).split('\n')) {
    const cmd = line.match(/^\s*-\s*(\w+):/);
    if (cmd && !/^(text|visible|notVisible)$/.test(cmd[1])) {
      command = cmd[1];
    }
    const m = line.match(/^\s*(?:-\s*)?(text|visible|notVisible):\s*"((?:[^"\\]|\\.)*)"\s*$/);
    if (!m || m[1] === 'notVisible' || command === 'assertNotVisible') {
      continue;
    }
    res.push(m[2].replace(/\\\\/g, '\\'));
  }
  return res;
}

// Literal fragments of a regex selector: split on regex syntax, keep pieces with letters.
function fragments(selector) {
  return selector
    .replace(/\\d\+?|\\S|\\s/g, '|')
    .split(/[|()[\]*+?.^$]+/)
    .map(x => x.trim())
    .filter(x => /[A-Za-zА-Яа-яЁё]{2,}/.test(x));
}

check('there are daily flows and subflows', () => {
  assert.ok(flows.length >= 4, `only ${flows.length} flows in .maestro/flows`);
  assert.ok(subflows.includes(path.join('.maestro/subflows', 'start.yaml')), 'subflows/start.yaml missing');
  assert.match(read('.maestro/config.yaml'), /flows\/\*/, 'config.yaml must run flows/* only');
});

for (const rel of flows) {
  const s = read(rel);
  check(`${path.basename(rel)}: appId \${APP_ID}, name, known tag`, () => {
    assert.match(s, /^appId: \$\{APP_ID\}$/m);
    assert.match(s, /^name: ".+"$/m);
    const tags = (s.match(/^tags:\n((?:\s+- \w+\n)+)/m) || [])[1] || '';
    assert.match(tags, /- (daily|auth|fresh)\b/, 'tag daily | auth | fresh required');
  });
}

for (const rel of allFlows) {
  const s = read(rel);
  check(`${path.basename(rel)}: runFlow files exist`, () => {
    const re = /^\s*(?:-\s*runFlow|file):\s*([^\s#]+\.yaml)\s*$/gm;
    let m;
    while ((m = re.exec(s))) {
      const target = path.join(path.dirname(rel), m[1]);
      assert.ok(fs.existsSync(path.join(root, target)), `${m[1]} not found (from ${rel})`);
    }
  });
  check(`${path.basename(rel)}: every on-screen text exists in the app`, () => {
    for (const sel of selectors(rel)) {
      for (const frag of fragments(sel)) {
        const known = srcText.includes(frag) || EXTERNAL_TEXTS.some(t => t.includes(frag));
        assert.ok(known, `"${frag}" (selector "${sel}") not found in src/ — renamed in the UI?`);
      }
    }
  });
  check(`${path.basename(rel)}: never types or taps send / pay / login / delete`, () => {
    assert.doesNotMatch(s, /^\s*-\s*(inputText|inputRandom\w*|eraseText|pasteText)\b/m, 'flows must not type anything');
    const taps = [...s.matchAll(/-\s*tapOn:\s*\n\s+text:\s*"([^"]*)"/g), ...s.matchAll(/-\s*tapOn:\s*"([^"]*)"/g)].map(m => m[1]);
    const forbidden = /Отправить|Оплатить|Войти|Зарегистрироваться|Выйти|Удалить|Позвонить|➤/;
    for (const t of taps) {
      assert.doesNotMatch(t, forbidden, `forbidden tap "${t}"`);
    }
  });
}

check('runner scripts/maestro-checkup.sh is executable and runs the daily tag', () => {
  const p = path.join(root, 'scripts/maestro-checkup.sh');
  assert.ok(fs.existsSync(p), 'scripts/maestro-checkup.sh missing');
  assert.ok(fs.statSync(p).mode & 0o111, 'scripts/maestro-checkup.sh is not executable');
  const s = fs.readFileSync(p, 'utf8');
  assert.match(s, /--include-tags/);
  assert.match(s, /daily/);
  assert.match(s, /app\.totus\.club/);
  assert.match(s, /com\.totus\.com/);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
