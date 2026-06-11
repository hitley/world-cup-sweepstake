#!/usr/bin/env bash
# Assemble the deployable static site: one read-only copy of the app per
# competition, each with its sweepstake.json next to index.html. The site
# root is intentionally blank so competitions can't discover each other.
set -euo pipefail

npx vite build

rm -rf site
mkdir -p site
echo '<!doctype html><html><body></body></html>' > site/index.html

for dir in config/competitions/*/; do
  slug=$(basename "$dir")
  if [ -f "$dir/sweepstake.json" ]; then
    cp -r dist "site/$slug"
    cp "$dir/sweepstake.json" "site/$slug/sweepstake.json"
    echo "Assembled competition: $slug"
  fi
done
