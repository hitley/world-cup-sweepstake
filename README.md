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
- 📈 **Performance Trends** — SVG point-progression charts and win-path probability gauges
- 🎲 **Matchday simulation** — generates realistic results, eliminations, and a witty roundup for each tournament day
- 🖨️ **Print-friendly view** & 🖼️ **PNG poster export** for sharing the standings
- ⚙️ **Draft Setup room** — configure contenders and their drafted squads

## 🚀 Run Locally

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Kick off
npm run dev            # serves on http://localhost:3000
```

Opening `http://localhost:3000` shows a competition picker; each competition is managed at `http://localhost:3000/?c=<slug>`.

## 🏟️ Multiple Competitions

The tracker supports several completely independent competitions — separate drafts, standings, and matchday histories. A competition exists when a folder for it exists:

```
config/competitions/<slug>/sweepstake.json   # committed tournament state
data/<slug>/players_setup.json               # gitignored draft setup backup
```

To start a new competition, just create `config/competitions/<your-slug>/` and configure it via the Draft Setup room. Pick non-guessable slugs if the groups shouldn't find each other's pages.

## 🚢 Deployment (Vercel)

The repo deploys as a fully static site via [scripts/build-site.sh](scripts/build-site.sh) and [vercel.json](vercel.json) — works from a **private** repo on Vercel's free Hobby plan. Connect the repo at [vercel.com/new](https://vercel.com/new) (the settings are picked up from `vercel.json`) and every push to `main` publishes one **read-only** copy per competition (admin controls hidden):

```
https://<project>.vercel.app/<slug>/
```

Each group only gets their own URL — the site root is intentionally blank. The matchday workflow stays local: run `npm run dev`, fetch the next matchday for each competition, then commit & push the updated `sweepstake.json` files to refresh the live sites.

To preview the deployable site locally: `bash scripts/build-site.sh` then serve the `site/` folder.

## 🛠️ Built With

![React](https://img.shields.io/badge/React_19-0f172a?style=flat-square&logo=react&logoColor=facc15)
![Vite](https://img.shields.io/badge/Vite-0f172a?style=flat-square&logo=vite&logoColor=facc15)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-0f172a?style=flat-square&logo=tailwindcss&logoColor=facc15)
![Express](https://img.shields.io/badge/Express-0f172a?style=flat-square&logo=express&logoColor=facc15)

---

<div align="center">

**💡 Strategy Rulebook:** *Reaching successive knockout rounds completely turns rankings around — never count out a Long Shot.* 🏔️

</div>
