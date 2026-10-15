// Check: the "Куда" picker shows the same country list and country images as the website
// (totus_WEB PR #49): on open, before typing — «Популярные страны» + «Другие страны» from
// Level.Travel /references/destinations (built-in list until it answers), each with its own
// country image by ISO2 or the first letter; while typing — the usual autocomplete.
//
// Run: node scripts/check-destination-countries.mjs   (Node >= 22.18, no npm install)

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
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
check('each image is a WebP 80×80 data: address, total < 150 KB', () => {
  let total = 0;
  for (const [code, uri] of Object.entries(data.COUNTRY_IMAGE_DATA)) {
    const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(uri);
    assert.ok(m, `${code}: not a WebP data: address`);
    const buf = Buffer.from(m[1], 'base64');
    assert.deepEqual(webpSize(buf), [80, 80], `${code}: not 80×80`);
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
