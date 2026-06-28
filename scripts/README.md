# scripts/

| script | what it does |
| --- | --- |
| `sync.ts` | Headless results sync — fetches real WC results and rewrites the split tournament store (`config/sweepstake.json` + `groupFixtures.json` + `knockout.json`), each file only when it changed (idempotent). Run via `npm run sync`. |
| `nightly-sync.sh` | Wraps `npm run sync`, then commits + pushes the three `config/*.json` state files **only if any changed**. Run by the launchd nightly job (below). |
| `build-site.sh` / `compose-site.ts` | Assemble the static per-competition `site/` for the Vercel deploy. Run via `npm run build:site`. |
| `print-env-vars.ts` | Prints the `PARTICIPANTS_<SLUG>` env vars to set in Vercel. Run via `npm run print-env`. |

## Nightly sync automation (launchd)

The nightly job runs on **launchd**, not cron, so a run missed while the Mac is
asleep/off fires as soon as it wakes (cron silently skips missed runs).

- **LaunchAgent:** `~/Library/LaunchAgents/com.hitley.sweepstake-nightly-sync.plist`
- **Schedule:** daily at 16:00 (`StartCalendarInterval`)
- **Runs:** `scripts/nightly-sync.sh` → `npm run sync`, then commit + push if changed
- **Logs:** appended to `sync.log` in the repo root (stdout + stderr)
- **Requires:** `FOOTBALL_DATA_TOKEN` in the gitignored `.env` (local only)

Note: the plist lives under `~/Library/LaunchAgents/` (outside the repo), so it
is **not** version-controlled. If you set this up on a new machine, recreate the
plist there. The script sets an explicit `PATH` including `/usr/local/bin`
(where `node`/`npm` live) because launchd provides a minimal environment.

### Managing it

```sh
# Path / uid shorthand used below
PLIST=~/Library/LaunchAgents/com.hitley.sweepstake-nightly-sync.plist
LABEL=com.hitley.sweepstake-nightly-sync

# Load (after creating or editing the plist)
launchctl bootstrap gui/$(id -u) "$PLIST"

# Unload (e.g. before editing, or to disable)
launchctl bootout gui/$(id -u)/$LABEL

# Inspect state / log paths
launchctl print gui/$(id -u)/$LABEL

# Run it now (real sync — may commit + push)
launchctl kickstart -k gui/$(id -u)/$LABEL

# Watch the log
tail -f sync.log
```

After editing the plist, `bootout` then `bootstrap` to reload it.
