// Выдача отелей: «Применить» в окне фильтров не уходит под нижнее меню (iPhone, iPad, Android).
// Запуск: node scripts/check-filters-above-tabbar.mjs (без npm install).
// Было (до 20.10.2026): нижнее меню position: 'absolute' (authStack), окно фильтров тянулось
// до низа экрана выдачи — его нижние ~37 pt (iPhone) с кнопкой «Применить» были под меню.
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

const modalSrc = read('src/component/searchResult/modals/FiltersModal.tsx');
const modal = code(modalSrc);
const content = code(read('src/component/searchResult/modals/FiltersModalContent.tsx'));
const tabs = code(read('src/navigation/authStack.tsx'));
const contentUi = code(read('src/component/UI/content/index.tsx'));

// tabBarOverlap из FiltersModal.tsx без TypeScript — считаем реальные числа
const fnSrc = modal.match(/export function tabBarOverlap\([\s\S]*?\n\}/)?.[0];
const marginSrc = modal.match(/const CONTENT_BOTTOM_MARGIN = (\d+);/);
let tabBarOverlap = null;
if (fnSrc && marginSrc) {
  const js = fnSrc
    .replace('export function', 'function')
    .replace(/\(tabBarHeight: number \| undefined, bottomInset: number\): number/, '(tabBarHeight, bottomInset)');
  tabBarOverlap = new Function(`const CONTENT_BOTTOM_MARGIN = ${marginSrc[1]};\n${js}\nreturn tabBarOverlap;`)();
}

console.log('Причина: меню поверх экрана');

check('нижнее меню position: absolute, экран выдачи кончается на inset + 12 (Content)', () => {
  assert.match(tabs, /position: 'absolute' as const/);
  assert.match(contentUi, /edges=\{hasBottomTabBar \? \['top', 'bottom'\] : \['top'\]\}/);
  assert.match(contentUi, /marginBottom: 12/);
  assert.match(modal, /const CONTENT_BOTTOM_MARGIN = 12;/);
});

console.log('Окно фильтров над меню');

check('высота меню берётся из BottomTabBarHeightContext (вне вкладок — 0, без падения)', () => {
  assert.match(modal, /import \{ BottomTabBarHeightContext \} from '@react-navigation\/bottom-tabs';/);
  assert.match(modal, /const tabBarHeight = useContext\(BottomTabBarHeightContext\);/);
  assert.ok(!/useBottomTabBarHeight\(/.test(modal), 'useBottomTabBarHeight бросает вне вкладок');
});

check('перекрытие: iPhone 37, iPhone SE 37, iPad вертикально 72, Android 49+48 → 37, вне вкладок 0', () => {
  assert.ok(tabBarOverlap, 'tabBarOverlap не найдена');
  assert.equal(tabBarOverlap(49 + 34, 34), 37); // iPhone с «чёлкой»
  assert.equal(tabBarOverlap(49, 0), 37); // iPhone SE
  assert.equal(tabBarOverlap(84 + 20, 20), 72); // iPad вертикально (84 pt из authStack)
  assert.equal(tabBarOverlap(49 + 48, 48), 37); // Android, кнопки навигации
  assert.equal(tabBarOverlap(undefined, 34), 0);
  assert.equal(tabBarOverlap(0, 34), 0);
  assert.equal(tabBarOverlap(30, 34), 0);
});

check('окно поднято на перекрытие, верх на месте (высота меньше на столько же)', () => {
  assert.match(modal, /const bottomOverlap = tabBarOverlap\(tabBarHeight, insets\.bottom\);/);
  assert.match(modal, /usableHeight - SEARCH_HEADER_HEIGHT - bottomOverlap/);
  assert.match(modal, /marginBottom: bottomOverlap,/);
});

check('над меню у «Применить» отступ 12, без лишнего inset; без меню — как раньше', () => {
  assert.match(modal, /<FiltersModalContent onClose=\{close\} aboveTabBar=\{bottomOverlap > 0\} \/>/);
  assert.match(content, /aboveTabBar = false,/);
  assert.match(content, /paddingBottom: aboveTabBar \? 12 : Math\.max\(insets\.bottom, 12\),/);
  assert.match(content, /<AppButton title="Применить" onPress=\{handleApply\} size="large" \/>/);
});

check('закрытое окно не изменилось (высота 0, не перехватывает нажатия); iPad горизонтально — боковая панель', () => {
  assert.match(modal, /rootClosed: \{[\s\S]*?height: 0,[\s\S]*?overflow: 'hidden',/);
  assert.match(modal, /pointerEvents=\{visible \? 'auto' : 'none'\}/);
  assert.match(content, /variant = 'sheet',/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
