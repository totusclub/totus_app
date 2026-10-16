// Обновляет issue «QA мобильных приложений — последний прогон» (метка qa-mobile).
// Читает shots-branch/latest/<платформа>/result.json (см. publish-shots.sh).
// Тело issue начинается с маркера <!-- qa-mobile-status --> и строки «ВСЁ РАБОТАЕТ» / «ЕСТЬ ПРОБЛЕМЫ: …» —
// её читает ежечасный чекап сайта. При падении в этом прогоне добавляется комментарий (письмо владельцу).
const fs = require('fs');
const path = require('path');

const PLATFORMS = [
  ['android', 'Android'],
  ['iphone', 'iPhone'],
  ['ipad', 'iPad'],
];
const ICON = { pass: '✅', fail: '❌', build_failed: '❌', blocked: '⚠️' };
const MARKER = '<!-- qa-mobile-status -->';
const TITLE = 'QA мобильных приложений — последний прогон (Maestro)';

const msk = (iso) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' МСК'
    : '—';
const dur = (s) => (s == null ? '—' : `${Math.floor(s / 60)} мин ${s % 60} с`);

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const base = path.resolve('shots-branch/latest');
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;

  const rows = [];
  const problems = [];
  const freshProblems = [];
  const shots = [];
  const logs = [];

  for (const [key, label] of PLATFORMS) {
    const file = path.join(base, key, 'result.json');
    if (!fs.existsSync(file)) {
      rows.push(`| ${label} | — | ещё не запускалось | — | — | — |`);
      continue;
    }
    const r = JSON.parse(fs.readFileSync(file, 'utf8'));
    const fresh = String(r.run_id) === String(context.runId);
    const details =
      r.status === 'pass'
        ? `дошёл до «${r.last_step}»`
        : r.status === 'fail'
          ? `упал после «${r.last_step || 'запуска'}»`
          : r.reason || r.status;
    rows.push(
      `| ${label} | ${ICON[r.status] || '❓'} | ${details} | ${dur(r.duration_s)} | ${msk(r.finished_at)}${
        fresh ? '' : ' (прошлый прогон)'
      } | \`${(r.sha || '').slice(0, 7)}\` |`,
    );
    if (r.status !== 'pass') {
      problems.push(`${label} — ${details}`);
      // «blocked» (нет проекта/секрета) — известное состояние, не шумим комментарием каждый прогон
      if (fresh && r.status !== 'blocked') freshProblems.push(`${label} — ${details}`);
      if (r.log_tail) {
        logs.push(`<details><summary>${label} — хвост лога</summary>\n\n\`\`\`\n${r.log_tail}\n\`\`\`\n</details>`);
      }
    }
    const pngs = fs
      .readdirSync(path.join(base, key))
      .filter((n) => n.endsWith('.png'))
      .sort();
    if (pngs.length) {
      const imgs = pngs
        .map(
          (n) =>
            `<b>${n.replace(/\.png$/, '')}</b><br><img src="https://github.com/${owner}/${repo}/blob/qa-screenshots/latest/${key}/${encodeURIComponent(
              n,
            )}?raw=true" width="240">`,
        )
        .join('\n\n');
      shots.push(`<details><summary>${label} — скриншоты (${pngs.length})</summary>\n\n${imgs}\n</details>`);
    }
  }

  const head = problems.length ? `## ЕСТЬ ПРОБЛЕМЫ: ${problems.join('; ')}` : '## ВСЁ РАБОТАЕТ';
  const body = [
    MARKER,
    head,
    '',
    `Обновлено: ${msk(new Date().toISOString())} · событие: \`${context.eventName}\` · [журнал прогона](${runUrl})`,
    '',
    '| Платформа | Статус | Детали | Длительность | Когда | Коммит |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    'Сценарий (`.maestro/smoke.yaml`): онбординг → главная → «Найти» (Москва → Египет) → первый отель → «Все варианты» → первое предложение → перелёт → «Перейти к бронированию» → экран «Вход». Ничего не бронируется.',
    'Расписание: 09:10 и 19:10 МСК — все платформы; пуш в `main` — только Android; вручную — Actions → Mobile QA → Run workflow.',
    '',
    ...shots,
    '',
    ...logs,
  ].join('\n');

  try {
    await github.rest.issues.getLabel({ owner, repo, name: 'qa-mobile' });
  } catch {
    await github.rest.issues.createLabel({
      owner,
      repo,
      name: 'qa-mobile',
      color: '0e8a16',
      description: 'Автотест мобильных приложений (Maestro)',
    });
  }

  const { data: open } = await github.rest.issues.listForRepo({
    owner,
    repo,
    labels: 'qa-mobile',
    state: 'open',
    per_page: 20,
  });
  let issue = open.find((i) => (i.body || '').startsWith(MARKER));
  if (issue) {
    await github.rest.issues.update({ owner, repo, issue_number: issue.number, title: TITLE, body });
  } else {
    issue = (await github.rest.issues.create({ owner, repo, title: TITLE, body, labels: ['qa-mobile'] })).data;
  }

  if (freshProblems.length) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `❌ ${freshProblems.join('; ')}\n\n[Журнал прогона](${runUrl})`,
    });
  }

  await core.summary.addRaw(body).write();
  core.info(`Issue #${issue.number}: ${head}`);
};
