// Check: бронирование тура в приложении — загрузка, недоступный тур, медленный ответ, нет сети,
// «Повторить», смена перелёта, оформление; доплаты и «Что входит в тур» из данных Level.Travel.
// То же, что на сайте (totus_WEB #88, #89).
//
// Run: node scripts/check-booking-flow.mjs   (Node >= 22.18, no npm install)
//
// Как было: любой неуспех актуализации оставлял серые заглушки навсегда; протухший тур
// (success:false, rotten) открывал форму; таймаутов у запросов не было; экран «Перелёты» качал
// полный список (у популярного тура ~12 МБ); при отказе создания заказа приложение брало
// «последний заказ пользователя» и открывало чужой старый заказ; «Быстрое подтверждение»,
// «Страховка включена», «Трансфер не включён» были написаны для всех туров.
//
// Хуки проверяются на настоящем src/modules/hooks/useBooking.ts с маленькой заменой React
// (useState / useEffect / useMemo / useCallback) — без react-native и без npm install.

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import module from 'node:module';

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

if (!process.features || !process.features.typescript || typeof module.registerHooks !== 'function') {
  out('SKIP: need Node >= 22.18 (TypeScript type stripping + module.registerHooks)');
  process.exit(0);
}

// ---- заглушки: axios-инстанс приложения, NetInfo, React ---------------------------------------
const M = (globalThis.__bookingMock = {
  calls: [],
  reply: async () => ({data: {}}),
  online: true,
});
const MOCKS = {
  // src/modules/axios — тот же экспорт, что настоящий (instance, get, post)
  axiosApp: `
    const M = globalThis.__bookingMock;
    const call = method => async (url, a, b) => {
      const config = (method === 'get' ? a : b) || {};
      const body = method === 'get' ? undefined : a;
      const entry = {method, url, body, config};
      M.calls.push(entry);
      return M.reply(entry);
    };
    export const instance = {get: call('get'), post: call('post')};
    export const get = (url, params) => instance.get(url, {params});
    export const post = (url, body) => instance.post(url, body, {});
    export const put = post, del = post;`,
  netinfo: `
    const M = globalThis.__bookingMock;
    export default {fetch: async () => ({isConnected: M.online, isInternetReachable: M.online})};`,
  react: `
    const R = globalThis.__miniReact;
    export const useState = (...a) => R.useState(...a);
    export const useEffect = (...a) => R.useEffect(...a);
    export const useMemo = (...a) => R.useMemo(...a);
    export const useCallback = (...a) => R.useCallback(...a);
    export const useRef = (...a) => R.useRef(...a);
    export default {useState, useEffect, useMemo, useCallback, useRef};`,
  searchParamsUtils: `export const prepareGroupedHotelsParams = v => v, prepareStartSearchParams = v => v;`,
  rnNavigation: `
    export const createNavigationContainerRef = () => ({isReady: () => false, navigate() {}, dispatch() {}, getRootState: () => null});
    export const StackActions = {push: (...a) => ({type: 'PUSH', a}), popTo: (...a) => ({type: 'POP_TO', a})};`,
};

module.registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'react') return {url: 'mock:react', shortCircuit: true};
    if (specifier === '@react-native-community/netinfo') return {url: 'mock:netinfo', shortCircuit: true};
    if (specifier === '@react-navigation/native') return {url: 'mock:rnNavigation', shortCircuit: true};
    if (/(^|\/)axios$/.test(specifier) && specifier.startsWith('.')) return {url: 'mock:axiosApp', shortCircuit: true};
    if (specifier.endsWith('/searchParamsUtils')) return {url: 'mock:searchParamsUtils', shortCircuit: true};
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      for (const ext of ['.ts', '.tsx', '/index.ts']) {
        if (fs.existsSync(base + ext)) return {url: pathToFileURL(base + ext).href, shortCircuit: true};
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('mock:')) return {format: 'module', source: MOCKS[url.slice(5)], shortCircuit: true};
    return next(url, context);
  },
});

