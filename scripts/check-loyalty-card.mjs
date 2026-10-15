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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
