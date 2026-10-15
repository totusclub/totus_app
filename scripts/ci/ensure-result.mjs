// Если прогон не дошёл до Maestro (сборка упала, нет секрета, нет Xcode-проекта),
// пишет result.json сам, чтобы отчёт показал причину. Существующий result.json не трогает.
// usage: node ensure-result.mjs <out-dir> <status: build_failed|blocked> <reason> [log-file]
import fs from 'node:fs';
import path from 'node:path';

const [out, status, reason, logFile] = process.argv.slice(2);
const file = path.join(out, 'result.json');
if (fs.existsSync(file)) process.exit(0);
fs.mkdirSync(out, { recursive: true });

let tail = '';
if (logFile && fs.existsSync(logFile)) {
  const lines = fs
    .readFileSync(logFile, 'utf8')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .split('\n')
    .filter((l) => l.trim());
  const errors = lines.filter((l) => /error:|ERR!|FAILED|What went wrong|Exception/i.test(l)).slice(-25);
  tail = [...errors, '…', ...lines.slice(-30)].join('\n').slice(-6000);
}

fs.writeFileSync(
  file,
  JSON.stringify(
    {
      platform: path.basename(out),
      status,
      reason,
      last_step: null,
      duration_s: null,
      finished_at: new Date().toISOString(),
      sha: process.env.GITHUB_SHA || '',
      run_id: process.env.GITHUB_RUN_ID || '',
      log_tail: tail,
    },
    null,
    2,
  ),
);