// Маленький React: один компонент-хук, эффекты после рендера, перерисовка при setState.
function createMiniReact() {
  let hooks = [];
  let idx = 0;
  let pendingEffects = [];
  let render = null;
  let scheduled = false;
  const depsChanged = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const R = {
    useState(init) {
      const i = idx++;
      if (!(i in hooks)) hooks[i] = {value: typeof init === 'function' ? init() : init};
      const h = hooks[i];
      const set = v => {
        const nextValue = typeof v === 'function' ? v(h.value) : v;
        if (Object.is(nextValue, h.value)) return;
        h.value = nextValue;
        R.schedule();
      };
      return [h.value, set];
    },
    useRef(init) {
      const i = idx++;
      if (!(i in hooks)) hooks[i] = {current: init};
      return hooks[i];
    },
    useMemo(fn, deps) {
      const i = idx++;
      const h = hooks[i];
      if (!h || depsChanged(h.deps, deps)) hooks[i] = {value: fn(), deps};
      return hooks[i].value;
    },
    useCallback(fn, deps) {
      return R.useMemo(() => fn, deps);
    },
    useEffect(fn, deps) {
      const i = idx++;
      const h = hooks[i];
      if (!h || depsChanged(h.deps, deps)) {
        const prevCleanup = h?.cleanup;
        hooks[i] = {deps, cleanup: undefined};
        pendingEffects.push(() => {
          if (typeof prevCleanup === 'function') prevCleanup();
          const c = fn();
          hooks[i].cleanup = typeof c === 'function' ? c : undefined;
        });
      }
    },
    schedule() {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        render?.();
      });
    },
    mount(hookFn) {
      const result = {current: null, renders: 0};
      render = () => {
        idx = 0;
        result.current = hookFn(result.props);
        result.renders++;
        const effects = pendingEffects;
        pendingEffects = [];
        effects.forEach(e => e());
      };
      result.rerender = props => {
        result.props = props;
        render();
      };
      result.unmount = () => {
        hooks.forEach(h => typeof h?.cleanup === 'function' && h.cleanup());
        render = null;
      };
      return result;
    },
    reset() {
      hooks = [];
      idx = 0;
      pendingEffects = [];
      render = null;
    },
  };
  return R;
}
globalThis.__miniReact = createMiniReact();
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
const settle = async () => {
  for (let i = 0; i < 6; i++) await tick(0);
};

const api = await import(pathToFileURL(path.join(root, 'src/modules/api/levelTravelApi.ts')).href);
const offer = await import(pathToFileURL(path.join(root, 'src/utils/bookingOffer.ts')).href);
const {useBooking} = await import(pathToFileURL(path.join(root, 'src/modules/hooks/useBooking.ts')).href);

const axiosErr = (status, data, extra = {}) =>
  Object.assign(new Error(status ? `Request failed with status code ${status}` : 'Network Error'), {
    isAxiosError: true,
    response: status ? {status, data} : undefined,
    request: {},
    ...extra,
  });

// Живой ответ actualize (тур 409294734, 16.10.2026): протух, пакет в теле есть.
const PKG = {
  id: 409294734, adults_count: 2, kids_count: 0, nights_count: 7, price: 255418, net_price: 255418,
  fuel_charge: 0, predicted_surcharge: 0, transfer: false, medical_insurance: true, instant_confirm: false,
  available: true, extras: [], taxes: [], notices: [], pansion_description: 'Ультра всё включено',
  departure: {name_ru: 'Москва', name_ru_form2: 'Москвы'}, operator: {name: 'Level.Travel'},
  dates_info: {start_date: '2026-10-22', end_date: '2026-10-29', nights_count: 7},
  hotel: {city: 'Белек', country: 'Турция', visa: {needed: false, type: 'no_visa'}},
};
const ROTTEN = {success: false, rotten: true, exception: 'package is expired', package: {...PKG, available: false}};
const ROUTE = {packageInfo: {id: 409294734}, flightData: {flight_pair_id: 'pair-7', fuel_charge: 41910}, searchType: 'package'};

