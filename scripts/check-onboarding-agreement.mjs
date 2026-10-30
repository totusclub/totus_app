// Check: экран соглашения в онбординге показывает «Пользовательское соглашение» из CMS, а не зашитый текст.
//
// Run: node scripts/check-onboarding-agreement.mjs   (Node >= 18, no npm install)
//
// Было: src/component/onboarding/constants.ts — agreementText (старый текст «Общество с ограниченной
// ответственностью (далее - Сервис)…»), AgreementStep выводил его в ScrollView.
// Стало: AgreementStep загружает документ terms (GET {SERVER_BASE_URL}/api/pages/slug/terms — тот же,
// что totus.club/terms и «Аккаунт → Документы»), HTML в WebView без JavaScript; загрузка — индикатор,
// ошибка — текст и «Повторить»; ссылки документа — в браузере; локальной копии текста нет.

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

const step = code(read('src/component/onboarding/AgreementStep.tsx'));
const constants = code(read('src/component/onboarding/constants.ts'));

console.log('Онбординг: пользовательское соглашение из CMS');

check('зашитого текста соглашения нет', () => {
  assert.ok(!/agreementText/.test(constants), 'agreementText в constants.ts');
  assert.ok(!/agreementText/.test(step), 'agreementText в AgreementStep.tsx');
  assert.ok(!/далее - Сервис/.test(read('src/component/onboarding/constants.ts')), 'старый текст');
});

check('документ terms загружается из CMS тем же модулем, что «Документы»', () => {
  assert.match(step, /const AGREEMENT_SLUG: LegalDocSlug = 'terms';/);
  assert.match(step, /import \{ fetchLegalPage, getCachedLegalPage, type LegalPage \} from '\.\.\/\.\.\/screens\/legal\/legalApi';/);
  assert.match(step, /fetchLegalPage\(AGREEMENT_SLUG\)/);
  assert.match(read('src/screens/legal/legalApi.ts'), /\/api\/pages\/slug\/\$\{encodeURIComponent\(slug\)\}/);
});

check('HTML в WebView без JavaScript, цвета темы, фон экрана онбординга', () => {
  assert.match(step, /from 'react-native-webview'/);
  assert.match(step, /bodyHtml: state\.page\.content/);
  assert.match(step, /legalHtmlColors\(\{ \.\.\.theme, backgroundSecondary: contentBgColor \}\)/);
  assert.match(step, /javaScriptEnabled=\{false\}/);
  assert.match(step, /source=\{\{ html, baseUrl: LEGAL_HTML_BASE_URL \}\}/);
});

check('загрузка — индикатор, ошибка — текст и «Повторить»', () => {
  assert.match(step, /<ActivityIndicator size="large"/);
  assert.match(step, /state\.status === 'error' \?/);
  assert.match(step, /<AppButton title="Повторить" onPress=\{load\}/);
});

check('ссылки документа: документы и сайт — в браузере, якоря — на месте', () => {
  assert.match(step, /onShouldStartLoadWithRequest=\{request => handleLink\(request\.url\)\}/);
  assert.match(step, /case 'internal':\s*Linking\.openURL\(`\$\{SITE_URL\}\/\$\{action\.slug\}`\)/);
  assert.match(step, /case 'external':\s*Linking\.openURL\(action\.url\)/);
  assert.match(step, /case 'stay':\s*return true;/);
});

check('тексты для Maestro (subflows/onboarding.yaml) на месте, «Я согласен» как раньше', () => {
  assert.ok(step.includes('Пользовательское соглашение приложения'));
  assert.ok(step.includes('Я согласен'));
  assert.match(step, /onPress=\{onAgree\}/);
  assert.match(read('.maestro/subflows/onboarding.yaml'), /Я согласен/);
});

check('Text / TextInput из react-native не импортируются (шрифты приложения)', () => {
  const m = read('src/component/onboarding/AgreementStep.tsx').match(/import\s*\{([^}]*)\}\s*from\s*'react-native';/);
  const names = m[1].split(',').map(x => x.trim());
  assert.ok(!names.includes('Text') && !names.includes('TextInput'), names.join(', '));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
