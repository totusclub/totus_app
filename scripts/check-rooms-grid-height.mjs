// iPad, страница отеля, «Выберите номер»: карточки номеров в ряду одной высоты (19.10.2026).
// Было: карточка с несколькими фото (точки под фото) или с лишней строкой («Быстрое подтверждение»)
// выше соседних — ряд «лесенкой», кнопки «Все варианты» на разной высоте.
// Стало: ряд тянет карточки до самой высокой, цена и «Все варианты» прижаты к низу.
// Запуск: node scripts/check-rooms-grid-height.mjs (без npm install).
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

const rooms = code(read('src/component/hotel/HotelRoomsSection.tsx'));
const card = code(read('src/component/UI/hotelCard/index.tsx'));
const grid = code(read('src/component/UI/tablet/index.tsx'));

console.log('Сетка номеров на iPad');

check('ряд сетки тянет карточки до самой высокой (alignItems: stretch)', () => {
  assert.match(rooms, /<TabletGrid\s+items=\{displayRooms\}\s+columns=\{columns\}\s+rowStyle=\{styles\.gridRowStretch\}/);
  assert.match(rooms, /gridRowStretch: \{\s*alignItems: 'stretch',\s*\}/);
  assert.match(grid, /style=\{\[styles\.gridRow, \{ gap \}, rowStyle\]\}/);
  assert.match(grid, /gridCell: \{\s*flex: 1,/);
});

check('карточка номера на iPad получает equalHeight, на телефоне — нет', () => {
  const tablet = rooms.slice(rooms.indexOf('<TabletGrid'), rooms.indexOf(') : displayRooms.map'));
  assert.match(tablet, /type="room"[\s\S]*?equalHeight\s/);
  const phone = rooms.slice(rooms.indexOf(') : displayRooms.map'));
  assert.ok(!/equalHeight/.test(phone), 'телефонный список не должен тянуться');
});

check('карточка номера: заполняет ячейку, цена и «Все варианты» внизу', () => {
  assert.match(card, /isRoomCard && styles\.roomCard,\s*\{ backgroundColor: theme\.cardBackground \},\s*equalHeight && styles\.cardEqualHeight,/);
  assert.match(card, /<View style=\{\[styles\.content, equalHeight && isRoomCard && styles\.contentEqualHeight\]\}>/);
  assert.match(card, /<View style=\{\[styles\.roomPriceWrap, equalHeight && styles\.priceSectionBottom\]\}>/);
  assert.match(card, /cardEqualHeight: \{\s*flex: 1,\s*\}/);
  assert.match(card, /contentEqualHeight: \{\s*flex: 1,\s*\}/);
  assert.match(card, /priceSectionBottom: \{\s*marginTop: 'auto',\s*\}/);
});

check('кнопка «Все варианты» — сразу после цены, в том же блоке', () => {
  const i = card.lastIndexOf('styles.roomPriceWrap, equalHeight');
  const tail = card.slice(i, i + 900);
  assert.match(tail, /title="Все варианты"/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
