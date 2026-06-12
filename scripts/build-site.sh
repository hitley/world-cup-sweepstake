#!/usr/bin/env bash
# Assemble the deployable static site: one read-only copy of the app per
# competition. The tournament state is shared (config/sweepstake.json) and
# composed with each competition's participants into its own sweepstake.json.
# The site root is intentionally blank so competitions can't discover each other.
set -euo pipefail

npx vite build

rm -rf site
mkdir -p site
echo '<!doctype html><html><body></body></html>' > site/index.html

for dir in config/competitions/*/; do
  slug=$(basename "$dir")
  if [ -f "$dir/participants.json" ]; then
    cp -r dist "site/$slug"
    echo "Assembled competition: $slug"
  fi
done

# Compose each competition's sweepstake.json from the shared state + participants
npx tsx scripts/compose-site.ts
