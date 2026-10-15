// Check: the "Куда" picker shows the same country list and country images as the website
// (totus_WEB PR #49): on open, before typing — «Популярные страны» + «Другие страны» from
// Level.Travel /references/destinations (built-in list until it answers), each with its own
// country image by ISO2 or the first letter; while typing — the usual autocomplete.
//
// Run: node scripts/check-destination-countries.mjs   (Node >= 22.18, no npm install)

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import module from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = console.log.bind(console);
let failed = 0;
let passed = 0;
function check(name, fn) {
  try {
    fn();
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
  out('SKIP: need Node >= 22.18 (TypeScript type stripping, module.registerHooks)');
  process.exit(0);
}
// Imports in the app have no extension (Metro resolves them); add ".ts" for Node.
module.registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (e) {
      if (specifier.startsWith('.') && !path.extname(specifier)) return next(`${specifier}.ts`, context);
      throw e;
    }
  },
});

const DIR = 'src/component/home/searchSection';
const data = await import(pathToFileURL(path.join(root, DIR, 'utils/countryImageData.ts')).href);
const lib = await import(pathToFileURL(path.join(root, DIR, 'utils/countryImages.ts')).href);

// The same 57 countries as totus_WEB public/countries/*.svg
const WEB_ISO2 = [
  'AB', 'AE', 'AL', 'AM', 'AZ', 'BG', 'BH', 'BY', 'CN', 'CU', 'CY', 'CZ', 'DO', 'EG', 'ES',
  'FI', 'FR', 'GE', 'GR', 'HK', 'HR', 'HU', 'ID', 'IL', 'IN', 'IT', 'JO', 'JP', 'KG', 'KR',
  'KZ', 'LK', 'MA', 'ME', 'MT', 'MU', 'MV', 'MX', 'MY', 'NO', 'OM', 'PH', 'PT', 'QA', 'RS',
  'RU', 'SA', 'SC', 'SG', 'TH', 'TJ', 'TN', 'TR', 'TZ', 'UZ', 'VE', 'VN',
];

// sha256 (первые 16 знаков) WebP внутри totus_WEB public/countries/<ISO2>.svg — картинки байт в байт как на сайте
const WEB_SHA256 = {
  AB: 'a2f6904d522b5cad',
  AE: 'aa11b04d60601098',
  AL: 'e10e9ce951893f53',
  AM: '864cf4cbfc8c3824',
  AZ: '29139a3d6d44243c',
  BG: '882343d4db672708',
  BH: '617470f52bdf39e3',
  BY: '40b7c819d08b529f',
  CN: 'f1d1111dc7bc0a2e',
  CU: 'f5716376825e9ab9',
  CY: 'd17ed55fbc0e7781',
  CZ: '2a205e578cf07f3a',
  DO: '78ca60b43e00d51a',
  EG: '61dc0ad0d76d4563',
  ES: '796641e2ab1f7a86',
  FI: 'e2353630084be737',
  FR: 'd9fee055d390080a',
  GE: '2522a556ece3d77b',
  GR: '4b0afc5e795817f9',
  HK: '91c42a75432e1f3c',
  HR: 'c7445f253f3977e7',
  HU: '7a1aab927ade3a85',
  ID: 'c2d124d78fe1eda1',
  IL: '22807c6908c450ce',
  IN: 'e2e5e5e62cd67268',
  IT: '16fb02622e81b1cd',
  JO: '25a7411a3c890d42',
  JP: '5c0d52bd7f840967',
  KG: '2a05c79380cb24f4',
  KR: '34584c2477d176e8',
  KZ: '0670ee5af6742c76',
  LK: 'd690388695392f28',
  MA: '98b1d9029a145b7b',
  ME: 'e26fab9c82854eff',
  MT: '90a9ff2126aa4526',
  MU: 'b7a75d3912dc7ae3',
  MV: 'b56443b63e957e75',
  MX: '763388d6139d8c87',
  MY: 'a92d11b9a8cb6952',
  NO: '15c65c1b6453443e',
  OM: 'a13d97af027bc8d0',
  PH: 'ef2c7ca09966d0ea',
  PT: 'b103449fdca898a5',
  QA: '9cb468c403c8d445',
  RS: 'fd2d6605a70984f8',
  RU: '11862239b7e9580f',
  SA: 'bf0b34e998702ea4',
  SC: 'e93b65dd7903777c',
  SG: '23b5c12bc4952c12',
  TH: 'fe3f76cd36288d2a',
  TJ: 'fb0c4fc203518b23',
  TN: 'b7fe7362d0ea2d28',
  TR: '66043df046b532e1',
  TZ: '3f9388efffd64f2c',
  UZ: 'c6203827d5e798a8',
  VE: 'd594cd46c43d9c1d',
  VN: '65d2d97cb0a9e2a8',
};

