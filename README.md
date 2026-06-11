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
- 🤖 **Gemini-powered results** — fetches real World Cup outcomes and writes the matchday roundup
- 🖨️ **Print-friendly view** & 🖼️ **PNG poster export** for sharing the standings
- ⚙️ **Draft Setup room** — configure contenders and their drafted squads

## 🚀 Run Locally

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Set your Gemini API key
cp .env.example .env   # then edit GEMINI_API_KEY

# 3. Kick off
npm run dev            # serves on http://localhost:3000
```

## 🗂️ Data Layout

| Path | Purpose |
|---|---|
| `config/sweepstake.json` | Tournament state — teams, points, matchday history |
| `data/players_setup.json` | Contender draft setup (gitignored) |

## 🛠️ Built With

![React](https://img.shields.io/badge/React_19-0f172a?style=flat-square&logo=react&logoColor=facc15)
![Vite](https://img.shields.io/badge/Vite-0f172a?style=flat-square&logo=vite&logoColor=facc15)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-0f172a?style=flat-square&logo=tailwindcss&logoColor=facc15)
![Express](https://img.shields.io/badge/Express-0f172a?style=flat-square&logo=express&logoColor=facc15)
![Gemini](https://img.shields.io/badge/Gemini_AI-0f172a?style=flat-square&logo=googlegemini&logoColor=facc15)

---

<div align="center">

**💡 Strategy Rulebook:** *Reaching successive knockout rounds completely turns rankings around — never count out a Long Shot.* 🏔️

</div>
