// Check: экран «Документы» — 7 юридических документов ООО «ТОТУСКЛАБ» из CMS.
//
// Run: node scripts/check-legal-docs.mjs   (Node >= 22.18, no npm install)
//
// Было: в приложении один документ — зашитая в код старая политика (src/content/privacyPolicy.ts).
// Ожидается:
//   (a) список из 7 документов (slug, название) — src/content/legalDocs.ts;
//   (b) ссылки внутри документа: /terms, https://totus.club/consent -> документ в приложении,
//       прочие http(s)/mailto/tel -> внешний браузер, #якорь -> остаться, javascript: -> ничего;
//   (c) HTML-обёртка для WebView: контент CMS не портится, тёмная тема -> тёмный фон,
//       офлайн-копия политики собирается из PRIVACY_POLICY_SECTIONS;
//   (d) загрузка GET {SERVER_BASE_URL}/api/pages/slug/:slug: 404 / сеть / кэш сессии;
//   (e) по исходникам: «Аккаунт» ведёт на «Документы», маршруты зарегистрированы.
//   (f) в текстах документов нет сокращений и прежнего оператора (требование владельца 05.10.2026).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
let skipped = 0;
class Skip extends Error {}
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    if (e instanceof Skip) {
      skipped++;
      console.log(`  SKIP ${name} (${e.message})`);
      return;
    }
    failed++;
    console.log(`  FAIL ${name}\n       ${e && e.message ? e.message.split('\n')[0] : e}`);
  }
}
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const tsReady = !!(process.features && process.features.typescript && typeof module.registerHooks === 'function');
if (tsReady) {
  module.registerHooks({
    resolve(spec, ctx, next) {
      // RN-style extensionless relative imports (../../content/legalDocs) -> .ts
      if (spec.startsWith('.') && !path.extname(spec) && ctx.parentURL && ctx.parentURL.startsWith('file:')) {
        const base = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
        if (fs.existsSync(base + '.ts')) {
          return {url: pathToFileURL(base + '.ts').href, shortCircuit: true};
        }
      }
      return next(spec, ctx);
    },
  });
}
const load = async rel => {
  if (!tsReady) throw new Skip('need Node >= 22.18');
  if (!exists(rel)) throw new Error(`${rel} not found`);
  return import(pathToFileURL(path.join(root, rel)).href);
};

const EXPECTED = [
  ['terms', 'Пользовательское соглашение'],
  ['privacy-policy', 'Политика обработки персональных данных'],
  ['consent', 'Согласие на обработку персональных данных'],
  ['ads-consent', 'Согласие на получение рекламы'],
  ['cookie-settings', 'Политика использования файлов cookie'],
  ['recommendations', 'Правила применения рекомендательных технологий'],
  ['requisites', 'Реквизиты и контакты'],
];

// ---------------------------------------------------------------- (a) list
console.log('legalDocs.ts');
await check('7 documents: slugs and titles as on the site, in order', async () => {
  const m = await load('src/content/legalDocs.ts');
  assert.deepEqual(m.LEGAL_DOCS.map(d => [d.slug, d.title]), EXPECTED);
  for (const d of m.LEGAL_DOCS) {
    assert.ok(typeof d.short === 'string' && d.short.trim().length > 0, `short for ${d.slug}`);
  }
  assert.equal(new Set(m.LEGAL_DOCS.map(d => d.slug)).size, 7, 'unique slugs');
});
await check('isLegalDocSlug / findLegalDoc', async () => {
  const m = await load('src/content/legalDocs.ts');
  assert.equal(m.isLegalDocSlug('consent'), true);
  assert.equal(m.isLegalDocSlug('about'), false);
  assert.equal(m.isLegalDocSlug(undefined), false);
  assert.equal(m.findLegalDoc('requisites').title, 'Реквизиты и контакты');
  assert.equal(m.findLegalDoc('nope'), undefined);
});

