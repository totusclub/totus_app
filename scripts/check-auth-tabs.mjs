// Check: вход и регистрация на одном экране — переключатель «Вход / Регистрация» (вариант A, 30.10.2026).
//
// Run: node scripts/check-auth-tabs.mjs   (Node >= 18, no npm install)
//
// Как было: экран назывался «Вход», в нём одно поле почты и ни одной ссылки на регистрацию —
// на «Регистрацию» человек попадал, только если сервер не нашёл его почту.
// Стало: «Добро пожаловать» + переключатель «Вход / Регистрация», почта общая; почта не найдена
// при входе → вкладка «Регистрация» с подсказкой; почта уже есть при регистрации → вкладка «Вход».
// Запросы к серверу прежние (loginUser / signupUser), капча — после нажатия кнопки.

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
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const login = code(read('src/screens/auth/LoginScreen.tsx'));
const signup = code(read('src/screens/auth/SignupScreen.tsx'));
const stack = code(read('src/navigation/authStack.tsx'));

out('Вход и регистрация: один экран');

check('заголовок «Добро пожаловать» и переключатель «Вход / Регистрация»', () => {
  assert.match(login, />Добро пожаловать</);
  assert.match(login, /item === 'login' \? 'Вход' : 'Регистрация'/);
  assert.match(login, /accessibilityRole="tab"/);
  assert.match(login, /accessibilityState=\{\{ selected: active \}\}/);
});

check('вкладка «Регистрация»: поле «Имя» и кнопка «Создать аккаунт»; «Вход»: кнопка «Войти»', () => {
  assert.match(login, /\{isSignup \? \(\s*<AppInput[\s\S]*?placeholder="Имя"/);
  assert.match(login, /title=\{isSignup \? 'Создать аккаунт' : 'Войти'\}/);
  assert.match(login, /placeholder="Электронная почта"/);
});

check('ссылка внизу ведёт на другую вкладку', () => {
  assert.match(login, /onPress=\{\(\) => switchMode\(isSignup \? 'login' : 'signup'\)\}/);
  assert.match(login, /'Нет аккаунта\? '/);
  assert.match(login, /'Зарегистрироваться'/);
  assert.match(login, /'Уже есть аккаунт\? '/);
});

check('запросы прежние: вход — loginUser, регистрация — signupUser, затем экран кода', () => {
  assert.match(login, /loginUser\(\{\s*type: ELoginDataType\.email,/);
  assert.match(login, /signupUser\(\{\s*name: name\.trim\(\),/);
  assert.match(login, /navigation\.navigate\('verification', \{ email: cleanEmail, isSignup: false \}\)/);
  assert.match(login, /navigation\.navigate\('verification', \{ email: cleanEmail, isSignup: true \}\)/);
});

check('почта не найдена при входе → вкладка «Регистрация» с подсказкой (не отдельный экран)', () => {
  assert.match(login, /payload\?\.screen === 'SIGNUP'\) \{\s*switchMode\(\s*'signup',\s*`Аккаунта с почтой \$\{cleanEmail\} пока нет/);
  assert.ok(!/navigate\('signup'/.test(login), 'переход на маршрут signup остался');
});

check('почта уже есть при регистрации (Email already exists) → вкладка «Вход» с подсказкой', () => {
  assert.match(login, /message === 'Email already exists'\) \{\s*switchMode\('login', `Аккаунт с почтой \$\{cleanEmail\} уже есть/);
});

check('смена вкладки сбрасывает капчу и ошибку; почта сохраняется', () => {
  const fn = login.slice(login.indexOf('const switchMode'), login.indexOf('const onEmailChange'));
  assert.match(fn, /setMode\(next\)/);
  assert.match(fn, /setCaptchaVisible\(false\)/);
  assert.match(fn, /resetCaptcha\(\)/);
  assert.match(fn, /setError\(null\)/);
  assert.ok(!/setEmail/.test(fn), 'почта не должна сбрасываться');
});

check('капча — после нажатия кнопки на обеих вкладках, после прохождения запрос уходит сам', () => {
  assert.match(login, /if \(captchaRequired && !captchaToken\) \{\s*setCaptchaVisible\(true\)/);
  assert.match(login, /\{captchaVisible \? \(/);
  assert.match(login, /if \(!captchaVisible \|\| !captchaToken \|\| loading \|\| !formReady\) return;\s*void submit\(captchaToken\)/);
  assert.match(login, /if \(isSignup\) \{\s*await submitSignup\(token\);\s*\} else \{\s*await submitLogin\(token\);/);
});

check('маршруты login и signup остались; signup — тот же экран на вкладке «Регистрация»', () => {
  assert.match(stack, /<Stack\.Screen name="login" component=\{LoginScreen\} \/>/);
  assert.match(stack, /<Stack\.Screen name="signup" component=\{SignupScreen\} \/>/);
  assert.match(signup, /<AuthScreen initialMode="signup" \/>/);
  assert.match(login, /const LoginScreen = \(\) => <AuthScreen initialMode="login" \/>;/);
  assert.match(login, /useState<string>\(route\.params\?\.email \|\| ''\)/);
});

check('тексты, которые ждут сценарии Maestro (02, smoke), на месте', () => {
  for (const t of ["'Вход'", "'Войти'", '"Электронная почта"']) assert.ok(login.includes(t), t);
});

check('цвета из темы (обе темы), заголовок шрифтом FONT_HEADING', () => {
  assert.match(login, /const segmentBackground = theme\.backgroundSecondary;/);
  assert.match(login, /const segmentActive = isDark \? theme\.border : theme\.surface;/);
  assert.match(login, /title: \{\s*fontFamily: FONT_HEADING/);
});

check('вверху логотип Totus Club (как в шапке сайта), а не надпись «TOTUS CLUB»', () => {
  assert.match(login, /import TotusLogo from '\.\.\/\.\.\/component\/UI\/icons\/totusLogo';/);
  assert.match(login, /<TotusLogo width=\{149\} \/>/);
  assert.ok(!login.includes('TOTUS CLUB'), 'надпись TOTUS CLUB осталась');
  const logo = read('src/component/UI/icons/totusLogo.tsx');
  assert.match(logo, /viewBox="0 0 149 44"/);
  assert.equal((logo.match(/<Path d="/g) || []).length, 11, '11 контуров, как у логотипа сайта');
  assert.match(logo, /fill="#FE732E"/);
  assert.match(logo, /fill="#2BAAE2"/);
  assert.match(logo, /accessibilityLabel="Totus Club"/);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
