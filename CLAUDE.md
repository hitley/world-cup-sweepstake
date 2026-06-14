# FIFA World Cup 2026 Sweepstake Tracker

A sweepstake tracker for the 2026 World Cup. Friends draft national teams; the
app pulls real results and ranks them. Runs several **private competitions**
(separate friend groups) off one shared tournament.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind 4 (`src/`). Dark theme, Bungee +
  Outfit fonts, yellow/rose/slate palette. Tabs: Standings, XP Ladder,
  Head-to-Head, Matches, Trends.
- **Backend**: Express (`server.ts`), run with `tsx` in dev. Serves the API and
  Vite middleware. Only used **locally** (admin) — the deploy is static.
- **Shared logic** (`lib/`, dependency-light, used by server + build + scripts):
  - `composeState.ts` — builds the per-competition state the frontend expects
    from shared tournament state + a competition's participants.
  - `footballData.ts` — fetch + parse real results from football-data.org
    (competition code `WC`), map API team names → the app's 48 (alias +
    accent-insensitive + prefix fallback in `resolveTeamName`).
  - `replayTournament.ts` — pure, deterministic rebuild of the whole tournament
    from all finished matches (idempotent). Computes XP + breakdown.
  - `headToHead.ts` — group-stage mini-game: maps each real group fixture onto
    the two contenders who drafted those teams (football points + goals).

## Data model (key facts)

- **One shared tournament**: `config/sweepstake.json` (committed) holds `teams`,
  `currentDayIndex`, `history` (per-day team snapshots), and `groupFixtures`.
  It is **server-written and mutates** — expect git diffs as the tournament
  progresses. No personal data in it.
- **Per-competition participants**: resolved by `lib/loadParticipants.ts` from
  env var `PARTICIPANTS_<SLUG>` (deploys) **or** the gitignored
  `config/competitions/<slug>/participants.json` (local dev). A competition
  exists iff `config/competitions/<slug>/` exists (committed `.gitkeep`).
  **Participant names are never committed.** Current slugs: `team`,
  `gbc-familia`, `scope`.
- **XP**: `points = 3*wins + 1*draws + 2*cleanSheets + goalPoints + bonusPoints`
  (goal XP capped at 3/match; round bonuses R32+5…SF+20, champion +50). The
  breakdown is stored per team so the file is self-explanatory.

## Results sync ("Sync Latest Results")

- Recomputes the entire tournament from **all** finished matches each run →
  **idempotent + self-catching-up**. Skips writing the file when unchanged.
- Needs `FOOTBALL_DATA_TOKEN` in a gitignored `.env` (local only; the static
  deploy never calls the API). Free token: football-data.org.
- Headless: `npm run sync` (no UI/server needed). The nightly job uses it.
- After syncing, `config/sweepstake.json` is committed + pushed to refresh the
  live sites.
- **Nightly automation**: `scripts/nightly-sync.sh` runs the sync then commits +
  pushes (only if the file changed). Scheduled via **launchd** (not cron) so a
  run missed while the Mac is asleep fires on wake. LaunchAgent:
  `~/Library/LaunchAgents/com.hitley.sweepstake-nightly-sync.plist` (daily 22:00,
  logs to `sync.log`). See `scripts/README.md` for managing it.

## Deploy

- **Vercel** (free Hobby, private repo). `scripts/build-site.sh` + `vercel.json`
  build the SPA once and emit one **read-only** static copy per competition at
  `/<slug>/`; site root is intentionally blank. Participant names come from
  `PARTICIPANTS_<SLUG>` env vars in Vercel (`npm run print-env` lists them).
- Pushing `main` auto-deploys.

## Conventions

- **Commit directly to `main`** by default (solo private repo, Vercel deploys
  from main). Only branch when explicitly asked.
- Commit/push only when asked. End commit messages with the Co-Authored-By
  trailer.
- Analytics: Vercel Web Analytics + custom events via `src/analytics.ts`
  (`trackEvent`), each tagged with the competition.

## Commands

- `npm run dev` — local app at http://localhost:3000 (picker; manage a
  competition at `/?c=<slug>`).
- `npm run sync` — headless results sync (writes `config/sweepstake.json`).
- `npm run build:site` — assemble the static `site/` for deploy preview.
- `npm run lint` — `tsc --noEmit`.