// ---------------------------------------------------------------- (b) links
console.log('legalLinks.ts');
await check('links to the 7 documents open inside the app', async () => {
  const {resolveLegalLink: r, LEGAL_HTML_BASE_URL: base} = await load('src/screens/legal/legalLinks.ts');
  const internal = slug => ({kind: 'internal', slug});
  assert.deepEqual(r('/terms'), internal('terms'));
  assert.deepEqual(r('https://totus.club/consent'), internal('consent'));
  assert.deepEqual(r('http://totus.club/consent'), internal('consent'));
  assert.deepEqual(r('https://www.totus.club/privacy-policy/'), internal('privacy-policy'));
  assert.deepEqual(r('HTTPS://TOTUS.CLUB/Ads-Consent?utm=1#p2'), internal('ads-consent'));
  assert.deepEqual(r('https://totus.club/cookie-settings'), internal('cookie-settings'));
  // относительная ссылка "recommendations", разрешённая WebView от baseUrl
  assert.deepEqual(r(base + 'recommendations'), internal('recommendations'));
  assert.deepEqual(r('requisites'), internal('requisites'));
});
await check('anchors and the document itself stay in the WebView', async () => {
  const {resolveLegalLink: r, LEGAL_HTML_BASE_URL: base} = await load('src/screens/legal/legalLinks.ts');
  assert.deepEqual(r('#section-2'), {kind: 'stay'});
  assert.deepEqual(r(base), {kind: 'stay'}, 'first load of the HTML (iOS asks for baseUrl)');
  assert.deepEqual(r(base + '#section-2'), {kind: 'stay'});
  assert.deepEqual(r('about:blank'), {kind: 'stay'});
  assert.deepEqual(r(''), {kind: 'stay'});
});
await check('other links -> external browser / app; javascript: -> nothing', async () => {
  const {resolveLegalLink: r} = await load('src/screens/legal/legalLinks.ts');
  assert.deepEqual(r('https://example.com/terms'), {kind: 'external', url: 'https://example.com/terms'});
  assert.deepEqual(r('https://totus.club/hotels/123'), {kind: 'external', url: 'https://totus.club/hotels/123'});
  assert.deepEqual(r('https://totus.club.evil.com/terms').kind, 'external');
  assert.deepEqual(r('https://evil.com@totus.club/terms').kind, 'internal'); // хост — totus.club
  assert.deepEqual(r('mailto:privacy@totus.club'), {kind: 'external', url: 'mailto:privacy@totus.club'});
  assert.deepEqual(r('tel:+74950000000'), {kind: 'external', url: 'tel:+74950000000'});
  assert.deepEqual(r('/hotels'), {kind: 'external', url: 'https://totus.club/hotels'});
  assert.deepEqual(r('javascript:alert(1)'), {kind: 'block'});
  assert.deepEqual(r('data:text/html,<b>x</b>'), {kind: 'block'});
  assert.deepEqual(r('file:///etc/hosts'), {kind: 'block'});
});

// ---------------------------------------------------------------- (c) html
console.log('legalHtml.ts');
const CMS = '<h2>1. Общие положения</h2><p>ООО «ТОТУСКЛАБ» &amp; партнёры: 5 &lt; 7, "кавычки" и \'апостроф\'.</p>' +
  '<p><a href="/terms">Соглашение</a> и <a href="https://totus.club/consent" target="_blank">согласие</a></p>' +
  '<table><tr><th>ИНН</th><td>7700000000</td></tr></table>';
