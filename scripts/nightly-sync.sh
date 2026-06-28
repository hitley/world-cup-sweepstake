#!/usr/bin/env bash
# Nightly automation: sync real World Cup results, then commit + push the updated
# tournament store (only if it changed). The store is split across three files:
# config/sweepstake.json + groupFixtures.json + knockout.json. Designed to be run
# by cron/launchd, which provide a minimal environment — hence the explicit PATH.
set -uo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || { echo "[$(date)] repo not found"; exit 1; }

STATE_FILES=(config/sweepstake.json config/groupFixtures.json config/knockout.json)

echo "[$(date)] nightly sync starting (branch: $(git rev-parse --abbrev-ref HEAD))"

npm run sync || { echo "[$(date)] sync failed"; exit 1; }

if git diff --quiet -- "${STATE_FILES[@]}"; then
  echo "[$(date)] no results changes — nothing to commit"
  exit 0
fi

git add "${STATE_FILES[@]}"
git commit -m "Nightly results sync $(date +%Y-%m-%d)"
if git push; then
  echo "[$(date)] committed + pushed"
else
  echo "[$(date)] committed locally but push failed (check git credentials)"
  exit 1
fi
