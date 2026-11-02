// Проверка постепенной выдачи поиска в приложении (план claude/HOTEL_SEARCH_PROGRESSIVE_PLAN_RU.md, этап 4, 02.11.2026).
//
// Run: node scripts/check-search-progressive.mjs   (Node >= 22.18 — .ts грузятся без сборки; без npm install)
//
// Что проверяется:
//   1) src/utils/progressiveSearch.ts (тот же алгоритм, что на сайте, totus_WEB #99): склейка без сдвига
//      видимых карточек (Р1), «Ищем ещё у N операторов» (Р4), интервалы опроса, окончание поиска;
//   2) runProgressiveSearch на поддельном Level.Travel (свои часы): первая страница до «completed»,
//      рост выдачи, без operator_ids, ответ под старые фильтры выбрасывается, отмена, таймаут;
//   3) src/modules/store/slices/search.ts целиком (с маленькой заменой @reduxjs/toolkit и API):
//      два поиска подряд — старый не затирает новый; readyOperators — все операторы поиска;
//      фильтр во время поиска; догрузка; ошибка — экран «не найдено», а не вечные заглушки;
//   4) разметка и настройки: ключ карточки — id отеля, строка «Ищем ещё…», сохраняются только
//      параметры поиска; фильтры тура и отеля раздельно, «Прямой перелёт» у отеля скрыт.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// .ts из src грузятся как ES-модули — убрать предупреждение Node о типе пакета.
process.removeAllListeners('warning');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e && e.message ? e.message : e}`);
  }
}

// ---------- загрузка .ts из src: без расширений; RTK и API — подмены ----------
const RTK_SHIM = `
function addMatch(creator, type) { creator.type = type; creator.match = (a) => a && a.type === type; return creator; }
export function createAsyncThunk(type, payloadCreator) {
  const pending = addMatch((meta) => ({ type: type + '/pending', meta }), type + '/pending');
  const fulfilled = addMatch((payload, meta) => ({ type: type + '/fulfilled', payload, meta }), type + '/fulfilled');
  const rejected = addMatch((payload, meta, error) => ({ type: type + '/rejected', payload, meta, error }), type + '/rejected');
  let seq = 0;
  const creator = (arg) => async (dispatch, getState) => {
    const requestId = type + '#' + (++seq);
    const meta = { arg, requestId };
    dispatch(pending(meta));
    const REJ = Symbol('rej');
    try {
      const result = await payloadCreator(arg, { dispatch, getState, requestId, rejectWithValue: (v) => ({ [REJ]: true, v }) });
      if (result && result[REJ]) return dispatch(rejected(result.v, meta, { message: 'Rejected' }));
      return dispatch(fulfilled(result, meta));
    } catch (e) {
      return dispatch(rejected(undefined, meta, { message: e && e.message }));
    }
  };
  return Object.assign(creator, { pending, fulfilled, rejected });
}
export function createSlice({ name, initialState, reducers, extraReducers }) {
  const cases = new Map();
  const actions = {};
  for (const [key, fn] of Object.entries(reducers || {})) {
    const type = name + '/' + key;
    actions[key] = addMatch((payload) => ({ type, payload }), type);
    cases.set(type, fn);
  }
  const builder = { addCase(ac, fn) { cases.set(typeof ac === 'string' ? ac : ac.type, fn); return builder; } };
  if (extraReducers) extraReducers(builder);
  const reducer = (state = initialState, action) => {
    const fn = cases.get(action.type);
    if (!fn) return state;
    const draft = structuredClone(state);
    const out = fn(draft, action);
    return out === undefined ? draft : out;
  };
  return { reducer, actions };
}
`;

const API_STUB = `
const api = () => globalThis.__fakeApi;
export const startSearch = (...a) => api().startSearch(...a);
export const checkSearchStatus = (...a) => api().checkSearchStatus(...a);
export const getSearchStatus = (...a) => api().getSearchStatus(...a);
export const getGroupedHotels = (...a) => api().getGroupedHotels(...a);
`;

const hookSource = `
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const RTK = 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(RTK_SHIM)});
const API = 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(API_STUB)});
function withExt(url) {
  for (const ext of ['', '.ts', '/index.ts']) {
    const u = url + ext;
    try { if (fs.statSync(fileURLToPath(u)).isFile()) return u; } catch {}
  }
  return null;
}
export async function resolve(specifier, context, next) {
  if (specifier === '@reduxjs/toolkit') return { url: RTK, shortCircuit: true };
  if (/(^|\\/)api\\/levelTravelApi$/.test(specifier)) return { url: API, shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL && context.parentURL.startsWith('file:')) {
    const u = withExt(new URL(specifier, context.parentURL).href);
    if (u) return { url: u, shortCircuit: true };
  }
  return next(specifier, context);
}
// Слайс импортирует типы обычным import (не import type) — Node без сборки их не видит: убираем строку.
export async function load(url, context, next) {
  const r = await next(url, context);
  if (url.endsWith('/store/slices/search.ts')) {
    const source = String(r.source).replace(/import \\{[^}]*\\} from '\\.\\.\\/types\\/search';/, '');
    return { ...r, source };
  }
  return r;
}
`;
register('data:text/javascript,' + encodeURIComponent(hookSource), import.meta.url);

const P = await import(pathToFileURL(path.join(root, 'src/utils/progressiveSearch.ts')).href);

console.log('Постепенная выдача поиска (приложение)');

// ---------- 1. чистые функции ----------

const H = (id, price) => ({ hotel: { id }, min_price: price });
const ids = (list) => list.map((x) => x.hotel.id);

await check('флаг PROGRESSIVE_SEARCH_ENABLED: включено; false — прежний путь', () => {
  assert.equal(P.PROGRESSIVE_SEARCH_ENABLED, true);
  const slice = read('src/modules/store/slices/search.ts');
  assert.match(slice, /if \(PROGRESSIVE_SEARCH_ENABLED\) \{\s*return runProgressiveFlow\(/);
  assert.match(slice, /interval = setInterval\(pollStatus, 6000\);/, 'прежний путь (опрос 6 с) на месте');
});

await check('Р4: «Ищем ещё у N операторов» — число pending / performing, падежи', () => {
  assert.equal(P.countSearchingOperators({ 1: 'pending', 2: 'performing', 3: 'completed', 4: 'skipped' }), 2);
  assert.equal(P.formatOperatorsLeft(1), 'Ищем ещё у 1 оператора');
  assert.equal(P.formatOperatorsLeft(2), 'Ищем ещё у 2 операторов');
  assert.equal(P.formatOperatorsLeft(7), 'Ищем ещё у 7 операторов');
  assert.equal(P.formatOperatorsLeft(11), 'Ищем ещё у 11 операторов');
  assert.equal(P.formatOperatorsLeft(21), 'Ищем ещё у 21 оператора');
});

await check('поиск закончен: completeness 100 или нет pending / performing', () => {
  assert.equal(P.isProgressiveSearchDone({ 1: 'performing', 2: 'skipped' }, 92), false);
  assert.equal(P.isProgressiveSearchDone({ 1: 'completed', 2: 'skipped' }, 92), true);
  assert.equal(P.isProgressiveSearchDone({ 1: 'performing' }, 100), true);
  assert.equal(P.isProgressiveSearchDone({}, 0), false);
  assert.equal(P.pollDelayMs(0, false), 1000, 'пока нет карточек — раз в секунду');
  assert.equal(P.pollDelayMs(0), 2000);
  assert.equal(P.pollDelayMs(16000, false), 3000);
  assert.equal(P.pollDelayMs(16000), 3000);
});

await check('Р1: видимые карточки не двигаются, новые встают по цене ниже них', () => {
  const shown = [H(1, 300), H(2, 100), H(3, 500), H(4, 700)];
  const incoming = [H(9, 50), H(2, 90), H(5, 400), H(1, 310), H(6, 600)];
  const out = P.mergeProgressiveHotels(shown, incoming, { sortBy: 'price,asc', frozenCount: 2 });
  assert.deepEqual(ids(out), [1, 2, 9, 5, 3, 6, 4]);
  assert.equal(out[0].min_price, 310, 'у видимой карточки обновилась цена');
  assert.equal(out[1].min_price, 90);
  const desc = P.mergeProgressiveHotels(shown, incoming, { sortBy: 'price,desc', frozenCount: 1 });
  assert.deepEqual(ids(desc), [1, 4, 6, 3, 5, 2, 9]);
});

await check('склейка по рекомендации: порядок LT ниже видимых, без дублей, ничего не теряется', () => {
  const shown = [H(1), H(2), H(3), H(4)];
  const incoming = [H(5), H(3), H(1), H(6)];
  const out = P.mergeProgressiveHotels(shown, incoming, { sortBy: 'relevance', frozenCount: 2 });
  assert.deepEqual(ids(out), [1, 2, 5, 3, 6, 4]);
  assert.deepEqual(ids(P.mergeProgressiveHotels([], incoming, {})), [5, 3, 1, 6]);
  assert.deepEqual(ids(P.mergeProgressiveHotels(shown, [], { frozenCount: 10 })), [1, 2, 3, 4]);
});

await check('догрузка страницы: только новые отели (старый mergeHotelPages добавлял повторы)', () => {
  assert.deepEqual(ids(P.appendUniqueHotels([H(1), H(2)], [H(2), H(3), H(3)])), [1, 2, 3]);
  assert.deepEqual(ids(P.appendUniqueHotels([H(1), H(2)], [H(1), H(2)])), [1, 2]);
});

await check('видимые карточки: число от списка (FlatList), без провайдера — 0', () => {
  P.setVisibleHotelCountProvider(() => 3);
  assert.equal(P.getVisibleHotelCount(), 3);
  P.setVisibleHotelCountProvider(() => { throw new Error('x'); });
  assert.equal(P.getVisibleHotelCount(), 0);
  P.setVisibleHotelCountProvider(null);
  assert.equal(P.getVisibleHotelCount(), 0);
});

// ---------- 2. runProgressiveSearch на поддельном LT ----------

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; }, add: (ms) => { t += ms; } };
}

/** timeline: [{ at, status, completeness, hotels: [...ids] }] — состояние LT начиная с секунды at. */
function fakeLt(c, timeline, { fetchMs = 300 } = {}) {
  const calls = { status: 0, grouped: [], start: 0 };
  const at = () => [...timeline].reverse().find((s) => c.now() >= s.at * 1000) || timeline[0];
  return {
    calls,
    startSearch: async () => { calls.start++; return { request_id: 'RID', status: timeline[0].status }; },
    checkStatus: async () => { calls.status++; const s = at(); return { status: s.status, completeness: s.completeness }; },
    fetchPage: async (params) => {
      calls.grouped.push({ ...params });
      c.add(fetchMs);
      const s = at();
      return { hotels: s.hotels.map((id) => H(id, 100 + id)), hotels_count: s.hotels.length, sort_by: params.sort_by };
    },
  };
}

const HOTEL_TIMELINE = [
  { at: 0, status: { 6: 'pending', 78: 'pending' }, completeness: 0, hotels: [] },
  { at: 2, status: { 6: 'skipped', 78: 'performing' }, completeness: 50, hotels: [1, 2, 3] },
  { at: 8, status: { 6: 'skipped', 78: 'performing' }, completeness: 50, hotels: [1, 2, 3, 4, 5] },
  { at: 28, status: { 6: 'skipped', 78: 'completed' }, completeness: 100, hotels: [1, 2, 3, 4, 5, 6] },
];

await check('поиск отелей: карточки до «completed» (оператор performing), выдача растёт, финал на 100 %', async () => {
  const c = clock();
  const lt = fakeLt(c, HOTEL_TIMELINE);
  const pages = [];
  const statuses = [];
  const res = await P.runProgressiveSearch({
    searchParams: { search_type: 'hotel' },
    startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => ({ sort_by: 'relevance', page_limit: 50 }),
    isCurrent: () => true,
    onStatus: (s) => statuses.push(s.operatorsLeft),
    onPage: (page, info) => pages.push({ n: page.hotels.length, ...info, t: c.now() }),
    now: c.now, sleep: c.sleep,
  });
  assert.equal(res.outcome, 'complete');
  assert.ok(res.firstHotelsAtMs <= 3000, `первые карточки на ${res.firstHotelsAtMs} мс`);
  assert.equal(pages[0].first, true);
  assert.equal(pages[0].n, 3);
  assert.ok(pages.some((p) => p.n === 5), 'выдача выросла, пока оператор ещё performing');
  assert.equal(pages.at(-1).final, true);
  assert.equal(pages.at(-1).n, 6);
  assert.ok(statuses.includes(1), 'Р4: «у 1 оператора»');
  assert.ok(lt.calls.grouped.every((p) => !('readyOperators' in p) && !('operator_ids' in p)), 'без operator_ids');
  assert.ok(lt.calls.grouped.every((p) => p.request_id === 'RID' && p.page_number === 1));
});

await check('тур: дозапрос, пока растёт выдача, не реже раза в 4 с; без лишних запросов', async () => {
  const c = clock();
  const lt = fakeLt(c, [
    { at: 0, status: { 1: 'pending', 2: 'pending', 3: 'pending' }, completeness: 0, hotels: [] },
    { at: 3, status: { 1: 'completed', 2: 'pending', 3: 'performing' }, completeness: 40, hotels: [1, 2] },
    { at: 12, status: { 1: 'completed', 2: 'cached', 3: 'performing' }, completeness: 70, hotels: [1, 2, 3, 4] },
    { at: 30, status: { 1: 'completed', 2: 'cached', 3: 'no_results' }, completeness: 100, hotels: [1, 2, 3, 4] },
  ]);
  const pages = [];
  const res = await P.runProgressiveSearch({
    searchParams: {}, startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => ({ sort_by: 'price,asc' }), isCurrent: () => true,
    onPage: (page, info) => pages.push({ n: page.hotels.length, t: c.now(), ...info }),
    now: c.now, sleep: c.sleep,
  });
  assert.equal(res.outcome, 'complete');
  // LT отдаёт первые отели с 3-й секунды; опрос раз в 1 с + ответ выдачи 0,3 с.
  assert.ok(pages[0].t <= 4300, `первые карточки на ${pages[0].t} мс (у LT — с 3-й секунды)`);
  // Не реже раза в 4 с (+ время ответа выдачи 0,3 с).
  for (let i = 1; i < pages.length; i++) assert.ok(pages[i].t - pages[i - 1].t <= 4300, `перерыв между обновлениями ${pages[i].t - pages[i - 1].t} мс`);
  assert.ok(lt.calls.grouped.length <= 12, `запросов выдачи ${lt.calls.grouped.length}`);
  assert.ok(lt.calls.status <= 20, `опросов статуса ${lt.calls.status}`);
});

await check('все операторы без результатов: пустая финальная страница (экран «не найдено»), без ошибки', async () => {
  const c = clock();
  const lt = fakeLt(c, [
    { at: 0, status: { 1: 'pending' }, completeness: 0, hotels: [] },
    { at: 4, status: { 1: 'no_results' }, completeness: 100, hotels: [] },
  ]);
  const pages = [];
  const res = await P.runProgressiveSearch({
    searchParams: {}, startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => ({}), isCurrent: () => true, onPage: (p, i) => pages.push(i), now: c.now, sleep: c.sleep,
  });
  assert.equal(res.outcome, 'complete');
  assert.equal(pages.length, 1);
  assert.equal(pages[0].final, true);
});

await check('за 90 с ничего — ошибка «Search timed out» (как раньше); с отелями — конец без ошибки', async () => {
  const c = clock();
  const lt = fakeLt(c, [{ at: 0, status: { 1: 'performing' }, completeness: 10, hotels: [] }]);
  await assert.rejects(P.runProgressiveSearch({
    searchParams: {}, startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => ({}), isCurrent: () => true, onPage: () => {}, now: c.now, sleep: c.sleep,
  }), /Search timed out/);
  const c2 = clock();
  const lt2 = fakeLt(c2, [{ at: 0, status: { 1: 'performing' }, completeness: 10, hotels: [1] }]);
  const res = await P.runProgressiveSearch({
    searchParams: {}, startSearch: lt2.startSearch, checkStatus: lt2.checkStatus, fetchPage: lt2.fetchPage,
    getListParams: () => ({}), isCurrent: () => true, onPage: () => {}, now: c2.now, sleep: c2.sleep,
  });
  assert.equal(res.outcome, 'timeout');
  assert.ok(c2.now() <= 95_000);
});

await check('отмена: новый поиск / уход со страницы — старый цикл сразу останавливается', async () => {
  const c = clock();
  const lt = fakeLt(c, HOTEL_TIMELINE);
  let current = true;
  const pages = [];
  const res = await P.runProgressiveSearch({
    searchParams: {}, startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => ({}), isCurrent: () => current,
    onPage: (p) => { pages.push(p); current = false; }, now: c.now, sleep: c.sleep,
  });
  assert.equal(res.outcome, 'cancelled');
  assert.equal(pages.length, 1);
  const statusCalls = lt.calls.status;
  assert.ok(statusCalls <= 3);
});

await check('фильтр сменили, пока ждали ответ: ответ под старые фильтры выброшен, запрос с новыми', async () => {
  const c = clock();
  const lt = fakeLt(c, HOTEL_TIMELINE);
  let filters = { sort_by: 'relevance' };
  const origFetch = lt.fetchPage;
  const pages = [];
  let clickedAt = -1;
  lt.fetchPage = async (params) => {
    const r = await origFetch(params);
    // Клик по фильтру, пока шёл первый запрос после первой страницы.
    if (pages.length === 1 && clickedAt < 0) {
      clickedAt = lt.calls.grouped.length;
      filters = { sort_by: 'price,asc', filter_stars: '5' };
    }
    return r;
  };
  await P.runProgressiveSearch({
    searchParams: {}, startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => filters, isCurrent: () => true,
    onPage: (p, info) => pages.push(info.listParams), now: c.now, sleep: c.sleep,
  });
  assert.equal(pages[0].sort_by, 'relevance');
  assert.ok(pages.slice(1).every((p) => p.sort_by === 'price,asc' && p.filter_stars === '5'), 'после клика — только новые фильтры');
  assert.equal(lt.calls.grouped[clickedAt].sort_by, 'price,asc', 'сразу новый запрос с новыми фильтрами');
});

await check('пока идёт запрос фильтра, поиск не запрашивает выдачу и не опрашивает статус', async () => {
  const c = clock();
  const lt = fakeLt(c, HOTEL_TIMELINE);
  let busyUntil = 5_000;
  const res = await P.runProgressiveSearch({
    searchParams: {}, startSearch: lt.startSearch, checkStatus: lt.checkStatus, fetchPage: lt.fetchPage,
    getListParams: () => ({}), isCurrent: () => true, isListBusy: () => c.now() >= 2_000 && c.now() < busyUntil,
    onPage: () => {}, now: c.now, sleep: c.sleep,
  });
  assert.equal(res.outcome, 'complete');
  const during = lt.calls.grouped.length;
  assert.ok(during >= 2);
});

// ---------- 3. slice поиска целиком ----------

const sliceMod = await import(pathToFileURL(path.join(root, 'src/modules/store/slices/search.ts')).href);
const { default: reducer, runFullSearchFlow, searchFilters, clearSearch } = sliceMod;

function makeStore() {
  let state = { search: reducer(undefined, { type: '@@init' }) };
  const store = {
    getState: () => state,
    dispatch: (action) => {
      if (typeof action === 'function') return action(store.dispatch, store.getState);
      state = { search: reducer(state.search, action) };
      return action;
    },
  };
  return store;
}

const SP = (to_country, search_type = 'package') => ({
  from_city: 'Moscow', from_country: 'RU', to_country, adults: '2', kids: '0', start_date: '2026-11-25',
  nights: '7', search_type, page_number: 1, page_limit: 20, sort_by: 'relevance',
});
const FP = (extra = {}) => ({ filter_instant_confirm: false, page_number: 1, page_limit: 20, sort_by: 'relevance', ...extra });

/** Поддельный API: настоящие таймеры, но короткие; каждый поиск — свой request_id. */
function sliceApi({ hotelsFor = () => [1, 2, 3], doneAfter = 2, groupedDelay = () => 0, fail = false } = {}) {
  const polls = new Map();
  const calls = { grouped: [], start: [] };
  globalThis.__fakeApi = {
    startSearch: async (p) => { calls.start.push({ ...p }); if (fail) throw new Error('boom'); return { request_id: 'R-' + p.to_country }; },
    checkSearchStatus: async () => { throw new Error('прежний путь не должен вызываться'); },
    getSearchStatus: async (rid) => {
      const n = (polls.get(rid) || 0) + 1;
      polls.set(rid, n);
      return n >= doneAfter
        ? { status: { 1: 'completed', 2: 'no_results' }, completeness: 100 }
        : { status: { 1: 'performing', 2: 'pending' }, completeness: 40 };
    },
    getGroupedHotels: async (params) => {
      calls.grouped.push({ ...params });
      const wait = groupedDelay(params);
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const list = hotelsFor(params).map((id) => H(id, 100 + id));
      return { ...params, hotels: list, hotels_count: list.length };
    },
  };
  return calls;
}

await check('slice: два поиска подряд — побеждает последний, ответы первого выброшены', async () => {
  sliceApi({ hotelsFor: (p) => (p.request_id === 'R-EG' ? [11, 12] : [21, 22, 23]), groupedDelay: (p) => (p.request_id === 'R-EG' ? 30 : 0) });
  const store = makeStore();
  const first = store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP({ filter_stars: '3,4,5' }) }));
  await new Promise((r) => setTimeout(r, 5));
  const second = store.dispatch(runFullSearchFlow({ searchParams: SP('TR', 'hotel'), filterParams: FP() }));
  await Promise.all([first, second]);
  await new Promise((r) => setTimeout(r, 60));
  const s = store.getState().search;
  assert.equal(s.hotels.request_id, 'R-TR');
  assert.deepEqual(ids(s.allMyHotels), [21, 22, 23]);
  assert.equal(s.hotels.search_type, 'hotel');
  assert.ok(!('filter_stars' in s.hotels), 'фильтр тура (3–5★) не попал в поиск отелей');
  assert.equal(s.loading, false);
  assert.equal(s.searchingOperators, null);
});

await check('slice: выдача без operator_ids; readyOperators в ответе — все операторы поиска (выдачу не сужает)', async () => {
  const calls = sliceApi({});
  const store = makeStore();
  await store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP({ readyOperators: ['6'], filter_stars: '3,4,5' }) }));
  assert.ok(calls.grouped.length > 0);
  assert.ok(calls.grouped.every((p) => !('readyOperators' in p) && !('operator_ids' in p)));
  assert.ok(calls.grouped.every((p) => p.filter_stars === '3,4,5' && p.search_type === 'package' && p.page_limit === 20));
  const s = store.getState().search;
  assert.deepEqual([...s.hotels.readyOperators].sort(), ['1', '2']);
  assert.equal(s.requestId, 'R-EG');
  assert.equal(s.hotels.emptyType, 'RELOAD');
});

await check('slice: поиск отелей без города вылета (buildApiSearchParams, как раньше)', async () => {
  const calls = sliceApi({});
  const store = makeStore();
  await store.dispatch(runFullSearchFlow({ searchParams: SP('TR', 'hotel'), filterParams: FP() }));
  assert.ok(!('from_city' in calls.start[0]) && !('from_country' in calls.start[0]));
  assert.equal(calls.start[0].search_type, 'hotel');
});

await check('slice: новые отели вливаются, видимые карточки на местах, «Ищем ещё» до конца поиска', async () => {
  let round = 0;
  sliceApi({ doneAfter: 4, hotelsFor: () => (++round === 1 ? [1, 2, 3] : [9, 1, 2, 3, 8]) });
  P.setVisibleHotelCountProvider(() => 2);
  const store = makeStore();
  const seen = [];
  const origDispatch = store.dispatch;
  store.dispatch = (a) => { const r = origDispatch(a); if (a?.type === 'search/progressiveStatus') seen.push(store.getState().search.searchingOperators); return r; };
  await store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP() }));
  P.setVisibleHotelCountProvider(null);
  const s = store.getState().search;
  assert.deepEqual(ids(s.allMyHotels).slice(0, 2), [1, 2], 'видимые 1, 2 на местах');
  assert.deepEqual([...ids(s.allMyHotels)].sort(), [1, 2, 3, 8, 9]);
  assert.ok(seen.some((n) => n > 0), 'Р4: число ищущих операторов было в state');
  assert.equal(s.searchingOperators, null);
});

await check('slice: фильтр во время поиска — ответ раннего клика выброшен; поиск продолжает с новыми фильтрами', async () => {
  const calls = sliceApi({ doneAfter: 3, hotelsFor: (p) => (p.filter_stars === '5' ? [5] : p.filter_stars === '4' ? [4] : [1, 2, 3]), groupedDelay: (p) => (p.filter_stars === '4' ? 40 : 5) });
  const store = makeStore();
  const run = store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP() }));
  while (!store.getState().search.hotels) await new Promise((r) => setTimeout(r, 2));
  const early = store.dispatch(searchFilters({ request_id: 'R-EG', filter_stars: '4', page_number: 1 }));
  assert.equal(store.getState().search.refreshing, true);
  const late = store.dispatch(searchFilters({ request_id: 'R-EG', filter_stars: '5', page_number: 1 }));
  await Promise.all([early, late, run]);
  const s = store.getState().search;
  assert.deepEqual(ids(s.allMyHotels), [5]);
  assert.equal(s.refreshing, false);
  const after = calls.grouped.slice(calls.grouped.findIndex((p) => p.filter_stars === '5') + 1).filter((p) => !p.filter_stars || p.filter_stars !== '5');
  assert.equal(after.filter((p) => !('filter_stars' in p) || p.filter_stars === '4').length, 0, 'после клика поиск не запрашивал выдачу со старыми фильтрами');
});

await check('slice: догрузка страницы — без повторов; страница старого поиска не вливается', async () => {
  sliceApi({ hotelsFor: (p) => (p.page_number > 1 ? [3, 4, 5] : [1, 2, 3]) });
  const store = makeStore();
  await store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP() }));
  await store.dispatch(searchFilters({ request_id: 'R-EG', page_number: 2 }));
  assert.deepEqual(ids(store.getState().search.allMyHotels), [1, 2, 3, 4, 5]);
  await store.dispatch(searchFilters({ request_id: 'R-OLD', page_number: 3 }));
  assert.deepEqual(ids(store.getState().search.allMyHotels), [1, 2, 3, 4, 5]);
});

await check('slice: ошибка поиска — экран «не найдено» с кнопкой, а не вечные заглушки', async () => {
  sliceApi({ fail: true });
  const store = makeStore();
  await store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP() }));
  const s = store.getState().search;
  assert.equal(s.loading, false);
  assert.ok(s.hotels && Array.isArray(s.hotels.hotels) && s.hotels.hotels.length === 0);
  assert.equal(s.hotels.emptyType, 'RELOAD');
});

await check('slice: clearSearch (форма поиска) не обрывает только что начатый поиск', async () => {
  sliceApi({});
  const store = makeStore();
  const run = store.dispatch(runFullSearchFlow({ searchParams: SP('EG'), filterParams: FP() }));
  store.dispatch(clearSearch());
  await run;
  assert.deepEqual(ids(store.getState().search.allMyHotels), [1, 2, 3]);
});

// ---------- 4. разметка и настройки ----------

await check('список: ключ — id отеля, «Ищем ещё у N операторов» (телефон — полосой, iPad — плашкой), «Ищем подходящие отели», видимые карточки считает FlatList', () => {
  const src = read('src/component/searchResult/ResultList.tsx');
  assert.match(src, /keyExtractor=\{\(item, index\) => \(item\.id \? `hotel-\$\{item\.id\}` : `hotel-i-\$\{index\}`\)\}/);
  assert.match(src, /onViewableItemsChanged=\{onViewableItemsChanged\}/);
  assert.match(src, /setVisibleHotelCountProvider\(\(\) => maxSeenIndexRef\.current \+ 1\)/);
  assert.match(src, /\{ searchingText: formatOperatorsLeft\(Number\(searchingOperators\)\) \}/);
  // Телефон — отдельной полосой под строкой сортировки (в одну строку обрезалось), iPad — плашкой рядом.
  const header = read('src/component/searchResult/ListHeader.tsx');
  assert.match(header, /if \(!tablet && searchingBadge\) \{/);
  assert.match(header, /\{tablet && searchingBadge \? \(/);
  assert.match(src, />\s*Ищем подходящие отели\s*</, 'пока отелей нет — текст над заглушками');
});

await check('сохранение: после перезапуска — только параметры поиска, без старой выдачи', () => {
  const src = read('src/modules/store/index.ts');
  assert.match(src, /whitelist: \['searchParams', 'headerName'\]/);
  assert.match(src, /search: persistReducer\(searchPersistConfig, searchReducer\)/);
  assert.match(src, /whitelist: \['auth', 'supportChat'\]/);
});

await check('фильтры тура и отеля раздельно: новый поиск — свои значения по умолчанию; у отеля без «Прямого перелёта»', () => {
  const form = read('src/component/home/searchSection/Search.tsx');
  assert.match(form, /\.\.\.\(isHotelDestination \|\| isHotelOnly\s*\? \{\}\s*: \{\s*filter_stars: '3,4,5',\s*\}\)/, 'у тура 3–5★, у отеля без звёзд; фильтры прошлого поиска не переносятся');
  const fm = read('src/component/searchResult/modals/FiltersModalContent.tsx');
  assert.match(fm, /const TOUR_ONLY_AMENITY_KEYS = new Set<string>\(\['direct_flight'\]\);/);
  assert.match(fm, /if \(isHotelSearch && TOUR_ONLY_AMENITY_KEYS\.has\(a\.key\)\) return false;/);
  assert.match(fm, /filters\.amenities\.includes\(a\.key\) && !tourOnlyOff \? true : ''/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
