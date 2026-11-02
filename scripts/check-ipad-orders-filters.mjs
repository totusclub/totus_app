// iPad: «Заказы» и панель фильтров выдачи по макетам «вариант A» (утверждены владельцем 02.11.2026).
// Запуск: node scripts/check-ipad-orders-filters.mjs (без npm install).
// Проверяет: на iPad — новые экраны; на телефоне — всё как раньше.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

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

const screen = read('src/screens/orders/orders.tsx');
const tabletList = read('src/component/orders/OrdersTabletList.tsx');
const listItem = read('src/component/orders/OrderListItem.tsx');
const slider = read('src/component/UI/rangeSlider/index.tsx');
const content = read('src/component/searchResult/modals/FiltersModalContent.tsx');
const sidebar = read('src/component/searchResult/FiltersSidebarTablet.tsx');
const chipsRow = read('src/component/searchResult/SelectedFiltersRow.tsx');

console.log('Заказы (iPad, вариант A)');

check('новый список только на iPad и только когда есть заказы; телефон — прежний FlatList с OrderListItem', () => {
  assert.match(screen, /const showTabletList = isTablet && orders\.length > 0;/);
  assert.match(screen, /\) : showTabletList \? \(\s*<OrdersTabletList/);
  assert.match(screen, /renderItem=\{\(\{ item \}\) => wrapTablet\(<OrderListItem order=\{item\} \/>\)\}/);
  assert.match(screen, /<AppText style=\{\[styles\.title, \{ color: theme\.text \}\]\}>Заказы<\/AppText>/);
});

check('«Ожидают оплаты» — те же заказы, что с кнопкой «Оплатить» на телефоне', () => {
  assert.match(listItem, /const showPay = isOrderAwaitingPayment\(order\) && canPayWithSbp\(order\);/);
  assert.match(tabletList, /isOrderAwaitingPayment\(order\) && canPayWithSbp\(order\);/);
  assert.match(tabletList, /navigation\.navigate\('checkout', \{ order_id: id \}\)/);
  assert.match(tabletList, /navigation\.navigate\('orderDetails', \{ orderId: orderIdOf\(order\), order \}\)/);
});

check('тексты: «Ожидают оплаты», «Все заказы», колонки Отель / Даты / Вылет / Цена / Статус', () => {
  for (const t of ['>Ожидают оплаты<', '>Все заказы<', '>Отель<', '>Даты<', '>Вылет<', '>Цена<', '>Статус<']) {
    assert.ok(tabletList.includes(t), t);
  }
});

check('число заказов у заголовка: 1 заказ, 3 заказа, 9 заказов, 11 заказов, 21 заказ', () => {
  const src = screen.match(/function ordersCountLabel\(count: number\): string \{[\s\S]*?\n\}/)?.[0];
  assert.ok(src, 'ordersCountLabel не найдена');
  const fn = new Function(`${src.replace('(count: number): string', '(count)')}\nreturn ordersCountLabel;`)();
  assert.equal(fn(1), '1 заказ');
  assert.equal(fn(3), '3 заказа');
  assert.equal(fn(9), '9 заказов');
  assert.equal(fn(11), '11 заказов');
  assert.equal(fn(21), '21 заказ');
});

console.log('Фильтры выдачи (iPad, вариант A)');

check('ползунок цены: compact — по ширине панели; телефон и окно фильтров на iPad — как раньше', () => {
  assert.match(slider, /compact = false,/);
  assert.match(slider, /: isTablet\s*\? Math\.max\(\s*PHONE_TRACK_WIDTH,/);
  assert.match(slider, /: PHONE_TRACK_WIDTH;/);
  assert.match(content, /<RangeSlider\s+compact\s+label="Цена за тур"/);
  assert.match(content, /label="Стоимость, ₽"/);
});

check('панель: заголовок и «Показать N отелей» закреплены, разделы прокручиваются; число фильтров у заголовка', () => {
  assert.ok(!/ScrollView/.test(sidebar), 'панель не оборачивается в общий ScrollView');
  assert.match(sidebar, /activeCount=\{activeCount\}/);
  assert.match(content, /<ScrollView\s+style=\{sidebarStyles\.scroll\}/);
  assert.match(content, /title=\{`Показать \$\{count\} \$\{hotelsWord\(count\)\}`\}/);
});

check('разделы: открыты «Звёзды» и «Питание» (и любой с выбранным), длинные списки — 5 и «Ещё N»', () => {
  assert.match(content, /const SIDEBAR_OPEN_BY_DEFAULT = new Set<string>\(\['stars', 'meals'\]\);/);
  assert.match(content, /const SIDEBAR_LIST_LIMIT = 5;/);
  assert.match(content, /SIDEBAR_OPEN_BY_DEFAULT\.has\(id\) \|\| selected\.length > 0/);
  assert.match(content, /Ещё \{hidden\}/);
});

check('окно фильтров на телефоне не тронуто: «Применить», чипы, порядок разделов', () => {
  assert.match(content, /<AppButton title="Применить" onPress=\{handleApply\} size="large" \/>/);
  assert.match(content, /\{renderChipSection\('Количество звёзд', starOptions, filters\.stars, 'stars'\)\}/);
});

check('чипы над выдачей: на iPad светлые и без «Любое подтверждение», на телефоне — прежние', () => {
  assert.match(chipsRow, /chip\.key === 'filter_confirmability' && chip\.value === '3'/);
  assert.match(chipsRow, /return isTablet \? all\.filter\(chip => !isDefaultChip\(chip\)\) : all;/);
  assert.match(chipsRow, /style=\{\[styles\.chip, \{ backgroundColor: theme\.brand \}\]\}/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
