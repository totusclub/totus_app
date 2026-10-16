// Builds SUMMARY.md for one Maestro run of scripts/maestro-checkup.sh.
// Usage: node scripts/maestro-summary.mjs <run dir> [tags]   (Node >= 18, no npm install)
// Reads runs.tsv (slug, platform, name, exit code, seconds) and <slug>.xml (JUnit from Maestro).

import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const tags = process.argv[3] || 'daily';
if (!dir || !fs.existsSync(path.join(dir, 'runs.tsv'))) {
  console.log('❌ Нет результатов прогона (runs.tsv не найден).');
  process.exit(0);
}

const decode = s =>
  String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#10;/g, ' ')
    .replace(/&amp;/g, '&');
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decode(m[1]) : '';
};
const oneLine = s => decode(s).replace(/\s+/g, ' ').trim().slice(0, 220);

const runs = fs
  .readFileSync(path.join(dir, 'runs.tsv'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(l => {
    const [slug, platform, name, code, secs] = l.split('\t');
    return {slug, platform, name, code: Number(code), secs: Number(secs)};
  });

const rows = [];
let failedTotal = 0;
for (const run of runs) {
  const xmlPath = path.join(dir, `${run.slug}.xml`);
  if (!fs.existsSync(xmlPath)) {
    const log = fs.existsSync(path.join(dir, `${run.slug}.log`))
      ? fs.readFileSync(path.join(dir, `${run.slug}.log`), 'utf8').trim().split('\n').slice(-3).join(' ')
      : '';
    rows.push([run.name, '—', '❌', `${run.secs} с`, `Maestro не запустился: ${oneLine(log)}`]);
    failedTotal++;
    continue;
  }
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const cases = [...xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)];
  if (!cases.length) {
    rows.push([run.name, '—', run.code ? '❌' : '⚠️', `${run.secs} с`, 'нет сценариев в отчёте']);
    if (run.code) failedTotal++;
  }
  for (const c of cases) {
    const head = `<x ${c[1]}>`;
    const body = c[3] || '';
    const failure = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>|<(failure|error)\b([^>]*)\/>/);
    const ok = !failure && !/status="(ERROR|FAILED)"/.test(head);
    if (!ok) failedTotal++;
    const reason = failure
      ? oneLine(attr(`<x ${failure[2] || failure[5] || ''}>`, 'message') || failure[3] || '')
      : '';
    const time = attr(head, 'time');
    rows.push([
      run.name,
      attr(head, 'name') || attr(head, 'id'),
      ok ? '✅' : '❌',
      time ? `${Math.round(Number(time))} с` : '',
      reason,
    ]);
  }
}

const date = path.basename(dir).replace('_', ' ').replace(/-(\d\d)$/, ':$1');
const lines = [];
lines.push(failedTotal ? `ЕСТЬ ПРОБЛЕМЫ: упало сценариев — ${failedTotal}` : 'ВСЁ РАБОТАЕТ');
lines.push('');
lines.push(`Maestro, ${date}, теги: ${tags}, устройств: ${runs.length}`);
lines.push('');
lines.push('| Устройство | Сценарий | Статус | Время | Причина |');
lines.push('|---|---|---|---|---|');
for (const r of rows) {
  lines.push(`| ${r.map(x => String(x).replace(/\|/g, '/')).join(' | ')} |`);
}
lines.push('');
lines.push('Скриншоты и логи — в папках устройств рядом с этим файлом.');
console.log(lines.join('\n'));
