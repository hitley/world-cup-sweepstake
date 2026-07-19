# scripts/

| script | what it does |
| --- | --- |
| `sync.ts` | Headless results sync — fetches real WC results and rewrites the split tournament store (`config/sweepstake.json` + `groupFixtures.json` + `knockout.json`), each file only when it changed (idempotent). Run via `npm run sync`. |
| `nightly-sync.sh` | Wraps `npm run sync`, then commits + pushes the three `config/*.json` state files **only if any changed**. Run by the launchd nightly job (below). |
| `build-site.sh` / `compose-site.ts` | Assemble the static per-competition `site/` for the Vercel deploy. Run via `npm run build:site`. |
| `print-env-vars.ts` | Prints the `PARTICIPANTS_<SLUG>` env vars to set in Vercel. Run via `npm run print-env`. |

## Nightly sync automation (launchd)

> **Status: not installed.** The 2026 tournament is over, so the scheduled job
> has been unloaded and removed from `~/Library/LaunchAgents/`. A template copy
> of the LaunchAgent lives in the repo at
> `scripts/com.hitley.sweepstake-nightly-sync.plist` so it can be reinstated for
> a future tournament. The steps below are how to set it up again from scratch.

The job runs on **launchd**, not cron, so a run missed while the Mac is
asleep/off fires as soon as it wakes (cron silently skips missed runs).

- **Template plist:** `scripts/com.hitley.sweepstake-nightly-sync.plist` (in-repo)
- **Installed location:** `~/Library/LaunchAgents/com.hitley.sweepstake-nightly-sync.plist`
- **Schedule:** 5x/day at 06:00, 08:00, 10:00, 12:00 and 14:00 (`StartCalendarInterval` array)
- **Runs:** `scripts/nightly-sync.sh` → `npm run sync`, then commit + push if changed
- **Logs:** appended to `sync.log` in the repo root (stdout + stderr)
- **Requires:** `FOOTBALL_DATA_TOKEN` in the gitignored `.env` (local only)

The template hard-codes absolute paths under
`/Users/hitley/code/fifa-world-cup-2026-sweepstake-tracker/` (the
`ProgramArguments` script path and the two `sync.log` paths) — **edit these for
the machine/checkout you install on**. `nightly-sync.sh` sets an explicit `PATH`
including `/usr/local/bin` (where `node`/`npm` live) because launchd provides a
minimal environment.

### (Re)installing it

```sh
LABEL=com.hitley.sweepstake-nightly-sync
SRC=scripts/$LABEL.plist                       # in-repo template
DST=~/Library/LaunchAgents/$LABEL.plist

# 1. Copy the template into LaunchAgents (edit the paths inside first if needed)
cp "$SRC" "$DST"

# 2. Load it
launchctl bootstrap gui/$(id -u) "$DST"
```

### Managing it

```sh
LABEL=com.hitley.sweepstake-nightly-sync
DST=~/Library/LaunchAgents/$LABEL.plist

# Inspect state / log paths
launchctl print gui/$(id -u)/$LABEL

# Run it now (real sync — may commit + push)
launchctl kickstart -k gui/$(id -u)/$LABEL

# Watch the log
tail -f sync.log

# Unload (disable). Also delete $DST to remove it entirely.
launchctl bootout gui/$(id -u)/$LABEL
```

After editing the installed plist, `bootout` then `bootstrap` to reload it. If
you only need a one-off sync (no schedule), just run `npm run sync` directly —
no launchd needed.
