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

const hook = code(read('src/hooks/useAndroidKeyboardInset.ts'));
const chat = code(read('src/component/support/SupportChat.tsx'));

// Расчёт отступа — как в хуке: низ контейнера минус верх клавиатуры, только при реальном перекрытии
const insetFor = (y, height, keyboardTop) => {
  const overlap = Math.round(y + height - keyboardTop);
  return overlap > 0 && overlap < height ? overlap : 0;
};

console.log('Android: чат поддержки и клавиатура');

check('хук работает только на Android; iOS — 0 и без подписок', () => {
  assert.match(hook, /if \(Platform\.OS !== 'android'\) \{\s*return undefined;\s*\}/);
  assert.match(hook, /Keyboard\.addListener\('keyboardDidShow', onShow\)/);
  assert.match(hook, /Keyboard\.addListener\('keyboardDidHide', onHide\)/);
  assert.match(hook, /showSub\.remove\(\);\s*hideSub\.remove\(\);/);
});

check('отступ = фактическое перекрытие: edge-to-edge — поднимаем; adjustResize уже сработал — 0 (без двойного подъёма)', () => {
  assert.match(hook, /const overlap = Math\.round\(y \+ height - keyboardTop\);\s*setInset\(overlap > 0 && overlap < height \? overlap : 0\);/);
  // экран 800, клавиатура 300 + панель навигации 48 → верх клавиатуры 452
  assert.equal(insetFor(0, 800, 452), 348, 'edge-to-edge: поле над клавиатурой, с учётом панели навигации');
  assert.equal(insetFor(0, 452, 452), 0, 'старый Android: окно уже уменьшено');
  assert.equal(insetFor(0, 800, 900), 0, 'клавиатура ниже контейнера');
  assert.equal(insetFor(0, 800, -10), 0, 'странные координаты — не ломаем экран');
});

check('чат: на Android — внешний контейнер для замера, отступ снизу, без лишнего нижнего поля над клавиатурой', () => {
  assert.match(chat, /const \{containerRef, inset: androidKeyboardInset\} = useAndroidKeyboardInset\(\);/);
  assert.match(chat, /androidKeyboardInset > 0 \? \{paddingBottom: androidKeyboardInset\} : null,/);
  assert.match(chat, /bottomInset=\{androidKeyboardInset > 0 \? 0 : insets\.bottom\}/);
  assert.match(chat, /<View ref=\{containerRef\} style=\{styles\.container\} collapsable=\{false\}>\s*\{screen\}\s*<\/View>/);
});

check('iOS без изменений: тот же KeyboardAvoidingView padding, экран без обёртки', () => {
  assert.match(chat, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.match(chat, /if \(Platform\.OS !== 'android'\) \{\s*return screen;\s*\}/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
