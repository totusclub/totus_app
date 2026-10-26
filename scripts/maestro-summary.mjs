// Builds SUMMARY.md for one Maestro run of scripts/maestro-checkup.sh.
// Usage: node scripts/maestro-summary.mjs <run dir> [tags]   (Node >= 18, no npm install)
// Reads runs.tsv (slug, platform, name, exit code, seconds) and <slug>.xml (JUnit from Maestro).
// For a failed flow it also looks for Maestro step records (commands*.json) in <slug>/ and names the
// step that failed — JUnit often says only «Unknown error». Both record layouts are accepted:
// {command, metadata: {status, error}} (older CLI) and {command, status, error} (newer CLI).

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

function filesUnder(dir, re, depth = 0, acc = []) {
  if (depth > 6 || !fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) filesUnder(p, re, depth + 1, acc);
    else if (re.test(e.name)) acc.push(p);
  }
  return acc;
}

// Short human description of a Maestro command object: «tapOn "Выбрать номер"», «assertVisible "…"».
function describeCommand(cmd) {
  if (!cmd || typeof cmd !== 'object') return '';
  const key = Object.keys(cmd).find(k => cmd[k] && typeof cmd[k] === 'object') || Object.keys(cmd)[0] || '';
  const body = cmd[key] && typeof cmd[key] === 'object' ? cmd[key] : {};
  const name = key.replace(/Command$/, '').replace(/^(\w)/, m => m.toLowerCase());
  const label = body.label || '';
  const sel = body.selector || body.condition || body.element || {};
  const text =
    sel.textRegex || sel.text || (sel.visible && (sel.visible.textRegex || sel.visible.text)) ||
    (sel.notVisible && (sel.notVisible.textRegex || sel.notVisible.text)) || body.textRegex || body.text || '';
  const shownLabel = label && !/^«.*»$/.test(label) ? `«${label}»` : label;
  return [name, shownLabel || (text ? `"${text}"` : '')].filter(Boolean).join(' ');
}

// Map: flow number ("02") -> {step, error} for every failed step record of one device.
function failedSteps(deviceDir) {
  const res = {};
  for (const f of filesUnder(deviceDir, /^commands.*\.json$/)) {
    let list;
    try {
      list = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;
    const bad = list.find(e => {
      const st = String((e && (e.status || (e.metadata && e.metadata.status))) || '');
      return /FAIL|ERROR/i.test(st);
    });
    if (!bad) continue;
    const err = bad.error || (bad.metadata && bad.metadata.error) || {};
    const msg = typeof err === 'string' ? err : err.message || err.reason || '';
    // Номер сценария — из имени файла «commands-(02 Тур…).json» или из папки сценария «02 Тур…/commands.json».
    const seg = path.relative(deviceDir, f).split(path.sep).reverse().find(x => /(?:^|\()\d\d[ _-]/.test(x));
    const num = (seg && seg.match(/(?:^|\()(\d\d)[ _-]/)[1]) || '?';
    res[num] = {step: describeCommand(bad.command), error: msg};
  }
  return res;
}

const rows = [];
let failedTotal = 0;
let skipped = 0;
for (const run of runs) {
  const xmlPath = path.join(dir, `${run.slug}.xml`);
  if (!fs.existsSync(xmlPath) && run.code === 3) {
    // Стенд не смог проверить устройство (нет сборки, не загрузился эмулятор) — это не падение сценария.
    const why = fs.existsSync(path.join(dir, `${run.slug}.log`))
      ? oneLine(fs.readFileSync(path.join(dir, `${run.slug}.log`), 'utf8'))
      : 'не проверено';
    rows.push([run.name, '—', '⚠️', '', `не проверено: ${why}`]);
    skipped++;
    continue;
  }
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
  const steps = failedSteps(path.join(dir, run.slug));
  for (const c of cases) {
    const head = `<x ${c[1]}>`;
    const body = c[3] || '';
    const failure = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>|<(failure|error)\b([^>]*)\/>/);
    const ok = !failure && !/status="(ERROR|FAILED)"/.test(head);
    if (!ok) failedTotal++;
    const reason = failure
      ? oneLine(attr(`<x ${failure[2] || failure[5] || ''}>`, 'message') || failure[3] || '')
      : '';
    // «Unknown error» и пустые причины дополняем упавшим шагом из отметок Maestro.
    let why = reason;
    if (!ok) {
      const num = ((attr(head, 'name') || attr(head, 'id')).match(/^(\d\d)\b/) || [])[1];
      const st = (num && steps[num]) || (Object.keys(steps).length === 1 ? Object.values(steps)[0] : null);
      if (st && st.step) {
        const err = oneLine(st.error || '');
        why = `шаг: ${st.step}` + (err && !/^Unknown error$/i.test(err) ? ` — ${err}` : reason && !/^Unknown error$/i.test(reason) ? ` — ${reason}` : '');
      }
    }
    const time = attr(head, 'time');
    rows.push([
      run.name,
      attr(head, 'name') || attr(head, 'id'),
      ok ? '✅' : '❌',
      time ? `${Math.round(Number(time))} с` : '',
      why,
    ]);
  }
}

const date = path.basename(dir).replace('_', ' ').replace(/-(\d\d)$/, ':$1');
const lines = [];
lines.push(
  failedTotal
    ? `ЕСТЬ ПРОБЛЕМЫ: упало сценариев — ${failedTotal}${skipped ? `; не проверено устройств — ${skipped}` : ''}`
    : skipped
      ? `ПРОВЕРЕНО ЧАСТИЧНО: сценарии прошли, не проверено устройств — ${skipped}`
      : 'ВСЁ РАБОТАЕТ',
);
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
