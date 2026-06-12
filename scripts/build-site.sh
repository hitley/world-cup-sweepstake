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

# Assemble a folder for every committed competition (marked by .gitkeep).
# participants.json is gitignored, so it is absent on Vercel — the contenders
# come from the PARTICIPANTS_<SLUG> env var instead, resolved in compose-site.ts.
for dir in config/competitions/*/; do
  slug=$(basename "$dir")
  cp -r dist "site/$slug"
  echo "Assembled competition: $slug"
done

# Compose each competition's sweepstake.json from the shared state + participants
npx tsx scripts/compose-site.ts
