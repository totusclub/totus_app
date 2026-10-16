// Check: return from the browser after «Вход через Яндекс ID» never shows «Не получилось войти»
// when the person is in fact signed in.
//
// Run: node scripts/check-yandex-return.mjs   (Node >= 22.18, no npm install; TypeScript is taken
// from the project's node_modules or a global install to transpile the .tsx file)
//
// Owner report 16.10.2026 (iPhone and Android): after the first Yandex sign-in the app shows
// «Не получилось войти», yet the account is already signed in; the second attempt «works».
// Cause: one sign-in attempt can deliver more than one signal to YandexAuthBridge — the link with
// the ticket (sign-in succeeded) and a late link with ?error= (e.g. the browser opened the API
// return address again and the same Yandex code cannot be exchanged twice → yandex_failed), or an
// exception after the tokens were already saved. The bridge showed the error modal on any of them.
//
// Part 1 - pure decision logic (src/modules/auth/yandexReturn.ts).
// Part 2 - the real src/modules/auth/YandexAuthBridge.tsx with React / react-native / redux /
//          network replaced by mocks; deep links are fed through the Linking listener.

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import module from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = console.log.bind(console);
let passed = 0;
let failed = 0;
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

if (!process.features || !process.features.typescript || typeof module.registerHooks !== 'function') {
  out('SKIP: need Node >= 22.18 (TypeScript type stripping + module.registerHooks)');
  process.exit(0);
}

function loadTypeScript() {
  const candidates = [
    path.join(root, 'package.json'),
    path.join(process.env.HOME || '/', '.npm-global/lib/node_modules/typescript/package.json'),
    '/usr/local/lib/node_modules/typescript/package.json',
    '/usr/lib/node_modules/typescript/package.json',
  ];
  for (const from of candidates) {
    try {
      const req = createRequire(from);
      return from.endsWith(path.join('typescript', 'package.json')) ? req(path.dirname(from)) : req('typescript');
    } catch {}
  }
  return null;
}
const ts = loadTypeScript();

// ---------------------------------------------------------------- part 1
const logic = await import(pathToFileURL(path.join(root, 'src/modules/auth/yandexReturn.ts')).href);
const ctx = (over = {}) => ({isAuthorized: false, exchangeInFlight: false, handledTickets: new Set(), ...over});

out('yandexReturn: what to do with a deep link');
await check('new ticket → exchange; the same ticket again → skip', () => {
  assert.deepEqual(logic.decideYandexLink({ticket: 't1'}, ctx()), {action: 'exchange', ticket: 't1'});
  assert.deepEqual(logic.decideYandexLink({ticket: 't1'}, ctx({handledTickets: new Set(['t1'])})), {action: 'skip'});
});
await check('error link for a guest → show the error (behaviour kept)', () => {
  assert.deepEqual(logic.decideYandexLink({error: 'yandex_access_denied'}, ctx()), {action: 'showError', code: 'yandex_access_denied'});
});
await check('error link after a successful sign-in, or during an exchange → ignored', () => {
  assert.equal(logic.decideYandexLink({error: 'yandex_failed'}, ctx({isAuthorized: true})).action, 'ignoreError');
  assert.equal(logic.decideYandexLink({error: 'yandex_failed'}, ctx({exchangeInFlight: true})).action, 'ignoreError');
  assert.equal(logic.shouldShowExchangeError(true), false);
  assert.equal(logic.shouldShowExchangeError(false), true);
});
await check('not a Yandex link → skip', () => {
  assert.deepEqual(logic.decideYandexLink(null, ctx()), {action: 'skip'});
  assert.deepEqual(logic.decideYandexLink({}, ctx()), {action: 'skip'});
});