await check('CMS HTML is inserted unchanged (no double escaping), tables scroll horizontally', async () => {
  const h = await load('src/screens/legal/legalHtml.ts');
  const light = (await load('src/theme/light.ts')).lightTheme;
  const html = h.buildLegalHtml({bodyHtml: CMS, colors: h.legalHtmlColors(light), isDark: false});
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<meta charset="utf-8">'));
  assert.ok(html.includes('ООО «ТОТУСКЛАБ» &amp; партнёры: 5 &lt; 7, "кавычки" и \'апостроф\'.'), 'text kept as is');
  assert.ok(html.includes('<a href="/terms">Соглашение</a>'), 'links kept');
  assert.ok(!html.includes('&amp;amp;') && !html.includes('&amp;lt;'), 'no double escaping');
  assert.ok(html.includes('<div class="table-wrap"><table>') && html.includes('</table></div>'), 'table wrapped');
  assert.ok(/\.table-wrap\s*\{[^}]*overflow-x:\s*auto/.test(html), 'horizontal scroll');
  assert.ok(/\.doc\s*\{\s*padding:\s*16px 16px/.test(html), 'padding 16');
  assert.ok(/font-family:\s*-apple-system/.test(html), 'system font');
});
await check('dark theme -> dark background and light text; light theme -> light background', async () => {
  const h = await load('src/screens/legal/legalHtml.ts');
  const {darkTheme} = await load('src/theme/dark.ts');
  const {lightTheme} = await load('src/theme/light.ts');
  const bgOf = html => (/html, body \{[^}]*background:\s*(#[0-9a-fA-F]{6})/.exec(html) || [])[1];
  const lum = hex => {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  const dark = h.buildLegalHtml({bodyHtml: CMS, colors: h.legalHtmlColors(darkTheme), isDark: true});
  const light = h.buildLegalHtml({bodyHtml: CMS, colors: h.legalHtmlColors(lightTheme), isDark: false});
  assert.equal(bgOf(dark), darkTheme.backgroundSecondary);
  assert.ok(lum(bgOf(dark)) < 0.2, `dark bg ${bgOf(dark)}`);
  assert.ok(dark.includes('color-scheme: dark'));
  assert.ok(dark.includes(`color: ${darkTheme.textSecondary}`), 'light text on dark');
  assert.equal(bgOf(light), lightTheme.backgroundSecondary);
  assert.ok(lum(bgOf(light)) > 0.8, `light bg ${bgOf(light)}`);
  assert.ok(dark.includes(`a { color: ${darkTheme.brand}`), 'links in brand color');
});
await check('scripts, iframes, on*= handlers and javascript: links are removed; text with "on" untouched', async () => {
  const h = await load('src/screens/legal/legalHtml.ts');
  const {lightTheme} = await load('src/theme/light.ts');
  const evil = '<p onclick="steal()">Текст: dragon = 1, one=2</p><script>alert(1)</script>' +
    '<iframe src="https://evil.com"></iframe><a href="javascript:alert(2)">x</a><img src=x onerror=alert(3)>';
  const html = h.buildLegalHtml({bodyHtml: evil, colors: h.legalHtmlColors(lightTheme), isDark: false});
  assert.ok(!/<script/i.test(html) && !/<iframe/i.test(html), 'script/iframe');
  assert.ok(!/onclick|onerror/i.test(html), 'handlers');
  assert.ok(!/javascript:/i.test(html), 'javascript:');
  assert.ok(html.includes('<p>Текст: dragon = 1, one=2</p>'), 'text kept');
  assert.ok(/Content-Security-Policy" content="default-src 'none'/.test(html), 'CSP');
});
await check('notice is escaped; offline privacy policy is built from PRIVACY_POLICY_SECTIONS', async () => {
  const h = await load('src/screens/legal/legalHtml.ts');
  const {lightTheme} = await load('src/theme/light.ts');
  const {PRIVACY_POLICY_SECTIONS: S} = await load('src/content/privacyPolicy.ts');
  const body = h.privacySectionsToHtml(S, 'Политика');
  for (const s of S) {
    assert.ok(body.includes(`<h2>${h.escapeHtml(s.title)}</h2>`), s.title);
    for (const sub of s.subsections ?? []) assert.ok(body.includes(`<h3>${h.escapeHtml(sub.title)}</h3>`));
  }
  assert.ok(body.includes('privacy@totus.club'));
  const fake = h.privacySectionsToHtml([{title: 'A <b> & "c"', blocks: [{type: 'list', items: ['x < y']}]}]);
  assert.ok(fake.includes('<h2>A &lt;b&gt; &amp; &quot;c&quot;</h2>') && fake.includes('<li>x &lt; y</li>'));
  const html = h.buildLegalHtml({bodyHtml: body, colors: h.legalHtmlColors(lightTheme), isDark: false, notice: 'Офлайн <b>'});
  assert.ok(html.includes('<p class="app-notice">Офлайн &lt;b&gt;</p>'));
});

// ---------------------------------------------------------------- (d) api
console.log('legalApi.ts');
await check('GET {SERVER_BASE_URL}/api/pages/slug/:slug, name/content parsed, session cache', async () => {
  const api = await load('src/screens/legal/legalApi.ts');
  const {SERVER_BASE_URL} = await load('src/config/server.ts');
  api.clearLegalPageCache();
  const calls = [];
  const ok = async url => {
    calls.push(url);
    return {ok: true, status: 200, json: async () => ({name: 'Пользовательское соглашение', slug: 'terms', content: '<p>x</p>', updated_at: '2026-10-01'})};
  };
  const p = await api.fetchLegalPage('terms', {fetchImpl: ok});
  assert.deepEqual(calls, [`${SERVER_BASE_URL}/api/pages/slug/terms`]);
  assert.equal(p.name, 'Пользовательское соглашение');
  assert.equal(p.content, '<p>x</p>');
  await api.fetchLegalPage('terms', {fetchImpl: ok});
  assert.equal(calls.length, 1, 'second open comes from cache');
  assert.equal(api.getCachedLegalPage('terms').content, '<p>x</p>');
});
await check('404 -> not_found, network error -> network, empty content -> invalid; errors not cached', async () => {
  const api = await load('src/screens/legal/legalApi.ts');
  api.clearLegalPageCache();
  const kind = async (impl, slug = 'consent') => {
    try {
      await api.fetchLegalPage(slug, {fetchImpl: impl});
      return 'ok';
    } catch (e) {
      return e.kind;
    }
  };
  assert.equal(await kind(async () => ({ok: false, status: 404, json: async () => ({})})), 'not_found');
  assert.equal(await kind(async () => { throw new TypeError('Network request failed'); }), 'network');
  assert.equal(await kind(async () => ({ok: false, status: 500, json: async () => ({})})), 'server');
  assert.equal(await kind(async () => ({ok: true, status: 200, json: async () => ({name: 'x', content: ''})})), 'invalid');
  assert.equal(api.getCachedLegalPage('consent'), undefined);
  assert.equal(await kind(async () => ({ok: true, status: 200, json: async () => ({name: '', content: '<p>ok</p>'})})), 'ok');
});

// ---------------------------------------------------------------- (e) sources
console.log('source');
await check('Account: the row opens «Документы» (not the old hard-coded policy)', () => {
  const s = read('src/component/account/Account.tsx');
  assert.ok(/navigation\.navigate\(LEGAL_DOCUMENTS_ROUTE\)/.test(s), 'navigate(LEGAL_DOCUMENTS_ROUTE)');
  assert.ok(/>\s*Документы\s*</.test(s), 'row title «Документы»');
  assert.ok(!/navigate\(\s*['"]privacyPolicy['"]/.test(s), 'no direct navigate(privacyPolicy)');
});
await check('routes registered in the Account stack (privacyPolicy kept -> document privacy-policy)', async () => {
  const r = await load('src/screens/legal/legalRoutes.ts');
  assert.equal(r.LEGAL_DOCUMENTS_ROUTE, 'legalDocuments');
  assert.equal(r.LEGAL_DOCUMENT_ROUTE, 'legalDocument');
  assert.equal(r.PRIVACY_POLICY_ROUTE, 'privacyPolicy');
  const nav = read('src/navigation/authStack.tsx');
  const stack = nav.slice(nav.indexOf('const AccountStackScreen'), nav.indexOf('const TabBar'));
  assert.ok(/name=\{LEGAL_DOCUMENTS_ROUTE\} component=\{LegalDocumentsScreen\}/.test(stack), 'legalDocuments');
  assert.ok(/name=\{LEGAL_DOCUMENT_ROUTE\} component=\{LegalDocumentScreen\}/.test(stack), 'legalDocument');
  assert.ok(/name=\{PRIVACY_POLICY_ROUTE\}\s*component=\{LegalDocumentScreen\}\s*initialParams=\{\{ slug: 'privacy-policy' \}\}/.test(stack), 'privacyPolicy');
  const idx = read('src/screens/index.ts');
  assert.ok(/LegalDocumentsScreen\} from '\.\/legal\/LegalDocumentsScreen'/.test(idx));
  assert.ok(/LegalDocumentScreen\} from '\.\/legal\/LegalDocumentScreen'/.test(idx));
});
await check('document screen: CMS + WebView + link routing + retry + offline fallback', () => {
  const s = read('src/screens/legal/LegalDocumentScreen.tsx');
  for (const needle of [
    "from 'react-native-webview'", 'fetchLegalPage(slug)', 'onShouldStartLoadWithRequest', 'resolveLegalLink(url)',
    'Linking.openURL(action.url)', 'navigation.push(LEGAL_DOCUMENT_ROUTE', 'javaScriptEnabled={false}',
    'baseUrl: LEGAL_HTML_BASE_URL', 'title="Повторить"', 'PRIVACY_POLICY_SECTIONS', "status: 'fallback'",
    'state.page.name',
  ]) {
    assert.ok(s.includes(needle), needle);
  }
  const header = read('src/screens/legal/LegalHeader.tsx');
  assert.ok(header.includes('name="simpleArrow"') && header.includes('StyleSheet.hairlineWidth'), 'same header');
});

// ---------------------------------------------------------------- (f) wording
// Требование владельца (05.10.2026): в пользовательских текстах нет сокращения
// персональных данных (писать полностью), нет прежнего оператора и заглушек
// вместо документов. Список слов — FORBIDDEN_WORDS.
// Слова собраны из частей, чтобы этот файл не находил сам себя.
console.log('wording');
const FORBIDDEN_WORDS = [
  ['П' + 'Дн', new RegExp('П' + 'Дн', 'u'), 'писать «персональных данных»'],
  ['Арле' + 'кино', new RegExp('арле' + 'кино', 'iu'), 'прежний оператор'],
  ['Arle' + 'kino', new RegExp('arle' + 'kino', 'iu'), 'прежний оператор'],
  ['Ско' + 'ро', new RegExp('ско' + 'ро', 'iu'), 'заглушка вместо документа'],
];
const WORDING_FILES = [
  'src/content/legalDocs.ts',
  // Офлайн-копия политики (показывается, когда CMS недоступна).
  'src/content/privacyPolicy.ts',
  'src/component/account/Account.tsx',
  'scripts/check-legal-docs.mjs',
  ...fs
    .readdirSync(path.join(root, 'src/screens/legal'))
    .filter(name => /\.(ts|tsx)$/.test(name))
    .sort()
    .map(name => `src/screens/legal/${name}`),
];
await check('no abbreviations, former operator or «coming soon» in legal screens, list, offline policy and Account', () => {
  const hits = [];
  for (const rel of WORDING_FILES) {
    read(rel).split('\n').forEach((line, i) => {
      for (const [word, re, why] of FORBIDDEN_WORDS) {
        if (re.test(line)) {
          hits.push(`${rel}:${i + 1} «${word}» (${why})`);
        }
      }
    });
  }
  assert.ok(WORDING_FILES.length >= 11, `files scanned: ${WORDING_FILES.length}`);
  assert.deepEqual(hits, [], hits.join('; '));
});
await check('exactly 7 documents with full titles and captions (no abbreviations)', async () => {
  const m = await load('src/content/legalDocs.ts');
  assert.equal(m.LEGAL_DOCS.length, 7);
  for (const d of m.LEGAL_DOCS) {
    for (const [word, re] of FORBIDDEN_WORDS) {
      assert.ok(!re.test(d.title) && !re.test(d.short), `${d.slug}: «${word}»`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`);
process.exit(failed ? 1 : 0);