function mountBooking(params) {
  globalThis.__miniReact.reset();
  const h = globalThis.__miniReact.mount(props => useBooking(props));
  h.rerender(params);
  return h;
}

out('Бронирование: запросы к Level.Travel');

await check('таймауты у шагов бронирования; у создания заказа и оплаты — нет (нельзя оформить дважды)', async () => {
  const T = api.LT_CLIENT_TIMEOUT_MS;
  for (const [k, v] of Object.entries(T)) assert.ok(v >= 30000 && v <= 90000, `${k}=${v}`);
  M.calls.length = 0;
  M.reply = async () => ({data: {}});
  await api.PackagesActualizeFlight(1, 2);
  assert.equal(M.calls.at(-1).config.timeout, T.actualize);
  await api.PackagesActualize(1, 'hotel');
  assert.equal(M.calls.at(-1).config.timeout, T.actualize);
  assert.equal(M.calls.at(-1).config.params.search_type, 'hotel');
  await api.createPackage({request_id: 'r', tour_id: 't'});
  assert.equal(M.calls.at(-1).config.timeout, T.packageDetails);
  await api.prebuildOrder({package_id: 1});
  assert.equal(M.calls.at(-1).config.timeout, T.prebuild);
  await api.prebookPackage({package_id: 1});
  assert.equal(M.calls.at(-1).config.timeout, T.prebook);
  await api.validateTourist({package_id: 1});
  assert.equal(M.calls.at(-1).config.timeout, T.validateTourists);
  await api.createOrder({package_id: 1});
  assert.equal(M.calls.at(-1).config.timeout, undefined, 'create-package без таймаута');
  const src = code(read('src/modules/api/levelTravelApi.ts'));
  const pay = src.slice(src.indexOf('export async function createPay'), src.indexOf('export async function getHomeData'));
  assert.ok(!/timeout/.test(pay), 'createPay без таймаута');
});

await check('экран «Перелёты»: лёгкий ответ ?view=app; выбранный рейс — один, через ?view=pair', async () => {
  M.calls.length = 0;
  M.reply = async ({config}) =>
    config.params?.view === 'pair'
      ? {data: {flights: [{flight_pair_id: 'pair-7', fuel_charge: 41910, to: {transition: {}}}], found: true}}
      : {data: {flights: [], app_view: true}};
  const controller = new AbortController();
  await api.Packagesflights({package_id: 5}, {view: 'app', signal: controller.signal});
  let c = M.calls.at(-1);
  assert.equal(c.url, '/packages/flights');
  assert.equal(c.config.params.view, 'app');
  assert.equal(c.config.signal, controller.signal);
  assert.equal(c.config.timeout, api.LT_CLIENT_TIMEOUT_MS.flights);
  const flight = await api.getSelectedFlight(5, 'pair-7');
  c = M.calls.at(-1);
  assert.deepEqual(c.body, {package_id: 5});
  assert.deepEqual(c.config.params, {view: 'pair', flight_pair_id: 'pair-7'});
  assert.equal(flight.fuel_charge, 41910);
  M.reply = async () => ({data: {flights: [], found: false}});
  assert.equal(await api.getSelectedFlight(5, 'pair-x'), null, 'рейса нет — null');
  const before = M.calls.length;
  assert.equal(await api.getSelectedFlight(5, ''), null);
  assert.equal(M.calls.length, before, 'без flight_pair_id запроса нет');
  // Старый API без view=pair вернёт полный список — рейс всё равно найдётся.
  M.reply = async () => ({data: {flights: [{flight_pair_id: 'a'}, {flight_pair_id: 'pair-7', fuel_charge: 1}]}});
  assert.equal((await api.getSelectedFlight(5, 'pair-7')).fuel_charge, 1);
  const hook = code(read('src/modules/hooks/useTicketsData.ts'));
  assert.match(hook, /Packagesflights\(payload, \{ view: 'app', signal: controller\.signal \}\)/);
});

