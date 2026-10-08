// Android: на экране Милы (AI) поле ввода над клавиатурой — тот же нативный режим, что в чате
// поддержки (TotusKeyboardModule.setImeResize). iOS не меняется.
// Запуск: node scripts/check-android-ai-keyboard.mjs (без npm install).
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

const hook = code(read('src/hooks/useAndroidImeResize.ts'));
const screen = code(read('src/screens/ai/TotusAiChatScreen.tsx'));

console.log('Android: экран Милы и клавиатура');

check('хук: только Android, только пока экран в фокусе; включает и выключает нативный режим', () => {
  assert.match(hook, /Platform\.OS === 'android' \? NativeModules\.TotusKeyboard : undefined/);
  assert.match(hook, /const isFocused = useIsFocused\(\);/);
  assert.match(hook, /if \(Platform\.OS !== 'android' \|\| !isFocused \|\| !setImeResize\) \{\s*return undefined;/);
  assert.match(hook, /setImeResize\(true\)/);
  assert.match(hook, /return \(\) => \{\s*cancelled = true;\s*setImeResize\(false\)\.catch\(\(\) => undefined\);/);
  assert.match(hook, /\}, \[isFocused\]\);/);
});

check('экран Милы использует хук; ChatScreen, отступы и навигация как раньше', () => {
  assert.match(screen, /import \{ useAndroidImeResize \} from '\.\.\/\.\.\/hooks\/useAndroidImeResize';/);
  assert.match(screen, /useAndroidImeResize\(\);/);
  assert.match(screen, /<ChatScreen\s+topInset=\{insets\.top\}\s+bottomInset=\{Math\.max\(insets\.bottom, 8\)\}\s+showBackButton\s+onBack=\{handleBack\}\s*\/>/);
});

check('нативный режим уже есть в модуле (Android 15+, только android.R.id.content)', () => {
  const kt = code(read('android/app/src/main/java/com/totus/com/TotusKeyboardModule.kt'));
  assert.match(kt, /fun setImeResize\(enabled: Boolean, promise: Promise\)/);
  assert.match(kt, /Build\.VERSION\.SDK_INT < 35/);
  assert.match(kt, /activity\.findViewById<View>\(android\.R\.id\.content\)/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
