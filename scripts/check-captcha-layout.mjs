// Check: капча Яндекса на входе и регистрации — окно растёт по заданию, дизайн Яндекса не меняется.
//
// Run: node scripts/check-captcha-layout.mjs   (Node >= 22.18, no npm install)
//
// Как было: окно капчи в форме — 360 точек (предел 520), поэтому Яндекс ужимал картинку задания
// до ~218×70 и обрезал низ панели; увеличение пальцами было запрещено (user-scalable=no);
// клавиатура закрывала поле ввода; режима `webview` не было.
// Причина: события задания были заданы параметрами render ('challenge-visible-callback'), а Яндекс
// сообщает о них только через smartCaptcha.subscribe — окно вообще не узнавало о задании.
// Стало: задание открылось → окно до полной высоты панели (440 CSS px, картинка 248×81),
// на телефоне вся капча до 1.2× крупнее, пальцами — до 3×, форма прокручивается к заданию
// (и ещё раз — когда открылась клавиатура), после решения окно снова размером с чекбокс.

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
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

if (!process.features || !process.features.typescript) {
  out('SKIP: need Node >= 22.18 (TypeScript type stripping)');
  process.exit(0);
}

const L = await import(pathToFileURL(path.join(root, 'src/component/UI/YandexSmartCaptcha/layout.ts')).href);
const comp = code(read('src/component/UI/YandexSmartCaptcha/index.tsx'));

out('Капча: размеры окна');

await check('телефон 430 (окно 390): увеличение ~1.14, ширина страницы не меньше 343 CSS px', () => {
  const s = L.getCaptchaScale(390);
  assert.ok(s > 1.1 && s <= 1.2, String(s));
  assert.ok(L.getCaptchaCssWidth(390, s) >= 343, String(L.getCaptchaCssWidth(390, s)));
});

await check('узкий экран (окно 300 / 335): без увеличения (Яндекс уменьшил бы картинку)', () => {
  assert.equal(L.getCaptchaScale(300), 1);
  assert.equal(L.getCaptchaScale(335), 1);
});

await check('широкий экран (окно 480): не больше 1.2×', () => {
  assert.equal(L.getCaptchaScale(480), 1.2);
  assert.ok(L.getCaptchaCssWidth(480, 1.2) >= 343);
});

await check('планшет (окно 600+): 1×', () => {
  assert.equal(L.getCaptchaScale(600), 1);
  assert.equal(L.getCaptchaScale(1024), 1);
});

await check('ширина ещё не замерена (0): 1×', () => {
  assert.equal(L.getCaptchaScale(0), 1);
});

await check('задание открыто: окно не меньше полной панели (440 CSS px × scale), без предела 520', () => {
  assert.equal(L.getCaptchaBoxHeight(124, 1, true), 440);
  assert.equal(L.getCaptchaBoxHeight(124, 1.2, true), 528);
  assert.ok(L.getCaptchaBoxHeight(124, 1.2, true) > 520);
  // страница с открытым заданием сообщает высоту окна — окно от этого не уменьшается
  assert.equal(L.getCaptchaBoxHeight(440, 1.2, true), 528);
});

await check('задание закрыто / решено: окно по чекбоксу', () => {
  assert.equal(L.getCaptchaBoxHeight(124, 1, false), 124);
  assert.equal(L.getCaptchaBoxHeight(0, 1, false), 108);
  assert.equal(L.getCaptchaBoxHeight(124, 1.1, false), 137);
  assert.ok(L.getCaptchaScale(350) >= 1 && L.getCaptchaCssWidth(350, L.getCaptchaScale(350)) >= 343);
});

await check('viewport: старт = scale, пальцами до 3×, zoom не запрещён', () => {
  const v = L.buildCaptchaViewport(321, 1.09);
  assert.match(v, /width=321/);
  assert.match(v, /initial-scale=1\.09/);
  assert.match(v, /minimum-scale=1\.09/);
  assert.match(v, /maximum-scale=3/);
  assert.match(v, /user-scalable=yes/);
});