await check('экран «Перелёты»: устаревший ответ не перетирает новый, прежний запрос отменяется', () => {
  const hook = code(read('src/modules/hooks/useTicketsData.ts'));
  assert.match(hook, /abortRef\.current\?\.abort\(\);\s*const controller = new AbortController\(\);/);
  assert.match(hook, /const seq = \+\+requestSeqRef\.current;/);
  assert.match(hook, /if \(!isCurrent\(\)\) return;\s*if \(__DEV__\)/);
  assert.match(hook, /if \(!isCurrent\(\) \|\| isCancelledError\(err\)\) return;/);
  assert.match(hook, /useEffect\(\(\) => \(\) => abortRef\.current\?\.abort\(\), \[\]\)/);
});

out('Бронирование: состояния экрана (настоящий useBooking)');

await check('успешная загрузка: тур с перелётом → ready, форма туристов по adults_count', async () => {
  M.calls.length = 0;
  M.reply = async () => ({data: {success: true, package: PKG}});
  const h = mountBooking(ROUTE);
  assert.equal(h.current.loadState, 'loading');
  assert.equal(h.current.dataLoading, true);
  await settle();
  assert.equal(h.current.loadState, 'ready');
  assert.equal(h.current.packageData.id, 409294734);
  assert.equal(h.current.tourists.length, 2);
  assert.equal(M.calls.length, 1, 'один запрос');
  assert.equal(M.calls[0].config.params.flight_pair_id, 'pair-7');
  assert.equal(M.calls[0].config.params.package_id, 409294734, 'id пакета с экрана перелётов');
  h.unmount();
});

await check('недоступный тур: rotten / success:false / 4xx LT → экран «недоступно» (а не форма или заглушки)', async () => {
  M.reply = async () => ({data: ROTTEN});
  let h = mountBooking(ROUTE);
  await settle();
  assert.equal(h.current.loadState, 'unavailable');
  assert.equal(h.current.packageData, null);
  assert.equal(offer.getOfferSummary(h.current.unavailablePackage), 'Белек, Турция · 22–29 октября · 2 взрослых');
  h.unmount();

  M.reply = async () => {
    throw axiosErr(400, {success: false, error: 'Failed to start search', code: 'lt_error', status: 400, message: 'Package not found'});
  };
  h = mountBooking(ROUTE);
  await settle();
  assert.equal(h.current.loadState, 'unavailable');
  h.unmount();

  h = mountBooking({packageInfo: null});
  await settle();
  assert.equal(h.current.loadState, 'unavailable', 'нет пакета — тоже экран, без заглушек');
  h.unmount();
});

await check('медленный ответ: через 4 с подсказка, туроператор не ответил (504 lt_timeout) → «Повторить»', async () => {
  let release;
  M.reply = () => new Promise((_, reject) => (release = () => reject(axiosErr(504, {success: false, code: 'lt_timeout'}))));
  const h = mountBooking(ROUTE);
  await settle();
  assert.equal(h.current.slowLoading, false);
  await tick(offer.BOOKING_SLOW_HINT_MS + 50);
  await settle();
  assert.equal(h.current.slowLoading, true, 'подсказка «Проверяем цену и места»');
  release();
  await settle();
  assert.equal(h.current.loadState, 'error');
  assert.equal(h.current.slowLoading, false);
  h.unmount();
});

await check('нет интернета: ответа нет, NetInfo offline → «Нет подключения»; таймаут приложения → «Повторить»', async () => {
  M.online = false;
  M.reply = async () => {
    throw axiosErr(0);
  };
  let h = mountBooking(ROUTE);
  await settle();
  assert.equal(h.current.loadState, 'offline');
  h.unmount();
  M.online = true;
  M.reply = async () => {
    throw axiosErr(0, undefined, {code: 'ECONNABORTED', message: 'timeout of 55000ms exceeded'});
  };
  h = mountBooking(ROUTE);
  await settle();
  assert.equal(h.current.loadState, 'error');
  h.unmount();
});

