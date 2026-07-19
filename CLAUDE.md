# FIFA World Cup 2026 Sweepstake Tracker

A sweepstake tracker for the 2026 World Cup. Friends draft national teams; the
app pulls real results and ranks them. Runs several **private competitions**
(separate friend groups) off one shared tournament.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind 4 (`src/`). Dark theme, Bungee +
  Outfit fonts, yellow/rose/slate palette. Tabs: Standings, XP Ladder,
  Road to Final, Head-to-Head, Matches, Trends. The **Road to Final**
  (`src/components/RoadToFinal.tsx`) renders the knockout bracket from
  `state.knockout`, each tie tagged with the contender who drafted each team.
  It hardcodes the fixed FIFA 2026 bracket topology (match numbers M73–M104 +
  feed graph): Round-of-32 slots bind to fixtures by schedule order — the
  official R32 match numbers aren't in kickoff order (M76 precedes M74), so a
  small kickoff table orders the 16 slots, then the i-th `LAST_32` fixture
  (sorted by kickoff) binds to the i-th slot. The table is used only for
  ordering, not exact matching, so the synced feed's uniform offset (~8h behind
  the official times) can't break it. Every later slot resolves to the winners
  of its two feeders (then binds to the API fixture whose teams match), so the
  tree fills in as the sync captures each round. On `xl`+ it shows the full mirrored bracket (full-bleed, final centred);
  below that, a 2-column current-round → next-round view.
  The **Winners reveal** (`src/components/WinnersModal.tsx`) is a blurred-backdrop
  modal that auto-opens once the `FINAL` is played (dismiss = click-away / `Esc` /
  X, in-session only via a default-true `showWinners` state — no persistence; a
  header trophy button re-opens it). Page 1 announces the five prizes; page 2 the
  fun honours. Suppressed in print mode.
- **Backend**: Express (`server.ts`), run with `tsx` in dev. Serves the API and
  Vite middleware. Only used **locally** (admin) — the deploy is static.
- **Shared logic** (`lib/`, dependency-light, used by server + build + scripts):
  - `composeState.ts` — builds the per-competition state the frontend expects
    from shared tournament state + a competition's participants.
  - `footballData.ts` — fetch + parse real results from football-data.org
    (competition code `WC`), map API team names → the app's 48 (alias +
    accent-insensitive + prefix fallback in `resolveTeamName`). Captures both
    `groupFixtures` (Head-to-Head) and `knockoutFixtures` (Knockouts view),
    played + scheduled.
  - `replayTournament.ts` — pure, deterministic rebuild of the whole tournament
    from all finished matches + the knockout bracket (idempotent). Computes XP +
    breakdown, eliminations, and live win probabilities (see Data model). Takes
    `knockoutFixtures` so it can eliminate group-stage non-qualifiers.
  - `baseTeams.ts` — the canonical 48-team seed (`INITIAL_TEAMS`): identities +
    each team's pre-tournament win `prob` (doubles as the immutable "strength"
    probabilities are renormalized from). Single source of truth shared by the
    server, the headless sync and scripts, so replay strengths never drift.
  - `headToHead.ts` — group-stage mini-game: maps each real group fixture onto
    the two contenders who drafted those teams (football points + goals).
  - `prizes.ts` — resolves the five sweepstake prizes for `WinnersModal` from the
    **real tournament outcome** (not XP): 1st/2nd = winner/loser of the `FINAL`,
    3rd/4th = winner/loser of the `THIRD_PLACE` play-off, 🥄 wooden spoon = worst
    group-stage team (fewest group points, then worst goal difference, then fewest
    goals for). Each prize's winner is the contender who drafted that team
    (case-insensitive; `null` if undrafted). `isTournamentComplete()` mirrors
    `replayTournament.ts`'s champion check (a played `FINAL` with a winner).
  - `tournamentFiles.ts` — node-only helpers for the split config store (file
    paths + idempotent `writeJsonIfChanged`); shared by server, sync, builder.

## Data model (key facts)