out('Капча: компонент');

await check('страница капчи берёт viewport из layout, а не user-scalable=no / maximum-scale=1', () => {
  assert.ok(!/user-scalable=no/.test(comp));
  assert.ok(!/maximum-scale=1[,"\s]/.test(comp));
  assert.match(comp, /content="\$\{viewport\}"/);
  assert.match(comp, /buildCaptchaViewport\(getCaptchaCssWidth\(boxWidth, scale\), scale\)/);
});

await check('render: webview: true (режим Яндекса для WebView), test не включён', () => {
  assert.match(comp, /webview:\s*true/);
  assert.ok(!/\btest:\s*true/.test(comp));
});

await check('задание: subscribe(challenge-visible / challenge-hidden), а не параметры render, которые Яндекс не вызывает', () => {
  assert.match(comp, /var widgetId = window\.smartCaptcha\.render\(/);
  assert.match(comp, /smartCaptcha\.subscribe\(widgetId, event, fn\)/);
  for (const ev of ['challenge-visible', 'challenge-hidden', 'network-error', 'token-expired']) {
    assert.match(comp, new RegExp(`on\\('${ev}'`), ev);
  }
  assert.ok(!/'challenge-visible-callback'|'error-callback'|'token-expired-callback'/.test(comp));
});

await check('нет старых пределов 360 / 520', () => {
  assert.ok(!/CHALLENGE_HEIGHT\s*=\s*360/.test(comp));
  assert.ok(!/\b520\b/.test(comp));
  assert.match(comp, /getCaptchaBoxHeight\(reportedHeight, scale, challengeOpen\)/);
});

await check('высота чекбокса — по контейнеру, а не по документу (с заданием документ = окно)', () => {
  const fn = comp.slice(comp.indexOf('function reportHeight'), comp.indexOf('function renderCaptcha'));
  assert.ok(!/documentElement\.scrollHeight/.test(fn), fn);
  assert.match(fn, /captcha-container/);
});

await check('challenge open → окно растёт и форма прокручивается; hidden / success → окно по чекбоксу', () => {
  assert.match(comp, /if \(open\) scrollPending\.current = true;\s*setChallengeOpen\(open\)/);
  assert.match(comp, /emitStatus\('solved'\);\s*onTokenChange\(token\);\s*setChallengeOpen\(false\)/);
  assert.match(comp, /onLayout=\{onBoxLayout\}/);
  assert.match(comp, /measureLayout\(/);
  assert.match(comp, /scroll\.scrollTo\(\{ y: Math\.max\(0, y - SCROLL_GAP\)/);
});

await check('клавиатура открылась при открытом задании → снова к окну капчи', () => {
  assert.match(comp, /Keyboard\.addListener\('keyboardDidShow'/);
  assert.match(comp, /if \(!challengeOpen\) return;/);
});

await check('Android: увеличение пальцами без кнопок +/−', () => {
  assert.match(comp, /setBuiltInZoomControls\b/);
  assert.match(comp, /setDisplayZoomControls=\{false\}/);
  assert.match(comp, /scalesPageToFit\b/);
});

await check('ширина окна — по первому замеру (смена ширины не перезагружает капчу)', () => {
  assert.match(comp, /setBoxWidth\(prev => \(prev > 0 \? prev : w\)\)/);
});

out('Капча: экраны');

for (const screen of ['LoginScreen', 'SignupScreen']) {
  await check(`${screen}: ScrollView формы передан в капчу`, () => {
    const s = code(read(`src/screens/auth/${screen}.tsx`));
    assert.match(s, /const scrollRef = useRef<ScrollView>\(null\)/);
    assert.match(s, /<ScrollView\s+ref=\{scrollRef\}/);
    assert.match(s, /<YandexSmartCaptcha[\s\S]*?scrollRef=\{scrollRef\}/);
  });
}

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
