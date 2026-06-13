<div align="center">

# 🏆 WORLD CUP 2026 <ins>SWEEPSTAKE</ins>

**Matchday Live Portal & Survival Probability Math**

![World Cup 2026](https://img.shields.io/badge/FIFA_World_Cup-2026-facc15?style=for-the-badge&labelColor=0f172a)
![Teams](https://img.shields.io/badge/48_Teams-3_Host_Nations-f43f5e?style=for-the-badge&labelColor=0f172a)
![Dates](https://img.shields.io/badge/June_11_→_July_19-2026-10b981?style=for-the-badge&labelColor=0f172a)

*A live sweepstake tracker for the 2026 FIFA World Cup across the USA, Canada & Mexico — drafted squads, survival odds, matchday drama, and AI-powered match roundups.*

</div>

---

## ⚽ Tournament Info

| | |
|---|---|
| 🗓️ **Dates** | June 11 — July 19, 2026 |
| 🌎 **Hosts** | United States 🇺🇸 · Canada 🇨🇦 · Mexico 🇲🇽 |
| 🚩 **Teams** | 48 qualified nations (first-ever 48-team World Cup) |
| 🎯 **The draft** | Each contender drafts **3 national squads** |
| 📈 **Scoring** | Teams earn XP for goals, wins, and clean sheets — knockout round progress grants massive multipliers (+5 to +50 XP) |
| 💀 **Survival** | When your team is eliminated, it's gone for good — squad integrity is everything |

## 💰 Prize Distribution

How the pot is split when the final whistle blows:

| Place | Share | |
|---|---|---|
| 🥇 **World Cup Winner** | **65%** | Owner of the champion squad takes the lion's share |
| 🥈 **Runner-Up** | **20%** | Heartbreak in the final, but the bank doesn't care |
| 🥉 **Losing Semi-Finalists** | **5% each** | Consolation prize for falling at the penultimate hurdle |
| 🥄 **Wooden Spoon** | **5%** | Fewest points & worst goal difference — celebrated for surviving the shame |

## 🎮 Features

- 📊 **Sweepstake Standings** — live contender rankings with squad integrity bars, win probability, and gamified badges (🏆 Table Leader, 💔 Heartbroken, 🔥 Golden Path...)
- 🗓️ **Matchday Logbook** — fixture scorecards, goal scorers, witty AI commentary, and a "Knocked Out Today" obituary column
- ⚔️ **Head-to-Head** — group-stage fixtures mirrored onto the contenders who drafted each team; football points (3/1/0) + goals across the 3 group rounds, with a league table
- 📈 **Performance Trends** — SVG point-progression charts and win-path probability gauges
- ⚽ **Real results** — pulls actual 2026 World Cup scores from [football-data.org](https://www.football-data.org) and tallies XP, eliminations, and a roundup for each tournament day
- 🖨️ **Print-friendly view** & 🖼️ **PNG poster export** for sharing the standings
- ⚙️ **Draft Setup room** — configure contenders and their drafted squads

## 🚀 Run Locally

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Add your football-data.org token (for fetching real results)
cp .env.example .env   # then paste your free token into FOOTBALL_DATA_TOKEN

# 3. Kick off
npm run dev            # serves on http://localhost:3000
```

Opening `http://localhost:3000` shows a competition picker; each competition is managed at `http://localhost:3000/?c=<slug>`.

### Syncing matchday results

**Sync Latest Results** (local admin view only) pulls every finished World Cup match to date from [football-data.org](https://www.football-data.org) and **recomputes the whole tournament from scratch** — applying the XP rules (above), eliminating real knockout losers, and advancing the **shared** tournament so all competitions update at once.

Because it rebuilds from all results each time, it is **idempotent and self-catching-up**:

- Miss a few days? One click backfills every matchday you missed.
- Click it again with nothing new? Nothing changes — `config/sweepstake.json` isn't even rewritten, so there's no spurious git diff. Safe to run on a loop/cron.

Get a free API token at [football-data.org/client/register](https://www.football-data.org/client/register) and put it in `.env` as `FOOTBALL_DATA_TOKEN`. After syncing, commit & push `config/sweepstake.json` to refresh the live sites. (The token stays local — it's never needed by the static deploy.)

## 🏟️ Multiple Competitions

Several private competitions can run side by side. They all track the **same World Cup** — the tournament state (teams, results, matchday history) is shared — but each has its own set of contenders and therefore its own standings:

```
config/sweepstake.json                       # shared tournament state — committed (no personal data)
config/competitions/<slug>/.gitkeep          # marks the competition (and its slug) — committed
config/competitions/<slug>/participants.json # this competition's contenders — gitignored
```

A competition exists when its folder exists. To start a new one, create `config/competitions/<your-slug>/` (with a `.gitkeep`) and configure it via the Draft Setup room. Pick non-guessable slugs if the groups shouldn't find each other's pages.

> **Participant privacy:** contender names never go into git. Locally they live in the gitignored `participants.json`; on deploy they come from environment variables (see below).

> **Shared-tournament note:** fetching a matchday or resetting affects the shared tournament, so it updates *every* competition at once. Editing a draft only touches that one competition.

## 🚢 Deployment (Vercel)

The repo deploys as a fully static site via [scripts/build-site.sh](scripts/build-site.sh) and [vercel.json](vercel.json) — works from a **private** repo on Vercel's free Hobby plan. Connect the repo at [vercel.com/new](https://vercel.com/new) (the settings are picked up from `vercel.json`) and every push to `main` publishes one **read-only** copy per competition (admin controls hidden):

```
https://<project>.vercel.app/<slug>/
```

Each group only gets their own URL — the site root is intentionally blank. The matchday workflow stays local: run `npm run dev`, fetch the next matchday (updates the shared tournament), then commit & push the updated `config/sweepstake.json` to refresh every live site.

### Contenders via environment variables

Since `participants.json` is gitignored, each competition's contenders are supplied to the build as an environment variable. In **Vercel → Settings → Environment Variables**, add one per competition:

| Variable | Value |
|---|---|
| `PARTICIPANTS_TEAM` | the JSON array from `config/competitions/team/participants.json` |
| `PARTICIPANTS_GBC_FAMILIA` | the JSON array from `config/competitions/gbc-familia/participants.json` |

The name is `PARTICIPANTS_` + the slug uppercased with `-` → `_`. Paste the file's JSON as the value (minified is fine). At build time the env var wins; if it's absent the build falls back to the local file (so local previews just work). A competition with neither is skipped with a warning.

To preview the deployable site locally: `bash scripts/build-site.sh` then serve the `site/` folder.

### Usage analytics

Uses **Vercel Web Analytics** (cookieless, free on Hobby). Enable it once in **Vercel → your project → Analytics → Enable Web Analytics**. Page views are tracked automatically — and since each competition is its own URL, you get per-competition view counts for free.

Custom events (see [src/analytics.ts](src/analytics.ts)), each tagged with the competition:

| Event | Fires when | Visible where |
|---|---|---|
| `tab_view` | a tab is opened (`standings` / `ladder` / `matches` / `trends`) | live sites |
| `contender_expand` | a contender card is expanded on Standings | live sites |
| `matchday_select` | a day is picked in the Matchday Logbook | live sites |
| `print_view` | print-friendly view is toggled | live sites |
| `sync_results` / `reset_tournament` / `open_draft_setup` | admin actions | local only (admin view isn't deployed) |

Analytics is disabled in local dev (events log to the console instead of being sent), so your own admin clicks don't pollute the data.

## 🛠️ Built With

![React](https://img.shields.io/badge/React_19-0f172a?style=flat-square&logo=react&logoColor=facc15)
![Vite](https://img.shields.io/badge/Vite-0f172a?style=flat-square&logo=vite&logoColor=facc15)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-0f172a?style=flat-square&logo=tailwindcss&logoColor=facc15)
![Express](https://img.shields.io/badge/Express-0f172a?style=flat-square&logo=express&logoColor=facc15)

---

<div align="center">

**💡 Strategy Rulebook:** *Reaching successive knockout rounds completely turns rankings around — never count out a Long Shot.* 🏔️

</div>

## TODO
- How does the win percentage work
- What happens with the rankings.
- Add another fun variant... contenders go up against each other based on the teams they have drafted. Winner gets 3 points, draws are 1 point, and it is shown in a leaderboard, match schedule and matchday results.