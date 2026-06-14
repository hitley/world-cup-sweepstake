#!/usr/bin/env bash
# Nightly automation: sync real World Cup results, then commit + push the
# updated config/sweepstake.json (only if it changed). Designed to be run by
# cron/launchd, which provide a minimal environment — hence the explicit PATH.
set -uo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || { echo "[$(date)] repo not found"; exit 1; }

echo "[$(date)] nightly sync starting (branch: $(git rev-parse --abbrev-ref HEAD))"

npm run sync || { echo "[$(date)] sync failed"; exit 1; }

if git diff --quiet -- config/sweepstake.json; then
  echo "[$(date)] no results changes — nothing to commit"
  exit 0
fi

git add config/sweepstake.json
git commit -m "Nightly results sync $(date +%Y-%m-%d)"
if git push; then
  echo "[$(date)] committed + pushed"
else
  echo "[$(date)] committed locally but push failed (check git credentials)"
  exit 1
fi