- **One shared tournament, split across 3 committed files** (server-written,
  mutate as the tournament progresses; no personal data):
  - `config/sweepstake.json` — core state: `teams`, `currentDayIndex`, `history`
    (per-day team snapshots). The bulk; changes every sync.
  - `config/groupFixtures.json` — `GroupFixture[]` for Head-to-Head. **Frozen
    once the group stage finishes** (stops appearing in diffs).
  - `config/knockout.json` — `KnockoutFixture[]` (stage, score, winner) for the
    Knockouts view; empty until the knockouts start, then fills each sync.
  - The schedule files carry no participant data, so the static deploy serves
    them **once** from the site root (`site/groupFixtures.json`,
    `site/knockout.json`); the dev server exposes `/api/groupFixtures` +
    `/api/knockout`. The frontend fetches them separately and merges into state
    (`SweepstakeState.groupFixtures` / `.knockout`).
- **Per-competition participants**: resolved by `lib/loadParticipants.ts` from
  env var `PARTICIPANTS_<SLUG>` (deploys) **or** the gitignored
  `config/competitions/<slug>/participants.json` (local dev). A competition
  exists iff `config/competitions/<slug>/` exists (committed `.gitkeep`).
  **Participant names are never committed.** Current slugs: `team`,
  `gbc-familia`, `scope`.
- **XP**: `points = 3*wins + 1*draws + 2*cleanSheets + goalPoints + bonusPoints`
  (goal XP capped at 3/match; round bonuses R32+5…SF+20, champion +50). The
  breakdown is stored per team so the file is self-explanatory.
- **Prizes** (the actual payout, distinct from XP; see `lib/prizes.ts`): 1st–4th
  follow the **real finishing position** — 1st/2nd = the two finalists, 3rd/4th =
  the two `THIRD_PLACE` play-off teams — and the wooden spoon is the worst
  group-stage team (least group points, then worst goal difference). The prize
  goes to whoever **drafted** that team. Not derivable from the XP totals, so it's
  computed separately for the Winners reveal.
- **Eliminations** (per team `status`): a team is `Eliminated` when it loses a
  knockout tie, **or** — once the Round of 32 is fully drawn (all 16 ties, 32
  teams) — when it didn't make the R32 (group-stage exit). The latter is gated
  on a complete bracket so a partially-populated API feed never eliminates a
  qualifier early. Until the feed fills the R32 in, the bracket can be hand-set
  in `config/knockout.json` as a stopgap; the next sync recomputes from the API.
- **Win probabilities** (per team `prob`): recomputed every matchday by
  renormalizing each surviving team's seed strength (`baseTeams` `prob`) over the
  sum of surviving strengths, so the field always totals ~100% and the odds
  re-spread automatically at every knockout round (eliminated → 0; the last team
  standing → ~100%). Strengths come from the constant seed, keeping it idempotent.

## Results sync ("Sync Latest Results")

- Recomputes the entire tournament from **all** finished matches each run →
  **idempotent + self-catching-up**. Each of the 3 state files is written only
  when its content changed (no spurious diffs).
- Needs `FOOTBALL_DATA_TOKEN` in a gitignored `.env` (local only; the static
  deploy never calls the API). Free token: football-data.org.
- Headless: `npm run sync` (no UI/server needed). The nightly job uses it.
- After syncing, the changed `config/*.json` state files are committed + pushed
  to refresh the live sites.
- **Nightly automation** (currently **not installed** — the tournament is over, so
  the launchd job has been unloaded/removed): `scripts/nightly-sync.sh` runs the
  sync then commits + pushes the 3 state files (only if any changed). Scheduled
  via **launchd** (not cron) so a run missed while the Mac is asleep fires on wake.
  A template LaunchAgent is kept in-repo at
  `scripts/com.hitley.sweepstake-nightly-sync.plist` (5x/day at
  06:00/08:00/10:00/12:00/14:00, logs to `sync.log`); install it to
  `~/Library/LaunchAgents/` to reinstate. See `scripts/README.md` for the
  (re)install + management steps.

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
