#!/usr/bin/env bash
# Кладёт result.json и скриншоты прогона в ветку qa-screenshots (latest/<платформа>/),
# чтобы issue со статусом показывал картинки. Платформы, которые в этом прогоне не запускались,
# сохраняют прошлый результат. Ветка всегда из одного коммита (force-push) — репозиторий не растёт.
# Рабочая копия остаётся в ./shots-branch — её читает report-issue.cjs.
# usage: GH_TOKEN=… publish-shots.sh <artifacts-dir>   (внутри папки qa-android, qa-iphone, qa-ipad)
set -euo pipefail

mkdir -p "${1:?artifacts dir}"
IN="$(cd "$1" && pwd)"
URL="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

rm -rf shots-branch
if ! git clone --quiet --depth 1 --branch qa-screenshots "$URL" shots-branch 2>/dev/null; then
  mkdir shots-branch
  git -C shots-branch init --quiet
fi
cd shots-branch
mkdir -p latest

for d in "$IN"/qa-*; do
  [ -f "$d/result.json" ] || continue
  p="${d##*/qa-}"
  rm -rf "latest/$p"
  mkdir -p "latest/$p"
  cp "$d/result.json" "latest/$p/"
  cp "$d"/shots/*.png "latest/$p/" 2>/dev/null || true
done

git config user.name "totus-qa-bot"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout --quiet --orphan qa-snapshot
git add -A
git commit --quiet -m "QA mobile: run ${GITHUB_RUN_ID:-local}" || true
git push --quiet --force "$URL" HEAD:refs/heads/qa-screenshots
