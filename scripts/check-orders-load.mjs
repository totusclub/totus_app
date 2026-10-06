// Check: «Заказы» load fast and never crash the app; order logic unchanged.
//
// Run: node scripts/check-orders-load.mjs   (Node >= 22.18, no npm install)
//
// Owner report 06.10.2026: orders load too long, sometimes the app crashes. Causes in the app:
//  1. A date the formatter cannot read (`Intl.DateTimeFormat#format(Invalid Date)` throws
//     RangeError) inside a card -> the whole app falls (no error boundary).
//  2. Four `new Intl.DateTimeFormat` per card per render (expensive on Android / Hermes).
//  3. Every API response body was console.logged in release builds too — /user/orders with full
//     Level.Travel packages was serialized on the JS thread (freeze, memory).
//  4. A token refresh changed `accessToken` -> a second parallel /user/orders; a late answer
//     could overwrite a newer one; an error wiped the list; no timeout -> endless spinner.
//  5. Order details: `pkg.pansion_description` without `?.`; a broken tourist entry.
// Server side (one query for documents instead of one per order): totus_API
// scripts/check-user-orders-batch.js.

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

module.registerHooks({
  resolve(specifier, context, next) {
    if (specifier === './ticketsUtils/flightTransformers') {
      return {url: 'mock:flightTransformers', shortCircuit: true};
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:flightTransformers') {
      return {format: 'module', source: 'export const formatPrice = v => (v ? `${v} ₽` : "—");', shortCircuit: true};
    }
    return next(url, context);
  },
});

// Count Intl.DateTimeFormat constructions.
const RealDTF = Intl.DateTimeFormat;
let dtfCreated = 0;
Intl.DateTimeFormat = function (...a) {
  dtfCreated++;
  return new RealDTF(...a);
};
Intl.DateTimeFormat.prototype = RealDTF.prototype;

const utils = await import(pathToFileURL(path.join(root, 'src/utils/ordersUtils.ts')).href);

// The previous implementation, for "same output" checks on valid data.
const oldDay = v => new RealDTF('ru-RU', {day: 'numeric', month: 'long'}).format(v);
const oldWeek = v => new RealDTF('ru-RU', {weekday: 'short'}).format(v);

out('Orders: dates never crash a card');
await check('valid dates: exactly the same text as before', () => {
  assert.equal(utils.formatOrderDate('2026-09-01T10:00:00Z'), oldDay(new Date('2026-09-01T10:00:00Z')));
  assert.equal(utils.formatOrderDate(1756720800), oldDay(new Date(1756720800 * 1000)));
  const pkg = {dates_info: {start_date: '2026-10-12', end_date: '2026-10-19'}, departure: {name_ru: 'Москва'}};
  const s = new Date('2026-10-12');
  const e = new Date('2026-10-19');
  assert.equal(utils.formatPeriod(pkg), `${oldDay(s)}, ${oldWeek(s)} – ${oldDay(e)}, ${oldWeek(e)}`);
  assert.equal(utils.formatDeparture(pkg), `Вылет: Москва, ${oldDay(s)}`);
  assert.equal(utils.formatOrderDate(undefined), '—');
  assert.equal(utils.formatPeriod({}), '');
  assert.equal(utils.formatDeparture({departure: {name: 'Казань'}}), 'Вылет: Казань, ');
});
await check('invalid dates (old code throws RangeError -> app crash): placeholder, no exception', () => {
  assert.throws(() => oldDay(new Date('not a date')), RangeError, 'premise: format(Invalid Date) throws');
  assert.equal(utils.formatOrderDate('not a date'), '—');
  assert.equal(utils.formatOrderDate(1e20), '—');
  assert.equal(utils.formatPeriod({dates_info: {start_date: 'bad', end_date: '2026-10-19'}}), '');
  assert.equal(utils.formatDeparture({dates_info: {start_date: 'bad'}, departure: {name_ru: 'Сочи'}}), 'Вылет: Сочи, ');
});
await check('formatters are created once, not four per card per render', () => {
  const before = dtfCreated;
  for (let i = 0; i < 50; i++) {
    const pkg = {dates_info: {start_date: '2026-10-12', end_date: '2026-10-19'}};
    utils.formatOrderDate('2026-09-01');
    utils.formatPeriod(pkg);
    utils.formatDeparture(pkg);
  }
  assert.ok(dtfCreated - before <= 2, `created ${dtfCreated - before}`);
});
await check('sorting and statuses untouched', () => {
  const sorted = utils.sortOrdersNewestFirst([
    {order_id: 1, created_at: '2026-01-01'},
    {order_id: 2, created_at: '2026-03-01'},
  ]);
  assert.deepEqual(sorted.map(o => o.order_id), [2, 1]);
  assert.equal(typeof utils.getStatusLabel, 'function');
});