function webpSize(buf) {
  // RIFF....WEBPVP8 (lossy): width/height are 14-bit little-endian at 26/28
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (kind === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
  }
  throw new Error(`unknown WebP chunk ${kind}`);
}

out('Country images (same as the website)');
check('57 images, the same ISO2 set as the website', () => {
  assert.deepEqual(Object.keys(data.COUNTRY_IMAGE_DATA).sort(), [...WEB_ISO2].sort());
});
check('each image is the website WebP byte for byte (80×80, sha256), total < 150 KB', () => {
  let total = 0;
  for (const [code, uri] of Object.entries(data.COUNTRY_IMAGE_DATA)) {
    const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(uri);
    assert.ok(m, `${code}: not a WebP data: address`);
    const buf = Buffer.from(m[1], 'base64');
    assert.deepEqual(webpSize(buf), [80, 80], `${code}: not 80×80`);
    assert.equal(buf.readUInt32LE(4) + 8, buf.length, `${code}: WebP cut or padded`);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), WEB_SHA256[code], `${code}: not the website image`);
    assert.ok(buf.length < 4096, `${code}: ${buf.length} bytes`);
    total += buf.length;
  }
  assert.ok(total < 150 * 1024, `total ${total} bytes`);
});
check('countryImageSrc: by ISO2 (any case); unknown → "" (letter); letter is the first one, uppercase', () => {
  assert.equal(lib.countryImageSrc('tr'), data.COUNTRY_IMAGE_DATA.TR);
  assert.equal(lib.countryImageSrc(' EG '), data.COUNTRY_IMAGE_DATA.EG);
  assert.equal(lib.countryImageSrc('ZZ'), '');
  assert.equal(lib.countryImageSrc(undefined), '');
  assert.equal(lib.countryLetter('абхазия'), 'А');
  assert.equal(lib.countryLetter(''), '?');
});

out('\nList on open (before typing)');
check('built-in list: 57 countries, all with images; 13 popular, Турция first; others alphabetical', () => {
  const list = lib.DEFAULT_BROWSE_COUNTRIES;
  assert.equal(list.length, 57);
  for (const c of list) assert.ok(lib.countryImageSrc(c.iso2), `${c.iso2} without image`);
  const {popular, other} = lib.splitBrowseCountries(list);
  assert.equal(popular.length, 13);
  assert.deepEqual(popular.slice(0, 5).map(c => c.name), ['Турция', 'Египет', 'Вьетнам', 'Россия', 'ОАЭ']);
  assert.deepEqual(popular.slice(5, 7).map(c => c.name), ['Мальдивы', 'Таиланд'], 'same priority → alphabetical');
  assert.equal(other[0].name, 'Абхазия');
  assert.equal(other[other.length - 1].name, 'Япония');
  assert.ok(list.every(c => c.iso2 && c.name && c.name_ru === c.name), 'iso2/name/name_ru for the search form');
});
check('/references/destinations answer → list (name_ru, iso2 upper, priority); bad answer → null', () => {
  const body = {success: true, countries: [
    {id: 29386, name_ru: 'Абхазия', name_en: 'Abhasia', iso2: 'ab', priority: 1, cities: []},
    {id: 1, name_ru: 'Турция', name_en: 'Turkey', iso2: 'TR', priority: '10'},
    {id: 2, name_ru: '', iso2: 'XX'},
  ]};
  assert.deepEqual(lib.toBrowseCountries(body), [
    {id: 29386, iso2: 'AB', name: 'Абхазия', name_ru: 'Абхазия', name_en: 'Abhasia', priority: 1},
    {id: 1, iso2: 'TR', name: 'Турция', name_ru: 'Турция', name_en: 'Turkey', priority: 10},
  ]);
  assert.equal(lib.toBrowseCountries({countries: []}), null);
  assert.equal(lib.toBrowseCountries(null), null);
});
check('loader: GET /references/destinations?from_city=, one request per city, retry after an error', () => {
  const src = code(read(`${DIR}/utils/browseCountries.ts`));
  assert.match(src, /import \{ instance \} from '\.\.\/\.\.\/\.\.\/\.\.\/modules\/axios';/);
  assert.match(src, /\.get\(`\/references\/destinations\?from_city=\$\{encodeURIComponent\(key\)\}`\)/);
  assert.match(src, /if \(!list\) cache\.delete\(key\);/);
});