// ---------------------------------------------------------------- part 2
if (!ts) {
  out('\nSKIP part 2: TypeScript not found (needed to transpile YandexAuthBridge.tsx)');
  out(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const M = (globalThis.__yaMock = {});
const MOCKS = {
  react: `
    const M = globalThis.__yaMock;
    let si = 0, ri = 0;
    export function __beginRender() { si = 0; ri = 0; }
    export function useState(init) {
      const i = si++;
      if (!(i in M.state)) M.state[i] = typeof init === 'function' ? init() : init;
      const set = v => { M.state[i] = typeof v === 'function' ? v(M.state[i]) : v; };
      return [M.state[i], set];
    }
    export function useRef(init) { const i = ri++; if (!M.refs[i]) M.refs[i] = {current: init}; return M.refs[i]; }
    export const useCallback = fn => fn;
    export function useEffect(fn) { M.effects.push(fn); }
    export function createElement(type, props, ...children) { return {type, props, children}; }
    export default {createElement};`,
  'react-native': `
    const M = globalThis.__yaMock;
    export const Linking = {
      getInitialURL: async () => M.initialUrl,
      addEventListener: (_e, cb) => { M.urlListener = cb; return {remove() {}}; },
      openURL: async () => {},
    };
    export const ActivityIndicator = 'ActivityIndicator', Modal = 'Modal', Pressable = 'Pressable', View = 'View';
    export const StyleSheet = {create: s => s};`,
  'react-redux': `
    const M = globalThis.__yaMock;
    export const useDispatch = () => M.dispatch;
    export const useStore = () => M.store;`,
  'jwt-decode': `export const jwtDecode = t => ({id: 7, token: t});`,
  '../../component/UI': `export const AppText = 'AppText', AppButton = 'AppButton', AppInput = 'AppInput';`,
  '../../hooks/useTheme': `export const useTheme = () => ({theme: {}});`,
  '../store/slices/auth': `export const setAuth = payload => ({type: 'auth/setAuth', payload});`,
  '../crashReporting': `export const log = m => globalThis.__yaMock.logs.push(m);`,
  '../../navigation/navigationRef': `export const navigateRoot = (...a) => globalThis.__yaMock.navigate(...a);`,
  '../../utils/phone': `export const formatRuPhoneInput = v => v, normalizeRuPhone = v => v, RU_PHONE_HINT = '';`,
  '../../theme/fonts': `export const FONT_HEADING = 'Forum';`,
  // real src/modules/api/yandexAuth.ts runs on top of this (parseYandexDeepLink, yandexExchange)
  '../axios': `
    const M = globalThis.__yaMock;
    export const instance = {defaults: {baseURL: 'https://api.totus.club'}, patch: async () => ({data: {}})};
    export const get = async () => ({data: {}});
    export const post = async (url, body) => ({data: await M.exchange(body.ticket)});`,
};

const BRIDGE = path.join(root, 'src/modules/auth/YandexAuthBridge.tsx');
module.registerHooks({
  resolve(specifier, context, next) {
    if (Object.prototype.hasOwnProperty.call(MOCKS, specifier)) return {url: `mock:${specifier}`, shortCircuit: true};
    if (specifier.startsWith('.') && context.parentURL && context.parentURL.startsWith('file:')) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      for (const ext of ['', '.ts', '.tsx']) {
        if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
          return {url: pathToFileURL(base + ext).href, shortCircuit: true};
        }
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('mock:')) return {format: 'module', source: MOCKS[url.slice(5)], shortCircuit: true};
    if (url === pathToFileURL(BRIDGE).href) {
      const src = fs.readFileSync(BRIDGE, 'utf8');
      const js = ts.transpileModule(src, {
        compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React},
      }).outputText;
      return {format: 'module', source: js, shortCircuit: true};
    }
    if (url.endsWith('.ts')) return {format: 'module-typescript', source: fs.readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true};
    return next(url, context);
  },
});

const reactMock = await import('react');
const Bridge = (await import(pathToFileURL(BRIDGE).href)).default;
const tick = () => new Promise(r => setTimeout(r, 0));