out('\nOrders screen: one request, no endless spinner, list kept');
const screen = code(read('src/screens/orders/orders.tsx'));
await check('a token refresh does not start a second /user/orders (depends on login + user id)', () => {
  assert.match(screen, /\}, \[isLoggedIn, userId\]\);/);
  assert.ok(!/\}, \[accessToken, user\?\.id\]\);/.test(screen));
});
await check('a late answer never overwrites a newer one; no setState after leaving the screen', () => {
  assert.match(screen, /const seq = \+\+requestSeq\.current;/);
  assert.match(screen, /if \(!mounted\.current \|\| seq !== requestSeq\.current\) return;/);
});
await check('timeout: the screen stops waiting after 30 s', () => {
  assert.match(screen, /ORDERS_LOAD_TIMEOUT_MS = 30000/);
  assert.match(screen, /withTimeout\(getOrdersUsers\(Number\(userId\)\), ORDERS_LOAD_TIMEOUT_MS\)/);
});
await check('reopening shows the last list at once (memory only), error keeps the shown list', () => {
  assert.match(screen, /useState<Order\[\]>\(cached \?\? \[\]\)/);
  assert.match(screen, /if \(!hasShownList\) setLoading\(true\);/);
  assert.match(screen, /if \(!hasShownList\) setOrders\(\[\]\);/);
  assert.match(screen, /if \(!isLoggedIn\) lastOrders = null;/, 'logout clears it');
  assert.ok(!/AsyncStorage/.test(screen), 'large packages never go to AsyncStorage');
});
await check('list: memoized cards, small first render, same texts and navigation', () => {
  assert.match(screen, /initialNumToRender=\{6\}/);
  assert.match(code(read('src/component/orders/OrderListItem.tsx')), /export default React\.memo\(OrderListItem\);/);
  assert.match(screen, /Заказов пока нет/);
  assert.match(screen, /Войдите, чтобы видеть заказы/);
  assert.match(code(read('src/component/orders/OrderListItem.tsx')), /navigation\.navigate\('orderDetails', \{\s*orderId: order\?\.order_id \?\? order\?\.id,\s*order,\s*\}\)/);
});

out('\nLogs and order details');
await check('response bodies are not logged in full (lists as a count, release: shape only)', () => {
  const ax = code(read('src/modules/axios/index.ts'));
  assert.match(ax, /if \(Array\.isArray\(data\)\) \{\s*return `\[\$\{data\.length\} items\]`;/);
  assert.match(ax, /if \(!__DEV__\) \{/);
  assert.match(ax, /console\.log\('\[API Response\]', path, summarizeApiPayload\(res\.data\)\);/);
});
await check('order details: no crash without a package or with a broken tourist', () => {
  assert.match(code(read('src/component/orders/order/OrderDetailsSections.tsx')), /value=\{pkg\?\.pansion_description\}/);
  const det = code(read('src/component/orders/order/OrderDetails.tsx'));
  assert.match(det, /Array\.isArray\(order\.package\?\.tourists\)/);
  assert.match(det, /\.filter\(\(tourist: any\) => tourist && typeof tourist === 'object'\)/);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