await check('«Повторить»: новый запрос, после успеха — форма', async () => {
  let n = 0;
  M.calls.length = 0;
  M.reply = async () => {
    n++;
    if (n === 1) throw axiosErr(502, {success: false, code: 'lt_unreachable'});
    return {data: {success: true, package: PKG}};
  };
  const h = mountBooking(ROUTE);
  await settle();
  assert.equal(h.current.loadState, 'error');
  h.current.retry();
  await settle();
  assert.equal(h.current.loadState, 'ready');
  assert.equal(M.calls.length, 2);
  h.unmount();
});

await check('смена перелёта: прежний запрос отменяется, его поздний ответ не перетирает новый', async () => {
  const pending = [];
  M.calls.length = 0;
  M.reply = ({config}) =>
    new Promise(resolve => {
      pending.push({pair: config.params.flight_pair_id, signal: config.signal, resolve});
    });
  const h = mountBooking(ROUTE);
  await settle();
  h.rerender({...ROUTE, flightData: {flight_pair_id: 'pair-9'}});
  await settle();
  assert.equal(pending.length, 2);
  assert.equal(pending[0].signal.aborted, true, 'первый запрос отменён');
  pending[1].resolve({data: {success: true, package: {...PKG, id: 2, fuel_charge: 999}}});
  await settle();
  pending[0].resolve({data: {success: true, package: {...PKG, id: 1}}});
  await settle();
  assert.equal(h.current.packageData.id, 2, 'остался ответ для pair-9');
  h.unmount();
  assert.ok(pending.every(p => p.signal.aborted || p.pair === 'pair-9'));
});

await check('ушли с экрана: запрос отменяется', async () => {
  let signal;
  M.reply = ({config}) => {
    signal = config.signal;
    return new Promise(() => {});
  };
  const h = mountBooking(ROUTE);
  await settle();
  h.unmount();
  assert.equal(signal.aborted, true);
});

out('Бронирование: оформление заказа (Booking.tsx)');

const booking = code(read('src/component/booking/Booking.tsx'));
const submit = booking.slice(booking.indexOf('const handleSubmit'));

await check('экраны вместо вечных заглушек: «недоступно», «Не удалось загрузить» / «нет сети» с «Повторить»', () => {
  assert.match(booking, /if \(loadState === 'unavailable' \|\| loadState === 'error' \|\| loadState === 'offline'\)/);
  assert.match(booking, /<BookingUnavailable[\s\S]*?onOtherFlight=\{hotelOnly \? undefined : handleOtherFlight\}/);
  assert.match(booking, /<BookingLoadError[\s\S]*?offline=\{loadState === 'offline'\}[\s\S]*?onRetry=\{retry\}/);
  assert.match(booking, /<BookingSkeleton slowHint=\{slowLoading\} \/>/);
  const status = read('src/component/booking/components/BookingStatus.tsx');
  for (const t of ['Это предложение больше недоступно', 'Не удалось загрузить тур', 'Нет подключения к интернету',
    'Повторить', 'Выбрать другой перелёт', 'Вернуться к номерам', 'Проверяем цену и места у туроператора',
    'Этот тур только что раскупили', 'Заказ не создан, деньги не списаны']) {
    assert.ok(status.includes(t), t);
  }
});

