// Шрифты приложения: Museo Sans Cyrl — весь текст, Forum — заголовки и названия отелей (как на сайте, totus_WEB #69).
// Запуск: node scripts/check-app-fonts.mjs (без npm install).
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

const FONT_DIRS = ['assets/fonts', 'ios/fonts', 'android/app/src/main/assets/fonts'];
const FONTS = ['MuseoSansCyrl-300', 'MuseoSansCyrl-500', 'MuseoSansCyrl-700', 'MuseoSansCyrl-900', 'Forum'];

// --- разбор TTF: таблицы name (PostScript-имя) и cmap (какие символы есть) ---
function tables(buf) {
  const n = buf.readUInt16BE(4);
  const t = {};
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    t[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) };
  }
  return t;
}
function postScriptName(buf) {
  const { off } = tables(buf).name;
  const count = buf.readUInt16BE(off + 2);
  const strOff = off + buf.readUInt16BE(off + 4);
  for (let i = 0; i < count; i++) {
    const r = off + 6 + i * 12;
    const [pid, , , nid, len, o] = [0, 2, 4, 6, 8, 10].map((k) => buf.readUInt16BE(r + k));
    if (nid !== 6) continue;
    const s = buf.subarray(strOff + o, strOff + o + len);
    if (pid === 3 || pid === 0) return Buffer.from(s).swap16().toString('utf16le');
    return s.toString('latin1');
  }
  return null;
}
function codepoints(buf) {
  const { off } = tables(buf).cmap;
  const n = buf.readUInt16BE(off + 2);
  const set = new Set();
  for (let i = 0; i < n; i++) {
    const r = off + 4 + i * 8;
    const pid = buf.readUInt16BE(r);
    const eid = buf.readUInt16BE(r + 2);
    const sub = off + buf.readUInt32BE(r + 4);
    if (!(pid === 3 && eid === 1) || buf.readUInt16BE(sub) !== 4) continue;
    const segX2 = buf.readUInt16BE(sub + 6);
    const ends = sub + 14;
    const starts = ends + segX2 + 2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = buf.readUInt16BE(ends + s * 2);
      const start = buf.readUInt16BE(starts + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) set.add(c);
    }
  }
  return set;
}

console.log('Шрифты приложения');

check('файлы Museo (300/500/700/900) и Forum лежат во всех трёх папках и одинаковые', () => {
  for (const f of FONTS) {
    const bufs = FONT_DIRS.map((d) => {
      const p = path.join(root, d, `${f}.ttf`);
      assert.ok(fs.existsSync(p), `нет ${d}/${f}.ttf`);
      return fs.readFileSync(p);
    });
    for (const b of bufs.slice(1)) assert.ok(b.equals(bufs[0]), `${f}.ttf различается в папках`);
  }
});

check('PostScript-имя внутри файла = имя файла (одно fontFamily для iOS и Android)', () => {
  for (const f of FONTS) assert.equal(postScriptName(fs.readFileSync(path.join(root, 'assets/fonts', `${f}.ttf`))), f);
});

