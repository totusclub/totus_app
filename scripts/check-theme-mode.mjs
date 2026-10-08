// Тема оформления в приложении: «Светлая / Тёмная / Системная» (по умолчанию — Системная), выбор только в «Аккаунте».
// Запуск: node scripts/check-theme-mode.mjs (без npm install).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

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

const ctx = code(read('src/context/ThemeContext.tsx'));
const account = code(read('src/component/account/Account.tsx'));

console.log('Тема оформления (приложение)');

check('по умолчанию — Системная для всех: новый ключ, старый (light/dark) удаляется; мусор → Системная', () => {
  assert.match(ctx, /const THEME_STORAGE_KEY = '@app_theme_mode_v2';/);
  assert.match(ctx, /const LEGACY_THEME_STORAGE_KEY = '@app_theme_mode';/);
  assert.match(ctx, /AsyncStorage\.removeItem\(LEGACY_THEME_STORAGE_KEY\)/);
  assert.match(ctx, /useState<ThemeMode>\('system'\)/);
  const body = ctx.match(/const parseThemeMode = \(value: unknown\): ThemeMode =>\s*([^;]+);/)[1];
  // eslint-disable-next-line no-new-func
  const parse = new Function('value', `return ${body};`);
  assert.equal(parse('light'), 'light');
  assert.equal(parse('dark'), 'dark');
  for (const v of [null, undefined, '', 'system', 'auto']) assert.equal(parse(v), 'system');
  assert.match(ctx, /applyMode\(parseThemeMode\(savedMode\)\);/);
});

check('выбор сохраняется; Системная — ключ удаляется; тема устройства меняется на лету только в Системной', () => {
  assert.match(ctx, /nextMode === 'system'\s*\?\s*AsyncStorage\.removeItem\(THEME_STORAGE_KEY\)\s*:\s*AsyncStorage\.setItem\(THEME_STORAGE_KEY, nextMode\)/);
  assert.match(ctx, /Appearance\.addChangeListener\(\(\{ colorScheme \}\) => \{\s*if \(modeRef\.current === 'system'\) \{\s*setSystemColorScheme\(colorScheme\);/);
  assert.match(ctx, /if \(nextMode === 'system'\) \{\s*setSystemColorScheme\(Appearance\.getColorScheme\(\) \|\| 'light'\);/);
});

check('системные элементы iOS — в теме приложения; Android не трогаем (окно звонка)', () => {
  assert.match(ctx, /if \(Platform\.OS !== 'ios' \|\| typeof Appearance\.setColorScheme !== 'function'\) return;/);
  assert.match(ctx, /Appearance\.setColorScheme\(mode === 'system' \? null : mode\);/);
  assert.ok(/uiMode/.test(read('android/app/src/main/AndroidManifest.xml')), 'MainActivity переживает смену темы устройства');
});

check('Аккаунт: строка «Оформление» и три кнопки вместо переключателя', () => {
  assert.match(account, /\{ value: 'light', label: 'Светлая' \},\s*\{ value: 'dark', label: 'Тёмная' \},\s*\{ value: 'system', label: 'Системная' \},/);
  assert.match(account, /system: 'Как в системе',/);
  assert.match(account, /const \{ theme, isDark, mode, setThemeMode \} = useTheme\(\);/);
  assert.match(account, /accessibilityRole="radiogroup"/);
  assert.match(account, /onPress=\{\(\) => setThemeMode\(option\.value\)\}/);
  assert.ok(!/<Switch|toggleTheme|Тёмная тема'|Светлая тема'/.test(account), 'переключателя нет');
  assert.match(account, /themeSegment: \{\s*flexDirection: 'row',\s*marginLeft: 52,/);
});

check('выбор темы — только в Аккаунте (не на экране входа)', () => {
  const login = ['src/screens/auth/login.tsx', 'src/screens/login/index.tsx', 'src/component/auth/Login.tsx'].filter((f) => fs.existsSync(path.join(root, f)));
  for (const f of login) assert.ok(!/setThemeMode/.test(read(f)), f);
  assert.match(code(read('src/component/UI/text/index.tsx')), /style\?: StyleProp<TextStyle>;/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