await check('тур раскупили при оформлении: заказ не создаётся, кнопка выключается, есть переходы', () => {
  const sold = submit.indexOf('setSubmitUnavailable(true)');
  assert.ok(sold > 0 && sold < submit.indexOf('await createOrder('), 'проверка тура до создания заказа');
  assert.match(submit, /if \(isOfferUnavailablePayload\(actualizeResult\)\) \{[\s\S]*?setSubmitUnavailable\(true\);[\s\S]*?return;/);
  assert.match(booking, /disabled=\{loading \|\| !email \|\| !phone \|\| submitUnavailable\}/);
  assert.match(booking, /<BookingSubmitUnavailable/);
});

await check('повторные нажатия и запросы: второе нажатие не отправляет, чужой «последний заказ» больше не открывается', () => {
  assert.match(submit, /if \(loading \|\| submittingRef\.current \|\| !packageId \|\| submitUnavailable\) return;/);
  assert.match(submit, /submittingRef\.current = true;/);
  assert.match(submit, /finally \{\s*submittingRef\.current = false;/);
  assert.ok(!/getOrdersUsers|pickLatestOrderId/.test(booking), 'нет запасного «последнего заказа»');
  assert.match(submit, /orderResult\?\.success === false \|\|\s*orderResult\?\.isAxiosError \|\|\s*Boolean\(orderResult\?\.error\)/);
  // одна актуализация перед оформлением, как раньше (LT требует свежую)
  assert.equal((submit.match(/PackagesActualize(Flight)?\(/g) || []).length, 2, 'одна ветка: с перелётом / без');
});

await check('«Выбрать другой перелёт» → назад к перелётам этого тура со свежей загрузкой; «к номерам» → отель', async () => {
  const nav = await import(pathToFileURL(path.join(root, 'src/navigation/historyNavigation.ts')).href);
  const calls = [];
  const navigation = {
    getState: () => ({routes: [{name: 'hotel'}, {name: 'tickets', params: {packageId: 7, searchType: 'package'}}, {name: 'ticketDetails'}, {name: 'booking'}]}),
    popTo: (name, params) => calls.push(['popTo', name, params]),
    navigate: (name, params) => calls.push(['navigate', name, params]),
    goBack: () => calls.push(['goBack']),
    canGoBack: () => true,
  };
  nav.backToFlights(navigation, {packageId: 409294734});
  assert.equal(calls[0][0], 'popTo');
  assert.equal(calls[0][1], 'tickets');
  assert.equal(calls[0][2].packageId, 7, 'параметры открытого списка сохраняются');
  assert.ok(calls[0][2].refreshAt > 0, 'список загрузится заново');
  nav.backToRooms(navigation);
  assert.deepEqual(calls[1], ['popTo', 'hotel', undefined]);
  calls.length = 0;
  const bare = {getState: () => ({routes: [{name: 'booking'}]}), navigate: (n, p) => calls.push([n, p]), goBack: () => calls.push(['goBack']), canGoBack: () => true};
  nav.backToFlights(bare, {packageId: 5, searchType: 'package'});
  assert.equal(calls[0][0], 'tickets');
  assert.equal(calls[0][1].packageId, 5);
  nav.backToRooms(bare);
  assert.deepEqual(calls[1], ['goBack']);
  const tickets = code(read('src/component/tickets/Tickets.tsx'));
  assert.match(tickets, /if \(refreshAt == null \|\| refreshAt === lastRefreshRef\.current\) return;[\s\S]*?refetch\(\);/);
});

await check('экран рейса: полный рейс — через ?view=pair; рейса нет — «Этот перелёт уже недоступен»', () => {
  const details = code(read('src/component/tickets/ticket/TicketDetails.tsx'));
  assert.match(details, /getSelectedFlight\(packageIdForFlight, pairId, \{ signal: controller\.signal \}\)/);
  assert.match(details, /if \(found\) setFullFlight\(found\);\s*else setFlightGone\(true\);/);
  assert.match(details, /const flightData = fullFlight \|\| listFlight;/);
  assert.match(details, /Этот перелёт уже недоступен/);
  assert.match(details, /if \(flightGone\) return;/);
  const tickets = code(read('src/component/tickets/Tickets.tsx'));
  assert.match(tickets, /flightIsSlim: listView,/);
});

out('Доплаты и «Что входит в тур»');

await check('«Что входит в тур» — из полей LT; нет поля — нет строки; у отеля без перелёта нет перелёта и трансфера', () => {
  const items = offer.getBookingInclusions(PKG);
  const by = Object.fromEntries(items.map(i => [i.key, i]));
  assert.equal(by.flight.title, 'Перелёт из Москвы и обратно');
  assert.equal(by.stay.title, 'Проживание, 7 ночей · Ультра всё включено');
  assert.equal(by.insurance.kind, 'yes');
  assert.equal(by.transfer.kind, 'no');
  assert.equal(by.visa.note, 'не нужна');
  assert.deepEqual(offer.getBookingInclusions({nights_count: 1}).map(i => i.key), ['flight', 'stay']);
  assert.equal(offer.getBookingInclusions({nights_count: 1})[1].title, 'Проживание, 1 ночь');
  const hotel = offer.getBookingInclusions(PKG, {isHotelOnly: true});
  assert.ok(!hotel.some(i => i.key === 'flight' || i.key === 'transfer'));
  const extra = offer.getBookingInclusions({
    ...PKG,
    taxes: [{name: 'Туристический налог', price: 1500}],
    extras: [{title: 'Трансфер VIP', price: 9000}, {}],
    notices: ['Регистрация на рейс онлайн', {text: 'x'.repeat(400)}],
  });
  assert.equal(extra.find(i => i.key === 'tax-0').note, `1${String.fromCharCode(0x202f)}500 ₽`);
  assert.equal(extra.filter(i => i.key.startsWith('extra-')).length, 1);
  assert.ok(extra.find(i => i.key === 'notice-1').title.length <= 240);
});

await check('подпись доплаты, подтверждение и «А что ещё» на оформлении — по данным, а не текстом для всех', () => {
  assert.equal(offer.getFeesLabel({fuel_charge: 41910}), 'Топливный сбор авиакомпании');
  assert.equal(offer.getFeesLabel({}, {fuel_charge: 100}), 'Топливный сбор авиакомпании');
  assert.equal(offer.getFeesLabel({predicted_surcharge: 500}), 'Доплаты и сборы');
  assert.equal(offer.getConfirmationLabel({instant_confirm: true}), 'Мгновенное');
  assert.equal(offer.getConfirmationLabel({instant_confirm: false}), 'После проверки туроператором');
  assert.equal(offer.getConfirmationLabel({}), null);
  assert.deepEqual(offer.getCheckoutExtraRow({key: 'transfer', kind: 'no', title: 'x'}), {label: 'Трансфер', value: 'Не входит'});
  assert.deepEqual(offer.getCheckoutExtraRow({key: 'notice-0', kind: 'info', title: 'Текст'}), {label: 'Важно', value: 'Текст'});
  const footer = code(read('src/component/booking/components/BookingFooter.tsx'));
  assert.match(footer, /\{getFeesLabel\(packageData, selectedFlight\)\}/);
  assert.match(footer, /<BookingInclusions items=\{inclusions\}/);
  const checkout = code(read('src/component/checkout/components/CheckoutItems.tsx'));
  assert.ok(!/Быстрое подтверждение|Включена в стоимость|Не включен в стоимость/.test(checkout));
  assert.match(checkout, /getConfirmationLabel\(pkg\)/);
  assert.match(checkout, /getBookingInclusions\(pkg, \{ isHotelOnly \}\)/);
});

await check('ошибка загрузки: недоступно vs повторить (коды totus_API #39)', () => {
  const c = offer.classifyBookingLoadFailure;
  assert.equal(c(axiosErr(504, {code: 'lt_timeout'})), 'error');
  assert.equal(c(axiosErr(502, {code: 'lt_unreachable'})), 'error');
  assert.equal(c(axiosErr(500, {error: 'Failed to start search'})), 'error');
  assert.equal(c(axiosErr(404, {code: 'lt_error'})), 'unavailable');
  assert.equal(c(axiosErr(200, ROTTEN)), 'unavailable');
  assert.equal(c(axiosErr(429, {})), 'error');
  assert.equal(c(axiosErr(0)), 'error');
  assert.equal(c(axiosErr(0), true), 'offline');
  assert.equal(c(new Error('x')), 'error');
  assert.equal(offer.isRequestCancelled({name: 'CanceledError'}), true);
  assert.equal(offer.isRequestCancelled({code: 'ERR_CANCELED'}), true);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
