// iPad: окна формы поиска — карточка 540 pt по центру (макет «iPad: компактные окна поиска», 07.11.2026),
// календарь с прокруткой месяцев. Проверка по исходникам, без сборки: node scripts/check-ipad-search-sheets.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dir = new URL('../src/component/home/searchSection/modals/', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
let passed = 0;
const check = (name, fn) => {
  try { fn(); passed += 1; console.log(`ok   - ${name}`); }
  catch (e) { console.error(`FAIL - ${name}: ${e.message}`); process.exitCode = 1; }
};

const sheet = read('tabletSheet.tsx');
check('tabletSheet: ширина 540, не выше 80% экрана, списки до 800, ячейка календаря 48', () => {
  assert.match(sheet, /TABLET_SHEET_WIDTH = 540;/);
  assert.match(sheet, /TABLET_SHEET_MAX_HEIGHT_RATIO = 0\.8;/);
  assert.match(sheet, /TABLET_LIST_SHEET_MAX_HEIGHT = 800;/);
  assert.match(sheet, /TABLET_CALENDAR_CELL_HEIGHT = 48;/);
  assert.match(sheet, /modal: \{\s*margin: 0,\s*justifyContent: 'center',\s*\}/, 'у контейнера окна не должно быть alignItems (размытие полосой)');
  assert.match(sheet, /alignSelf: 'center',\s*width: TABLET_SHEET_WIDTH/);
  assert.match(sheet, /onPress=\{onClose\}/);
});

const modals = ['DateSelectionModal', 'DestinationSelectionModal', 'DepartureSelectionModal', 'NightsSelectionModal', 'TouristsSelectionModal'];
for (const m of modals) {
  const src = read(`${m}.tsx`);
  check(`${m}: iPad-стили только при isTablet, телефонный стиль окна прежний`, () => {
    assert.match(src, /import \{ useLayout \} from '\.\.\/\.\.\/\.\.\/\.\.\/hooks\/useLayout';/);
    assert.match(src, /const \{ isTablet \} = useLayout\(\);/);
    assert.match(src, /style=\{\[styles\.modal, isTablet && tabletSheetStyles\.modal\]\}/);
    assert.match(src, /isTablet \? <TabletSheetBackdrop /);
    assert.match(src, /isTablet && (\[)?tabletSheetStyles\.card/);
    assert.match(src, /modal: \{\s*margin: 0,\s*justifyContent: 'flex-end',\s*\}/, 'телефонный styles.modal изменён');
  });
}

const date = read('DateSelectionModal.tsx');
check('Календарь: 13 месяцев вперёд, прокрутка не перехватывается жестом смахивания (телефон и iPad)', () => {
  assert.match(date, /const MONTHS_TO_SHOW = 13;/);
  assert.doesNotMatch(date, /swipeDirection=/);
  assert.match(date, /<ScrollView\s+ref=\{scrollRef\}/);
  assert.match(date, /showsVerticalScrollIndicator=\{isTablet\}/);
});
check('Календарь на iPad: ячейка 48 pt, прокрутка к месяцу выбранной даты при открытии', () => {
  assert.match(date, /isTablet && styles\.calendarCellTablet/);
  assert.match(date, /calendarCellTablet: \{\s*aspectRatio: undefined,\s*height: TABLET_CALENDAR_CELL_HEIGHT,/);
  assert.match(date, /monthOffsets\.current\[monthKey\(month\)\] = e\.nativeEvent\.layout\.y;/);
  assert.match(date, /scrollRef\.current\?\.scrollTo\(\{ y, animated: false \}\)/);
  assert.match(date, /onLayout=\{\s*isTablet/);
});
check('Ночи: ползунок по ширине окна на iPad, по ширине экрана на телефоне', () => {
  const n = read('NightsSelectionModal.tsx');
  assert.match(n, /Math\.max\(200, \(isTablet \? TABLET_SHEET_WIDTH : windowWidth\) - 64\)/);
});
check('Куда / Город вылета: клавиатура не закрывает окно на iPad', () => {
  for (const m of ['DestinationSelectionModal', 'DepartureSelectionModal']) {
    assert.match(read(`${m}.tsx`), /avoidKeyboard=\{isTablet\}/, m);
  }
});

console.log(`\n${passed} проверок прошло${process.exitCode ? ', есть ошибки' : ''}`);