check('в шрифтах есть вся кириллица (А–я, Ё, ё) и латиница, цифры, знаки препинания', () => {
  const need = [];
  for (let c = 0x410; c <= 0x44f; c++) need.push(c);
  need.push(0x401, 0x451);
  for (let c = 0x20; c <= 0x7e; c++) need.push(c);
  need.push(0xab, 0xbb, 0x2013, 0x2014, 0x2116, 0xa0);
  for (const f of FONTS) {
    const cps = codepoints(fs.readFileSync(path.join(root, 'assets/fonts', `${f}.ttf`)));
    const miss = need.filter((c) => !cps.has(c)).map((c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0'));
    assert.deepEqual(miss, [], `${f}: нет ${miss.join(', ')}`);
  }
});

check('iOS: шрифты перечислены в Info.plist → UIAppFonts (Golos оставлен)', () => {
  const plist = read('ios/totusClubApp/Info.plist');
  const arr = plist.match(/<key>UIAppFonts<\/key>\s*<array>([\s\S]*?)<\/array>/)[1];
  for (const f of FONTS) assert.match(arr, new RegExp(`<string>${f}\\.ttf</string>`));
  assert.match(arr, /<string>GolosText-Regular\.ttf<\/string>/);
});

check('react-native.config.js подключает assets/fonts, как раньше', () => {
  assert.match(read('react-native.config.js'), /assets:\s*\[\s*['"]\.\/assets\/fonts['"]\s*\]/);
});

const fontsTs = code(read('src/theme/fonts.ts') + read('src/theme/fontNames.ts'));
check('theme/fonts.ts: имена шрифтов = файлы, начертания как на сайте (300/500/700/900)', () => {
  for (const w of [300, 500, 700, 900]) assert.match(fontsTs, new RegExp(`'MuseoSansCyrl-${w}'`));
  assert.match(fontsTs, /export const FONT_HEADING = 'Forum';/);
  assert.match(fontsTs, /if \(w < 400\) return FONT_TEXT\.light;/);
  assert.match(fontsTs, /if \(w < 600\) return FONT_TEXT\.regular;/);
  assert.match(fontsTs, /if \(w < 800\) return FONT_TEXT\.bold;/);
  assert.match(fontsTs, /return FONT_TEXT\.black;/);
  assert.match(fontsTs, /if \(weight === 'bold'\) return 700;/);
  // fontWeight сбрасывается, иначе Android рисует «ложный» жирный поверх файла 700
  assert.equal((fontsTs.match(/fontWeight: 'normal'/g) || []).length, 2);
});

check('AppText и FontText берут шрифт через resolveAppFont и передают начертание и заголовок вложенному тексту', () => {
  const appText = code(read('src/component/UI/text/index.tsx'));
  assert.match(appText, /resolveAppFont\(\[styles\.text, style\], inherited\)/);
  assert.match(appText, /InheritedFontContext\.Provider value=\{resolved\.inherited\}/);
  const fontText = code(read('src/component/UI/text/FontText.tsx'));
  assert.match(fontText, /resolveAppFont\(style, inherited\)/);
  assert.match(fontText, /withAppFont\(style\)/);
});

check('тема (light/dark) и навигация: шрифты Museo, fontWeight не дорисовывает жирный', () => {
  for (const t of ['src/theme/light.ts', 'src/theme/dark.ts']) {
    const s = code(read(t));
    assert.match(s, /regular: FONT_TEXT\.regular/);
    assert.match(s, /bold: FONT_TEXT\.bold/);
  }
  const nav = code(read('src/navigation/index.tsx'));
  assert.equal((nav.match(/fontWeight: '400'/g) || []).length >= 4, true);
});

const walk = (dir) =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(tsx?|jsx?)$/.test(e.name) ? [path.join(dir, e.name)] : [],
  );
const srcFiles = walk('src');

check('нигде не осталось fontFamily «Golos Text»', () => {
  const bad = srcFiles.filter((f) => f !== path.join('src', 'theme', 'fonts.ts') && /fontFamily:\s*['"]Golos/.test(code(read(f))));
  assert.deepEqual(bad, []);
});

check('Text и TextInput из react-native берутся только в обёртках шрифта (кроме тестового VoIP-экрана)', () => {
  const allow = new Set(
    ['src/component/UI/text/FontText.tsx', 'src/component/UI/text/index.tsx', 'src/component/test/VoIPTestScreen.tsx'].map(path.normalize),
  );
  const bad = [];
  for (const f of srcFiles) {
    if (allow.has(path.normalize(f))) continue;
    for (const m of read(f).matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/g)) {
      const names = m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]);
      if (names.includes('Text') || names.includes('TextInput')) bad.push(f);
    }
  }
  assert.deepEqual(bad, []);
});

check('заголовки и названия отелей набраны Forum (FONT_HEADING)', () => {
  const must = {
    'src/component/UI/hotelCard/index.tsx': 'hotelName',
    'src/component/home/planingTrip/RecommendTripCard.tsx': 'title',
    'src/component/orders/OrderListItem.tsx': 'hotelName',
    'src/component/tickets/SelectedTourCard.tsx': 'hotelName',
    'src/component/home/readyTours/ReadyTours.tsx': 'sectionTitle',
    'src/screens/favorites/FavoritesScreen.tsx': 'title',
  };
  for (const [f, key] of Object.entries(must)) {
    const s = code(read(f));
    assert.match(s, new RegExp(`\\b${key}:\\s*\\{[^}]*fontFamily: FONT_HEADING`), `${f} → ${key}`);
  }
  const n = srcFiles.filter((f) => /fontFamily: FONT_HEADING/.test(read(f))).length;
  assert.ok(n >= 40, `файлов с FONT_HEADING: ${n}`);
});

console.log(`\n${passed} ok, ${failed} fail`);
process.exit(failed ? 1 : 0);