out('\nDestinationSelectionModal');
const modal = code(read(`${DIR}/modals/DestinationSelectionModal.tsx`));
check('on open: built-in list at once, then /references/destinations; no empty autocomplete request', () => {
  assert.match(modal, /useState<BrowseCountry\[\]>\(DEFAULT_BROWSE_COUNTRIES\)/);
  assert.match(modal, /loadBrowseCountries\(fromCity\)\.then\(list => \{\s*if \(!cancelled && list\) setBrowseCountries\(list\);/);
  assert.match(modal, /if \(!visible \|\| !searchQuery\.trim\(\)\) return;/);
  assert.ok(!/searchQuery\.trim\(\) \? 500 : 0/.test(modal), 'old empty-query request');
});
check('sections like the website: «Популярные страны» + «Другие страны» before typing, «Страны» while typing', () => {
  assert.match(modal, /if \(!isTypingSearch\) \{[\s\S]*?splitBrowseCountries\(browseCountries\)[\s\S]*?'Популярные страны'[\s\S]*?'Другие страны'/);
  assert.match(modal, /\{ key: 'countries', type: 'countries', title: 'Страны', items: countries \}/);
  assert.match(modal, /\}, \[data, isTypingSearch, browseCountries\]\);/);
});
check('country rows: own image by ISO2 or the first letter; Level.Travel country image not used', () => {
  assert.match(modal, /if \(type === 'countries'\) \{\s*const src = countryImageSrc\(result\.iso2\);/);
  assert.match(modal, /countryLetter\(result\.name \|\| \(result as any\)\.name_ru \|\| result\.name_en\)/);
  assert.match(modal, /\{renderAvatar\(result, type\)\}/);
  assert.ok(!/\{result\?\.image && \(/.test(modal), 'old direct result.image');
});
check('row metrics as on the website: circle 40, gap 12, row from 48, title 14 orange, subtitle 12', () => {
  assert.match(modal, /itemImage: \{\s*width: 40,\s*height: 40,\s*borderRadius: 20,\s*marginRight: 12,/);
  assert.match(modal, /itemContainer: \{\s*paddingVertical: 8,\s*minHeight: 48,/);
  assert.match(modal, /styles\.sectionTitle, \{ color: theme\.brand \}/);
  assert.match(modal, /itemSubtext: \{\s*fontSize: 12,/);
  assert.match(modal, /itemLetterText: \{\s*fontSize: 16,[\s\S]*?fontWeight: '600',/);
});
check('selection unchanged: onSelect(item, type) → Search sets to_country from iso2', () => {
  assert.match(modal, /onPress=\{\(\) => handleSelect\(result, type\)\}/);
  const search = code(read(`${DIR}/Search.tsx`));
  assert.match(search, /iso2/);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
