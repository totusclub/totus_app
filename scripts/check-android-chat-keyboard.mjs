// Android: в «Чате с поддержкой» поле ввода поднимается над клавиатурой (edge-to-edge, targetSdk 36).
// iOS не меняется. Запуск: node scripts/check-android-chat-keyboard.mjs (без npm install).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e && e.message ? e.message : e}`);
  }
}

const hookSrc = read('src/hooks/useAndroidKeyboardInset.ts');
const hook = code(hookSrc);
const chat = code(read('src/component/support/SupportChat.tsx'));

// computeKeyboardInset из хука — как функция (без типов)
const fnSrc = hook.match(/export function computeKeyboardInset\([\s\S]*?\): number \{([\s\S]*?)\n\}/)[1];
// eslint-disable-next-line no-new-func
const compute = new Function('containerY', 'containerHeight', 'screenHeight', 'keyboard', 'navBottomInset', fnSrc);

console.log('Android: чат поддержки и клавиатура');

check('расчёт подъёма: edge-to-edge — поле полностью над клавиатурой, включая панель навигации', () => {
  // экран 900, панель навигации 48, клавиатура (IME) 380 → RN: height = 380 − 48 = 332;
  // верх клавиатуры на самом деле 520, а screenY от RN на ~панель ниже (568) — как на скриншоте
  const kb = {screenY: 568, height: 332};
  assert.equal(compute(0, 900, 900, kb, 48), 380, 'подъём на всю клавиатуру, а не на 332');
  // RN прислал верный screenY — тоже 380
  assert.equal(compute(0, 900, 900, {screenY: 520, height: 332}, 48), 380);
});

check('старый Android (adjustResize сработал) — 0, без двойного подъёма', () => {
  // окно уменьшилось: контейнер 0..520, под ним свободно 380
  assert.equal(compute(0, 520, 900, {screenY: 520, height: 332}, 48), 0);
  // контейнер не доходит до низа экрана на высоту панели (без edge-to-edge) — поднимаем только на клавиатуру
  assert.equal(compute(0, 852, 900, {screenY: 520, height: 332}, 48), 332);
});

check('без клавиатуры или странные значения — 0', () => {
  assert.equal(compute(0, 900, 900, {screenY: 900, height: 0}, 48), 0);
  assert.equal(compute(0, 0, 900, {screenY: 520, height: 332}, 48), 0);
  assert.equal(compute(0, 300, 900, {screenY: -2000, height: 5000}, 48), 0, 'не больше высоты контейнера');
});

check('хук: только Android; замер сразу и повторно (120/300/600 мс) и при смене размера окна; сброс при закрытии', () => {
  assert.match(hook, /const isAndroid = Platform\.OS === 'android';/);
  assert.match(hook, /if \(!isAndroid\) \{\s*return undefined;\s*\}/);
  assert.match(hook, /const REMEASURE_DELAYS_MS = \[0, 120, 300, 600\];/);
  assert.match(hook, /timers = REMEASURE_DELAYS_MS\.map\(delay => setTimeout\(recompute, delay\)\);/);
  assert.match(hook, /Keyboard\.addListener\('keyboardDidShow', onShow\)/);
  assert.match(hook, /Keyboard\.addListener\('keyboardDidHide', onHide\)/);
  assert.match(hook, /keyboardRef\.current = null;\s*clearTimers\(\);\s*setInset\(0\);/);
  assert.match(hook, /computeKeyboardInset\(y, height, Dimensions\.get\('screen'\)\.height, keyboard, navInsetRef\.current\)/);
  assert.match(hook, /if \(keyboardRef\.current\) \{\s*recompute\(\);/);
});

check('чат: на Android — внешний контейнер для замера (с onLayout), отступ снизу, композер без лишнего поля', () => {
  assert.match(chat, /useAndroidKeyboardInset\(insets\.bottom\);/);
  assert.match(chat, /androidKeyboardInset > 0 \? \{paddingBottom: androidKeyboardInset\} : null,/);
  assert.match(chat, /bottomInset=\{androidKeyboardInset > 0 \? 0 : insets\.bottom\}/);
  assert.match(chat, /<View\s+ref=\{containerRef\}\s+onLayout=\{onContainerLayout\}\s+style=\{styles\.container\}\s+collapsable=\{false\}>\s*\{screen\}\s*<\/View>/);
});

check('iOS без изменений: тот же KeyboardAvoidingView padding, экран без обёртки', () => {
  assert.match(chat, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.match(chat, /if \(Platform\.OS !== 'android'\) \{\s*return screen;\s*\}/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
