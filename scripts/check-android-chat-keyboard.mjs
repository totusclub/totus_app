// Android: в «Чате с поддержкой» поле ввода полностью над клавиатурой (edge-to-edge, targetSdk 36).
// Положение клавиатуры — из WindowInsets (нативный модуль TotusKeyboard). iOS не меняется.
// Запуск: node scripts/check-android-chat-keyboard.mjs (без npm install).
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
const kt = code(read('android/app/src/main/java/com/totus/com/TotusKeyboardModule.kt'));
const pkg = code(read('android/app/src/main/java/com/totus/com/TotusKeyboardPackage.kt'));
const app = code(read('android/app/src/main/java/com/totusclubapp/MainApplication.kt'));

const fn = (name, args) => {
  const body = hook.match(new RegExp(`export function ${name}\\([\\s\\S]*?\\): number \\{([\\s\\S]*?)\\n\\}`))[1];
  // eslint-disable-next-line no-new-func
  return new Function(...args, body);
};
const fromNative = fn('computeInsetFromNative', ['containerY', 'containerHeight', 'native']);
const fallback = fn('computeKeyboardInset', ['containerY', 'containerHeight', 'screenHeight', 'keyboard', 'navBottomInset']);

console.log('Android: чат поддержки и клавиатура');

check('по WindowInsets: edge-to-edge — подъём ровно на клавиатуру (вместе с панелью навигации)', () => {
  // окно 900, IME 380 (включая панель навигации 48) → верх клавиатуры 520
  const native = {imeVisible: true, imeBottom: 380, navBottom: 48, windowHeight: 900};
  assert.equal(fromNative(0, 900, native), 380);
  // контейнер не до низа окна (например, 852) — поднимаем только на перекрытие
  assert.equal(fromNative(0, 852, native), 332);
});

check('по WindowInsets: старый Android (окно уменьшилось) и закрытая клавиатура — 0', () => {
  assert.equal(fromNative(0, 520, {imeVisible: true, imeBottom: 380, navBottom: 48, windowHeight: 900}), 0);
  assert.equal(fromNative(0, 900, {imeVisible: false, imeBottom: 0, navBottom: 48, windowHeight: 900}), 0);
  assert.equal(fromNative(0, 300, {imeVisible: true, imeBottom: 5000, navBottom: 0, windowHeight: 900}), 0, 'не больше контейнера');
});

check('запасной расчёт (сборка без нативного модуля) — как раньше', () => {
  assert.equal(fallback(0, 900, 900, {screenY: 568, height: 332}, 48), 380);
  assert.equal(fallback(0, 520, 900, {screenY: 520, height: 332}, 48), 0);
});

check('нативный модуль TotusKeyboard: getInsets читает WindowInsets; окно (softInputMode, decor) не меняется; зарегистрирован', () => {
  assert.match(kt, /override fun getName\(\): String = "TotusKeyboard"/);
  assert.match(kt, /ViewCompat\.getRootWindowInsets\(decor\)/);
  assert.match(kt, /insets\.getInsets\(WindowInsetsCompat\.Type\.ime\(\)\)/);
  assert.match(kt, /map\.putDouble\("imeBottom", ime\.bottom \/ density\)/);
  assert.match(kt, /map\.putDouble\("windowHeight", decor\.height \/ density\)/);
  assert.ok(!/setWindowInsetsAnimationCallback|setSoftInputMode|setDecorFitsSystemWindows/.test(kt), 'окно не меняется');
  assert.match(pkg, /listOf\(TotusKeyboardModule\(reactContext\)\)/);
  assert.match(app, /add\(TotusCallPackage\(\)\)\s*add\(TotusKeyboardPackage\(\)\)/);
});

check('основной путь (Android 15+): экран уменьшается нативно, как adjustResize, только пока чат на экране', () => {
  assert.match(kt, /fun setImeResize\(enabled: Boolean, promise: Promise\)/);
  assert.match(kt, /if \(activity == null \|\| Build\.VERSION\.SDK_INT < 35\) \{\s*promise\.resolve\(false\)/);
  assert.match(kt, /activity\.findViewById<View>\(android\.R\.id\.content\)/);
  assert.match(kt, /ViewCompat\.setOnApplyWindowInsetsListener\(content\) \{ view, insets ->\s*val imeBottom = insets\.getInsets\(WindowInsetsCompat\.Type\.ime\(\)\)\.bottom/);
  assert.match(kt, /view\.setPadding\(view\.paddingLeft, view\.paddingTop, view\.paddingRight, imeBottom\)/);
  assert.match(kt, /view\.paddingRight, imeBottom\)\s*\}\s*insets\s*\}/, 'insets передаются дальше без изменений');
  assert.match(kt, /ViewCompat\.setOnApplyWindowInsetsListener\(content, null\)\s*content\.setPadding\(content\.paddingLeft, content\.paddingTop, content\.paddingRight, 0\)/);
  assert.match(kt, /ViewCompat\.requestApplyInsets\(content\)/);
  assert.ok(!/decorView\)\s*\{/.test(kt.replace(/getRootWindowInsets\(decor\)/, '')), 'слушатель не на decorView');
  assert.match(hook, /const isFocused = useIsFocused\(\);/);
  assert.match(hook, /if \(!isAndroid \|\| !isFocused\) \{\s*return undefined;/);
  assert.match(hook, /setImeResize\(true\)/);
  assert.match(hook, /if \(enabled\) \{\s*setInset\(0\);/);
  assert.match(hook, /setImeResize\?\.\(false\)\.catch\(\(\) => undefined\);/);
  assert.match(hook, /\} else \{\s*stopFallback = startFallback\(\);/);
});

check('запасной путь: опрос 250 мс (только когда приложение активно) + события клавиатуры + onLayout', () => {
  assert.match(hook, /Platform\.OS === 'android' \? NativeModules\.TotusKeyboard : undefined/);
  assert.match(hook, /const POLL_INTERVAL_MS = 250;/);
  assert.match(hook, /setInterval\(recompute, POLL_INTERVAL_MS\)/);
  assert.match(hook, /AppState\.addEventListener\('change'/);
  assert.match(hook, /clearInterval\(timer\);/);
  assert.match(hook, /const next = computeInsetFromNative\(y, height, native\);/);
  assert.match(hook, /Keyboard\.addListener\('keyboardDidShow', onShow\)/);
});

check('чат: на Android — внешний контейнер для замера, отступ снизу; iOS без изменений', () => {
  assert.match(chat, /useAndroidKeyboardInset\(insets\.bottom\);/);
  assert.match(chat, /androidKeyboardInset > 0 \? \{paddingBottom: androidKeyboardInset\} : null,/);
  assert.match(chat, /bottomInset=\{androidKeyboardInset > 0 \? 0 : insets\.bottom\}/);
  assert.match(chat, /<View\s+ref=\{containerRef\}\s+onLayout=\{onContainerLayout\}\s+style=\{styles\.container\}\s+collapsable=\{false\}>/);
  assert.match(chat, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.match(chat, /if \(Platform\.OS !== 'android'\) \{\s*return screen;\s*\}/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