/** Mount the bridge as a guest; `exchange(ticket)` answers POST /exchange. */
async function mount({exchange, navigate} = {}) {
  Object.assign(M, {
    state: [], refs: [], effects: [], logs: [], navs: [], dispatched: [],
    token: null, initialUrl: null, urlListener: null, exchangeCalls: [],
  });
  M.store = {getState: () => ({auth: {accessToken: M.token}})};
  M.dispatch = action => {
    M.dispatched.push(action);
    if (action.type === 'auth/setAuth') M.token = action.payload.token;
  };
  M.navigate = (...a) => { M.navs.push(a); if (navigate) navigate(...a); };
  M.exchange = async ticket => { M.exchangeCalls.push(ticket); return exchange(ticket); };
  let el;
  const render = () => { reactMock.__beginRender(); el = Bridge(); };
  render();
  M.effects.splice(0).forEach(fn => fn());
  await tick();
  const open = async url => { const p = M.urlListener({url}); render(); return p; };
  const view = () => { render(); return {stage: M.state[0], errorCode: M.state[1], el}; };
  return {open, view, render};
}
const ok = t => ({auth: true, accessToken: `jwt-${t}`, refreshToken: `r-${t}`, needsPhone: false});
const rejectWith = (status, error) => Promise.reject(Object.assign(new Error(error), {response: {status, data: {error}}}));
const LINK = q => `totus://auth/yandex?${q}`;

out('\nYandexAuthBridge (real component, mocks around it)');
await check('ticket, then a late ?error=yandex_failed → signed in, no «Не получилось войти»', async () => {
  const h = await mount({exchange: ok});
  await h.open(LINK('ticket=t1'));
  assert.equal(M.token, 'jwt-t1', 'not signed in');
  await h.open(LINK('error=yandex_failed&return=%2F'));
  assert.notEqual(h.view().stage, 'error', 'error modal shown although the person is signed in');
  assert.equal(h.view().stage, 'idle');
});
await check('?error= arrives while the ticket is being exchanged → result of the exchange wins', async () => {
  let release;
  const h = await mount({exchange: t => new Promise(r => { release = () => r(ok(t)); })});
  const pending = h.open(LINK('ticket=t2'));
  await tick();
  await h.open(LINK('error=yandex_failed'));
  release();
  await pending;
  assert.equal(M.token, 'jwt-t2');
  assert.equal(h.view().stage, 'idle', `stage ${h.view().stage}`);
});
await check('second ticket of the same attempt fails (ticket_invalid) after the first one signed in → no error', async () => {
  const h = await mount({exchange: t => (t === 'a' ? ok(t) : rejectWith(400, 'ticket_invalid'))});
  await h.open(LINK('ticket=a'));
  await h.open(LINK('ticket=b'));
  assert.equal(M.token, 'jwt-a');
  assert.equal(h.view().stage, 'idle', `stage ${h.view().stage}`);
});
await check('navigation to «Аккаунт» throws after the tokens are saved → still no error', async () => {
  const h = await mount({exchange: ok, navigate: () => { throw new Error('nav not ready'); }});
  await h.open(LINK('ticket=t3'));
  assert.equal(M.token, 'jwt-t3');
  assert.equal(h.view().stage, 'idle', `stage ${h.view().stage}`);
});
await check('new user: «Почти готово» is not replaced by a late error', async () => {
  const h = await mount({exchange: t => ({...ok(t), needsPhone: true})});
  await h.open(LINK('ticket=t4'));
  assert.equal(h.view().stage, 'phone');
  await h.open(LINK('error=yandex_failed'));
  assert.equal(h.view().stage, 'phone', `stage ${h.view().stage}`);
});
await check('kept: a guest who really failed sees the error (denied / expired ticket)', async () => {
  let h = await mount({exchange: ok});
  await h.open(LINK('error=yandex_access_denied'));
  assert.equal(h.view().stage, 'error');
  assert.equal(h.view().errorCode, 'yandex_access_denied');
  h = await mount({exchange: () => rejectWith(400, 'ticket_invalid')});
  await h.open(LINK('ticket=t5'));
  assert.equal(M.token, null);
  assert.equal(h.view().stage, 'error');
  assert.equal(h.view().errorCode, 'ticket_invalid');
});
await check('kept: the same ticket is exchanged once; success opens «Аккаунт»', async () => {
  const h = await mount({exchange: ok});
  await h.open(LINK('ticket=t6'));
  await h.open(LINK('ticket=t6'));
  assert.deepEqual(M.exchangeCalls, ['t6']);
  assert.deepEqual(M.navs[0], ['tab', {screen: 'AccountStackScreen', params: {screen: 'account'}}]);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
