// Check: a hotel added to favorites on the website shows its photo in the app; app favorites keep
// showing on the website (same shape both ways).
//
// Run: node scripts/check-favorites-sync.mjs   (Node >= 22.18, no npm install)
//
// Owner report 06.10.2026: added on the web -> in the app the favorite has no image. The web saves
// images as {webp_x620, x500, ...}; HotelCard passes images[0] straight to <Image source>, which
// draws only {uri} (or a require() number). Now FavoritesScreen converts every record to [{uri}],
// HotelHeader saves only portable {uri} images (no require() numbers of this build).

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
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

if (!process.features || !process.features.typescript) {
  out('SKIP: need Node >= 22.18 (TypeScript type stripping)');
  process.exit(0);
}
const fav = await import(pathToFileURL(path.join(root, 'src/utils/favoriteHotel.ts')).href);

out('Favorites: web <-> app');
check('record added on the website ({webp_x620, x500}) -> [{uri}] (JPEG before WebP)', () => {
  const web = {images: [{webp_x620: 'https://img.cdn.level.travel/webp/a.webp', x500: 'https://img.cdn.level.travel/jpg/a.jpg'}]};
  assert.deepEqual(fav.favoriteImageSources(web), [{uri: 'https://img.cdn.level.travel/jpg/a.jpg'}]);
  const webpOnly = {images: [{webp_x620: 'https://cdn/b.webp'}]};
  assert.deepEqual(fav.favoriteImageSources(webpOnly), [{uri: 'https://cdn/b.webp'}]);
});
check('record added in the app ({uri}) -> unchanged', () => {
  const app = {images: [{uri: 'https://img.cdn.level.travel/x/1.jpg'}, {uri: 'https://img.cdn.level.travel/x/2.jpg'}]};
  assert.deepEqual(fav.favoriteImageSources(app), app.images);
});
check('strings, "//…", relative Level.Travel paths, image field, require() numbers', () => {
  assert.deepEqual(fav.favoriteImageSources({images: ['//img.cdn.level.travel/a.jpg', 'x620/b.jpg', 17, null]}), [
    {uri: 'https://img.cdn.level.travel/a.jpg'},
    {uri: 'https://img.cdn.level.travel/x620/b.jpg'},
  ]);
  assert.deepEqual(fav.favoriteImageSources({images: [], image: 'https://cdn/c.jpg'}), [{uri: 'https://cdn/c.jpg'}]);
  assert.deepEqual(fav.favoriteImageSources({images: [5]}), [], 'no image -> card shows its own placeholder');
  assert.deepEqual(fav.favoriteImageSources(null), []);
});
check('saving: only portable {uri} images, at most 10', () => {
  const many = Array.from({length: 30}, (_, i) => ({uri: `https://cdn/${i}.jpg`}));
  assert.equal(fav.favoriteImagesForSave(many).length, 10);
  assert.deepEqual(fav.favoriteImagesForSave([3, {uri: 'https://cdn/a.jpg'}]), [{uri: 'https://cdn/a.jpg'}]);
});

out('\nScreens');
check('FavoritesScreen converts every record before HotelCard; city/country as the address fallback', () => {
  const src = code(read('src/screens/favorites/FavoritesScreen.tsx'));
  assert.match(src, /images: favoriteImageSources\(hotelData\),/);
  assert.ok(!/images: hotelData\.images \|\| \[\]/.test(src));
  assert.match(src, /const hotelData = favorite\.hotelData \|\| \(\{\} as any\);/);
  assert.match(src, /\[hotelData\.city_name, hotelData\.country_name\]\.filter\(Boolean\)\.join\(', '\)/);
});
check('HotelHeader saves portable images (same shape the website reads)', () => {
  const src = code(read('src/component/UI/header/HotelHeader.tsx'));
  assert.match(src, /\.\.\.hotel,[\s\S]*?images: favoriteImagesForSave\(hotel\.images\),/);
  assert.match(src, /await addFavorite\(userId, hotelIdNum, hotelDataToSave\);/);
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
