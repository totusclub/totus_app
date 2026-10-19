// Карта лояльности в «Аккаунте» по утверждённому макету 15.10.2026: светлая тема — вариант C «Светлая»,
// тёмная — вариант B «Графит». Запуск: node scripts/check-loyalty-card.mjs (без npm install).
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

const card = read('src/component/account/LoyaltyCard.tsx');
const cardCode = code(card);
const account = code(read('src/component/account/Account.tsx'));

console.log('Карта лояльности');

check('«Аккаунт» показывает новую карту по теме (isDark), старый оранжевый фон не используется', () => {
  assert.match(account, /import LoyaltyCard from '\.\/LoyaltyCard';/);
  assert.match(account, /<LoyaltyCard\s+number=\{loyaltyId\}\s+name=\{userName\}\s+isDark=\{isDark\}\s+isTablet=\{isTablet\}\s+onCopy=\{handleCopyLoyaltyId\}\s*\/>/);
  assert.ok(!/LoyaltyCardBackground|cardHeight|loyaltyCardContainer/.test(account));
  assert.match(account, /String\(loyaltyId\)\.replace\(\/\\s\/g, ''\)/);
});

check('цвета как в макете: C (светлая) и B (тёмная)', () => {
  const block = (name) => cardCode.match(new RegExp(`${name}: \\{([\\s\\S]*?)\\n  \\}`))[1];
  const light = block('light');
  const dark = block('dark');
  for (const [k, v] of [['bg', '#F7F3EE'], ['border', '#E6DFD6'], ['ink', '#1F1F1F'], ['sub', '#5E5B56'], ['brand', '#C24A0E'], ['bird', '#FE732E']]) {
    assert.match(light, new RegExp(`${k}: '${v}'`), `light ${k}`);
  }
  for (const [k, v] of [['bg', '#1C1B1A'], ['border', '#2C2C2C'], ['ink', '#FFFFFF'], ['sub', '#BDB6AE'], ['brand', '#FE732E'], ['bird', '#FE732E']]) {
    assert.match(dark, new RegExp(`${k}: '${v}'`), `dark ${k}`);
  }
  assert.match(cardCode, /const c = isDark \? LOYALTY_CARD_COLORS\.dark : LOYALTY_CARD_COLORS\.light;/);
});

check('пропорции банковской карты, Forum у заголовка, кнопка копирования 44 px с подписью', () => {
  assert.match(cardCode, /aspectRatio: 1\.586/);
  assert.match(cardCode, /title: \{\s*fontFamily: FONT_HEADING,\s*fontSize: 26/);
  assert.match(card, /numberOfLines=\{1\}\s+adjustsFontSizeToFit\s+minimumFontScale=\{0\.75\}>\s+Карта лояльности\s+</, 'заголовок в одну строку на узких экранах');
  assert.match(card, />Totus Club</);
  assert.match(card, />Ваш персональный номер</);
  assert.match(cardCode, /copyButton: \{\s*width: 44,\s*height: 44,\s*flexShrink: 0/);
  assert.match(cardCode, /monogram: \{\s*width: 32,\s*height: 32,\s*flexShrink: 0/);
  assert.match(cardCode, /accessibilityLabel="Скопировать номер карты"/);
});

// функции номера и инициалов — без react-native
const fnSrc = (name) => {
  const m = card.match(new RegExp(`export function ${name}\\(([^)]*)\\): string \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(m, name);
  const args = m[1].split(',').map((a) => a.split(':')[0].trim());
  // eslint-disable-next-line no-new-func
  return new Function(...args, m[2].replace(/\?\.\(/g, '?.('));
};

check('номер группами по 4, пустой — нули; инициалы из имени и фамилии', () => {
  const fmt = fnSrc('formatLoyaltyNumber');
  assert.equal(fmt('5281047399162045'), '5281 0473 9916 2045');
  assert.equal(fmt('5281 0473 9916 2045'), '5281 0473 9916 2045');
  assert.equal(fmt(12345), '1234 5');
  assert.equal(fmt(undefined), '0000 0000 0000 0000');
  const ini = fnSrc('loyaltyInitials');
  assert.equal(ini('Анна Смирнова'), 'АС');
  assert.equal(ini('  анна  '), 'А');
  assert.equal(ini('Анна Мария Смирнова'), 'АМ');
  assert.equal(ini(''), '');
});

console.log('Карта лояльности на iPad (макет 19.10.2026, вариант Б)');

check('iPad: без maxWidth 520 — высота не считается от ширины колонки (было 520 × 585)', () => {
  assert.ok(!/maxWidth:\s*520/.test(cardCode), 'maxWidth 520 вернулся');
  assert.ok(!/cardTablet/.test(cardCode), 'cardTablet вернулся');
  assert.match(cardCode, /width: '100%',\s*aspectRatio: 1\.586/);
});

check('iPad: карта и меню — один блок до 960 точек по центру, меню 380, промежуток 24', () => {
  assert.match(account, /<TabletColumns sideWidth=\{380\} gap=\{24\} side=\{settingsBlocks\} style=\{styles\.tabletBlock\}>/);
  assert.match(account, /tabletBlock: \{\s*width: '100%',\s*maxWidth: 960,\s*alignSelf: 'center',\s*\}/);
});

check('iPad: текст растёт с картой до 1.35×, телефон — 1×', () => {
  const m = /export function loyaltyCardScale\(width: number, isTablet\?: boolean\): number \{([\s\S]*?)\n\}/.exec(card);
  assert.ok(m, 'нет loyaltyCardScale');
  const fn = new Function('LOYALTY_CARD_BASE_WIDTH', 'LOYALTY_CARD_MAX_SCALE', 'width', 'isTablet', m[1]);
  const f = (w, t) => fn(359, 1.35, w, t);
  assert.equal(f(556, false), 1);
  assert.equal(f(343, true), 1);
  assert.equal(f(400, true), 1.11);
  assert.equal(f(556, true), 1.35);
  assert.equal(f(1000, true), 1.35);
  assert.equal(f(0, true), 1);
});

check('iPad: размеры текста, птицы, кнопки и инициалов берутся с увеличением', () => {
  for (const re of [/styles\.title, sz\(26, 30, 0\.5\)/, /styles\.number, sz\(21, 26, 1\.5\)/, /styles\.name, sz\(16, 20\)/,
    /styles\.caption, sz\(13, 16\)/, /styles\.club, sz\(11, 14, 1\.8\)/, /width=\{52 \* k\} height=\{28 \* k\}/,
    /width: 44 \* kb, height: 44 \* kb/, /width: 32 \* k, height: 32 \* k/, /onLayout=\{onLayout\}/]) {
    assert.match(cardCode, re);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
