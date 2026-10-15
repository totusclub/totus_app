#!/usr/bin/env bash
# Прогоняет .maestro/smoke.yaml на уже запущенном эмуляторе/симуляторе и складывает в OUT:
#   shots/NN-*.png  — контрольные скриншоты (+ zz-failure.png при падении)
#   maestro.log, junit.xml, debug/  — вывод Maestro
#   result.json     — итог для отчёта (scripts/ci/report-issue.cjs)
# usage: run-maestro.sh <label> <app-id> <out-dir> [device-id]
set -uo pipefail

LABEL="$1"; APP_ID="$2"; OUT="$3"; DEVICE="${4:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW="$ROOT/.maestro/smoke.yaml"
mkdir -p "$OUT/shots" "$OUT/debug"
OUT="$(cd "$OUT" && pwd)"

DEV_ARGS=()
[ -n "$DEVICE" ] && DEV_ARGS=(--device "$DEVICE")

START=$(date +%s)
# takeScreenshot пишет в текущую папку — запускаем из shots/
( cd "$OUT/shots" && maestro ${DEV_ARGS[@]+"${DEV_ARGS[@]}"} test "$FLOW" -e "APP_ID=$APP_ID" \
    --format junit --output "$OUT/junit.xml" --debug-output "$OUT/debug" ) 2>&1 | tee "$OUT/maestro.log"
CODE=${PIPESTATUS[0]}
END=$(date +%s)

# Новые версии Maestro могут класть скриншоты в ~/.maestro/tests или debug-output — собираем оттуда тоже
for dir in "$OUT/debug" "$HOME/.maestro/tests"; do
  [ -d "$dir" ] || continue
  find "$dir" -type f -name '[0-9][0-9]-*.png' -mmin -120 2>/dev/null | while read -r f; do
    [ -f "$OUT/shots/$(basename "$f")" ] || cp "$f" "$OUT/shots/"
  done
  if [ "$CODE" -ne 0 ]; then
    FAIL_SHOT=$(find "$dir" -type f -name '*.png' ! -name '[0-9][0-9]-*.png' -mmin -120 2>/dev/null | sort | tail -1)
    [ -n "$FAIL_SHOT" ] && [ ! -f "$OUT/shots/zz-failure.png" ] && cp "$FAIL_SHOT" "$OUT/shots/zz-failure.png"
  fi
done

LABEL="$LABEL" CODE="$CODE" DUR=$((END - START)) OUT="$OUT" node -e '
const fs = require("fs"), path = require("path");
const out = process.env.OUT;
const shots = fs.readdirSync(path.join(out, "shots")).filter(n => /^\d\d-.*\.png$/.test(n)).sort();
const log = fs.existsSync(path.join(out, "maestro.log")) ? fs.readFileSync(path.join(out, "maestro.log"), "utf8") : "";
const clean = log.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").split("\n").filter(l => l.trim());
const ok = process.env.CODE === "0";
fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({
  platform: process.env.LABEL,
  status: ok ? "pass" : "fail",
  last_step: shots.length ? shots[shots.length - 1].replace(/\.png$/, "") : null,
  duration_s: Number(process.env.DUR),
  finished_at: new Date().toISOString(),
  sha: process.env.GITHUB_SHA || "",
  run_id: process.env.GITHUB_RUN_ID || "",
  log_tail: ok ? "" : clean.slice(-60).join("\n").slice(-6000),
}, null, 2));
'
exit "$CODE"
