import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import {
  composeState,
  snapshotFromTeams,
  ParticipantConfig,
  SharedHistoryRecord
} from "./lib/composeState";
import { loadParticipants, participantsFile, envVarNameForSlug } from "./lib/loadParticipants";

const app = express();
const PORT = 3000;

app.use(express.json());

// Storage: the tournament itself (teams, matchdays, history) is shared by all
// competitions and lives in config/sweepstake.json. Each competition only owns
// its participants, in config/competitions/<slug>/participants.json. A
// competition exists iff its config folder exists.
const SHARED_STATE_FILE = path.join(process.cwd(), "config", "sweepstake.json");
const COMPETITIONS_DIR = path.join(process.cwd(), "config", "competitions");
if (!fs.existsSync(COMPETITIONS_DIR)) {
  fs.mkdirSync(COMPETITIONS_DIR, { recursive: true });
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function listCompetitions(): string[] {
  return fs.readdirSync(COMPETITIONS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && SLUG_PATTERN.test(e.name))
    .map(e => e.name)
    .sort();
}

function isValidCompetition(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && fs.existsSync(path.join(COMPETITIONS_DIR, slug));
}

function writeFileEnsuringDir(file: string, contents: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf-8");
}

// Setup Initial Teams for 2026 World Cup (48 teams)
const INITIAL_TEAMS = [
  { name: "Brazil", emoji: "🇧🇷", confed: "CONMEBOL", prob: 10.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "France", emoji: "🇫🇷", confed: "UEFA", prob: 9.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Argentina", emoji: "🇦🇷", confed: "CONMEBOL", prob: 8.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confed: "UEFA", prob: 7.6, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Spain", emoji: "🇪🇸", confed: "UEFA", prob: 7.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Germany", emoji: "🇩🇪", confed: "UEFA", prob: 6.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Portugal", emoji: "🇵🇹", confed: "UEFA", prob: 5.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Netherlands", emoji: "🇳🇱", confed: "UEFA", prob: 4.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Norway", emoji: "🇳🇴", confed: "UEFA", prob: 4.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Belgium", emoji: "🇧🇪", confed: "UEFA", prob: 3.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Croatia", emoji: "🇭🇷", confed: "UEFA", prob: 3.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Uruguay", emoji: "🇺🇾", confed: "CONMEBOL", prob: 3.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Colombia", emoji: "🇨🇴", confed: "CONMEBOL", prob: 2.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Morocco", emoji: "🇲🇦", confed: "CAF", prob: 2.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "USA", emoji: "🇺🇸", confed: "CONCACAF", prob: 1.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Senegal", emoji: "🇸🇳", confed: "CAF", prob: 1.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Japan", emoji: "🇯🇵", confed: "AFC", prob: 1.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Korea Republic (South Korea)", emoji: "🇰🇷", confed: "AFC", prob: 1.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Mexico", emoji: "🇲🇽", confed: "CONCACAF", prob: 1.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Sweden", emoji: "🇸🇪", confed: "UEFA", prob: 1.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Switzerland", emoji: "🇨🇭", confed: "UEFA", prob: 1.1, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Ecuador", emoji: "🇪🇨", confed: "CONMEBOL", prob: 1.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Canada", emoji: "🇨🇦", confed: "CONCACAF", prob: 0.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "IR Iran", emoji: "🇮🇷", confed: "AFC", prob: 0.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Saudi Arabia", emoji: "🇸🇦", confed: "AFC", prob: 0.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Austria", emoji: "🇦🇹", confed: "UEFA", prob: 0.7, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Türkiye", emoji: "🇹🇷", confed: "UEFA", prob: 0.7, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Paraguay", emoji: "🇵🇾", confed: "CONMEBOL", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Algeria", emoji: "🇩🇿", confed: "CAF", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Egypt", emoji: "🇪🇬", confed: "CAF", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Côte d'Ivoire", emoji: "🇨🇮", confed: "CAF", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Ghana", emoji: "🇬🇭", confed: "CAF", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Tunisia", emoji: "🇹🇳", confed: "CAF", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Australia", emoji: "🇦🇺", confed: "AFC", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Panama", emoji: "🇵🇦", confed: "CONCACAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "South Africa", emoji: "🇿🇦", confed: "CAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Qatar", emoji: "🇶🇦", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Uzbekistan", emoji: "🇺🇿", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Iraq", emoji: "🇮🇶", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Jordan", emoji: "🇯🇴", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "New Zealand", emoji: "🇳🇿", confed: "OFC", prob: 0.1, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Bosnia and Herzegovina", emoji: "🇧🇦", confed: "UEFA", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Cabo Verde", emoji: "🇨🇻", confed: "CAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Congo DR", emoji: "🇨🇩", confed: "CAF", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Curaçao", emoji: "🇨🇼", confed: "CONCACAF", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Czechia", emoji: "🇨🇿", confed: "UEFA", prob: 0.6, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Haiti", emoji: "🇭🇹", confed: "CONCACAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confed: "UEFA", prob: 0.6, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 }
];

const DEFAULT_PARTICIPANTS = [
  { name: "Hitesh Bechar", teams: ["Brazil", "USA", "Croatia", "Australia", "Germany", "Austria", "Algeria", "Iraq"], color: "#f59e0b" },
  { name: "Chloe", teams: ["Argentina", "Netherlands", "Japan", "Switzerland", "IR Iran", "Paraguay", "Tunisia", "Jordan"], color: "#10b981" },
  { name: "Alex", teams: ["France", "Portugal", "Senegal", "Canada", "Ecuador", "Türkiye", "Egypt", "Qatar"], color: "#3b82f6" },
  { name: "Sarah", teams: ["England", "Uruguay", "Bosnia and Herzegovina", "Czechia", "Scotland", "Sweden", "South Africa", "Uzbekistan"], color: "#ec4899" },
  { name: "Mateo", teams: ["Norway", "Belgium", "Mexico", "Cabo Verde", "Colombia", "Congo DR", "Ghana", "New Zealand"], color: "#8b5cf6" },
  { name: "Yuki", teams: ["Spain", "Morocco", "Korea Republic (South Korea)", "Saudi Arabia", "Curaçao", "Côte d'Ivoire", "Panama", "Haiti"], color: "#14b8a6" }
];

const SCHEDULED_DAYS = [
  { dayIndex: 1, date: "June 11, 2026", description: "Opening Matchday & Host Celebrations" },
  { dayIndex: 2, date: "June 12, 2026", description: "Group Stages - High-Octane Clashes" },
  { dayIndex: 3, date: "June 13, 2026", description: "Group Stages - Underdog Showdowns" },
  { dayIndex: 4, date: "June 14, 2026", description: "Group Stages - Battle of the Continents" },
  { dayIndex: 5, date: "June 15, 2026", description: "Group Stages - Golden Boot Contender Entrances" },
  { dayIndex: 6, date: "June 16, 2026", description: "Group Stages - Midpoint Crucial Deciders" },
  { dayIndex: 7, date: "June 17, 2026", description: "Group Stages - Tension Peak" },
  { dayIndex: 8, date: "June 18, 2026", description: "Group Stages - Mid-tier Desperation" },
  { dayIndex: 9, date: "June 19, 2026", description: "Group Stages - Heavyweight Showdowns" },
  { dayIndex: 10, date: "June 20, 2026", description: "Group Stages - Final Round Begins" },
  { dayIndex: 11, date: "June 21, 2026", description: "Group Stages - Sudden Death Deciders" },
  { dayIndex: 12, date: "June 22, 2026", description: "Group Stages - Qualification Miracles" },
  { dayIndex: 13, date: "June 23, 2026", description: "Group Stages - Squeezing Into Knockouts" },
  { dayIndex: 14, date: "June 24, 2026", description: "Group Stages - Final Group Concluding Day" },
  { dayIndex: 15, date: "June 27, 2026", description: "Round of 32 - Knockout Warfare Starts" },
  { dayIndex: 16, date: "June 28, 2026", description: "Round of 32 - Underdog Elimination Drama" },
  { dayIndex: 17, date: "June 29, 2026", description: "Round of 32 - The Penalty Shootout Fiasco" },
  { dayIndex: 18, date: "June 30, 2026", description: "Round of 32 - Giants Collide early" },
  { dayIndex: 19, date: "July 01, 2026", description: "Round of 32 - Last Stand of the Hosts" },
  { dayIndex: 20, date: "July 02, 2026", description: "Round of 32 - Bracket Wraps up" },
  { dayIndex: 21, date: "July 04, 2026", description: "Round of 16 - High-Stakes Knockouts" },
  { dayIndex: 22, date: "July 05, 2026", description: "Round of 16 - Epic Rivalry Matches" },
  { dayIndex: 23, date: "July 06, 2026", description: "Round of 16 - Squeezed to the Brink" },
  { dayIndex: 24, date: "July 07, 2026", description: "Round of 16 - Core Quarterfinalists Decided" },
  { dayIndex: 25, date: "July 10, 2026", description: "Quarter-Finals - Best of the Best" },
  { dayIndex: 26, date: "July 11, 2026", description: "Quarter-Finals - Last Underdog Alive" },
  { dayIndex: 27, date: "July 14, 2026", description: "Semi-Finals - The Gate to Glory Part I" },
  { dayIndex: 28, date: "July 15, 2026", description: "Semi-Finals - The Gate to Glory Part II" },
  { dayIndex: 29, date: "July 18, 2026", description: "Third Place Playoff - Heartbroken Consolation" },
  { dayIndex: 30, date: "July 19, 2026", description: "World Cup Grand Final - World Sovereignty" }
];

interface Match {
  teamHome: string;
  teamAway: string;
  scoreHome: number;
  scoreAway: number;
  highlights: string;
  scorers?: string[];
}

// The shared tournament state (config/sweepstake.json): identical for every
// competition. History records carry a per-team snapshot so each competition's
// standings can be derived for any day from its own participants.
interface SharedTournamentState {
  teams: typeof INITIAL_TEAMS;
  currentDayIndex: number; // 0 means not started (Eve of World Cup)
  history: SharedHistoryRecord[];
}

const DEFAULT_SHARED_STATE: SharedTournamentState = {
  teams: INITIAL_TEAMS,
  currentDayIndex: 0,
  history: []
};

// Legacy/non-qualifying team names → correct 2026 qualified teams
const migrationMap: Record<string, { name: string; emoji: string; confed: string; prob: number }> = {
  "Iran": { name: "IR Iran", emoji: "🇮🇷", confed: "AFC", prob: 0.8 },
  "South Korea": { name: "Korea Republic (South Korea)", emoji: "🇰🇷", confed: "AFC", prob: 1.2 },
  "Turkey": { name: "Türkiye", emoji: "🇹🇷", confed: "UEFA", prob: 0.7 },
  "Ivory Coast": { name: "Côte d'Ivoire", emoji: "🇨🇮", confed: "CAF", prob: 0.5 },
  "Italy": { name: "Bosnia and Herzegovina", emoji: "🇧🇦", confed: "UEFA", prob: 0.5 },
  "Denmark": { name: "Czechia", emoji: "🇨🇿", confed: "UEFA", prob: 0.6 },
  "Slovakia": { name: "Czechia", emoji: "🇨🇿", confed: "UEFA", prob: 0.6 },
  "Nigeria": { name: "Cabo Verde", emoji: "🇨🇻", confed: "CAF", prob: 0.3 },
  "Comoros": { name: "Cabo Verde", emoji: "🇨🇻", confed: "CAF", prob: 0.3 },
  "Ukraine": { name: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confed: "UEFA", prob: 0.6 },
  "Slovenia": { name: "Czechia", emoji: "🇨🇿", confed: "UEFA", prob: 0.6 },
  "Serbia": { name: "Sweden", emoji: "🇸🇪", confed: "UEFA", prob: 1.2 },
  "Poland": { name: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confed: "UEFA", prob: 0.6 },
  "Cameroon": { name: "Congo DR", emoji: "🇨🇩", confed: "CAF", prob: 0.4 },
  "Costa Rica": { name: "Haiti", emoji: "🇭🇹", confed: "CONCACAF", prob: 0.3 },
  "Venezuela": { name: "Congo DR", emoji: "🇨🇩", confed: "CAF", prob: 0.4 }
};

// Helper to read the shared tournament state (migrating legacy teams in place)
function readSharedState(): SharedTournamentState {
  let state: SharedTournamentState;
  try {
    if (fs.existsSync(SHARED_STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(SHARED_STATE_FILE, "utf-8"));
    } else {
      state = { ...DEFAULT_SHARED_STATE };
    }
  } catch (error) {
    console.error("Failed to read shared state file, returning default", error);
    state = { ...DEFAULT_SHARED_STATE };
  }

  let migrationNeeded = false;

  if (state.teams) {
    state.teams = state.teams.map(t => {
      if (migrationMap[t.name]) {
        migrationNeeded = true;
        const target = migrationMap[t.name];
        return { ...t, name: target.name, emoji: target.emoji, confed: target.confed, prob: target.prob };
      }
      return t;
    });

    // Deduplicate in case multiple migrated names collide
    const seenTeams = new Set<string>();
    state.teams = state.teams.filter(t => {
      if (seenTeams.has(t.name)) {
        migrationNeeded = true;
        return false;
      }
      seenTeams.add(t.name);
      return true;
    });

    // Always guarantee exactly 48 teams
    if (state.teams.length < 48) {
      migrationNeeded = true;
      const existingNames = new Set(state.teams.map(t => t.name));
      for (const t of INITIAL_TEAMS) {
        if (!existingNames.has(t.name)) {
          state.teams.push({ ...t });
          existingNames.add(t.name);
        }
        if (state.teams.length === 48) break;
      }
    }
  }

  if (migrationNeeded) {
    console.log("Migrating shared state: Replaced non-qualifying legacy teams with correct 2026 World Cup qualified teams.");
    writeSharedState(state);
  }

  return state;
}

function writeSharedState(state: SharedTournamentState) {
  try {
    writeFileEnsuringDir(SHARED_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Failed to save shared state:", err);
  }
}

// Helper to read a competition's participants (migrating legacy team names).
// Source is an env var (deploys) or the local gitignored file (dev); see
// lib/loadParticipants.ts.
function readParticipants(comp: string): ParticipantConfig[] {
  const fileBacked = !process.env[envVarNameForSlug(comp)]?.trim();
  let participants = loadParticipants(comp);

  if (!participants) {
    // No env var and no file → bootstrap a local file with the defaults (dev)
    participants = DEFAULT_PARTICIPANTS;
    writeParticipants(comp, participants);
  }

  let migrationNeeded = false;
  participants = participants.map(p => {
    const updatedTeams = p.teams.map(t => {
      if (migrationMap[t]) {
        migrationNeeded = true;
        return migrationMap[t].name;
      }
      return t;
    });
    const uniqueTeams = Array.from(new Set(updatedTeams));
    if (uniqueTeams.length < updatedTeams.length) migrationNeeded = true;
    return { ...p, teams: uniqueTeams };
  });

  // Only persist migrations when we're backed by a writable local file
  if (migrationNeeded && fileBacked) {
    console.log(`Migrating participants for "${comp}": updated legacy team names.`);
    writeParticipants(comp, participants);
  }

  return participants;
}

function writeParticipants(comp: string, participants: ParticipantConfig[]) {
  try {
    writeFileEnsuringDir(participantsFile(comp), JSON.stringify(participants, null, 2));
  } catch (err) {
    console.error("Failed to save participants:", err);
  }
}

// Read a competition's full state (shared tournament + its participants),
// shaped the way the frontend expects
function readState(comp: string) {
  return composeState(readSharedState(), readParticipants(comp));
}

// API Routes

// 0. List available competitions (used by the local admin picker)
app.get("/api/competitions", (req, res) => {
  res.json(listCompetitions());
});

// Guard all competition-scoped routes against unknown/malformed slugs
app.use("/api/:comp/worldcup", (req, res, next) => {
  if (!isValidCompetition(req.params.comp)) {
    return res.status(404).json({ error: `Unknown competition "${req.params.comp}"` });
  }
  next();
});

// 1. Get sweepstake current state
app.get("/api/:comp/worldcup/state", (req, res) => {
  const state = readState(req.params.comp);
  res.json(state);
});

// 2. Reset / Initialize tournament. The tournament is shared, so this resets
// standings for EVERY competition; each competition's participants are retained.
app.post("/api/:comp/worldcup/reset", (req, res) => {
  const resetState: SharedTournamentState = {
    teams: INITIAL_TEAMS.map(t => ({ ...t, points: 0, goalsFor: 0, goalsAgainst: 0, status: "Active" })),
    currentDayIndex: 0,
    history: []
  };

  writeSharedState(resetState);
  res.json(composeState(resetState, readParticipants(req.params.comp)));
});

// 3. Update this competition's participants (draft setup)
app.post("/api/:comp/worldcup/update-setup", (req, res) => {
  const comp = req.params.comp;
  const { participants } = req.body;

  if (participants) {
    writeParticipants(comp, participants);
  }

  res.json(composeState(readSharedState(), readParticipants(comp)));
});

// 4. Simulate and progress to the next World Cup matchday. Operates on the
// shared tournament, so the new matchday lands for all competitions at once.
app.post("/api/:comp/worldcup/fetch-results", async (req, res) => {
  const state = readSharedState();
  const nextDayIndex = state.currentDayIndex + 1;

  if (nextDayIndex > SCHEDULED_DAYS.length) {
    return res.status(400).json({ error: "The tournament has concluded!" });
  }

  const dayInfo = SCHEDULED_DAYS.find(d => d.dayIndex === nextDayIndex);
  if (!dayInfo) {
    return res.status(500).json({ error: "Day configuration not found" });
  }

  const activeTeams = state.teams.filter(t => t.status === "Active").map(t => t.name);

  try {
    // Simulate the matchday outcomes
    const sampleMatches: Match[] = [];
    const numMatches = Math.floor(Math.random() * 2) + 2; // 2-3 matches
    const shuffledActive = [...activeTeams].sort(() => 0.5 - Math.random());
    
    const elTeams: string[] = [];
    
    for (let i = 0; i < numMatches && shuffledActive.length >= 2; i++) {
      const home = shuffledActive.pop()!;
      const away = shuffledActive.pop()!;
      const sh = Math.floor(Math.random() * 4);
      const sa = Math.floor(Math.random() * 4);
      
      let hl = `Matchday excitement between ${home} and ${away}! `;
      if (sh > sa) {
        hl += `${home} secures a sensational tactical advantage with some beautiful tiki-taka action.`;
      } else if (sa > sh) {
        hl += `${away} clinches a late shock-winner leaving fans absolutely ecstatic!`;
      } else {
        hl += `A hard-fought battle ends in a draw that keeps both fan camps on the edge of their seats.`;
      }
      
      sampleMatches.push({
        teamHome: home,
        teamAway: away,
        scoreHome: sh,
        scoreAway: sa,
        highlights: hl,
        scorers: [`Scorer A (${10+Math.floor(Math.random()*70)}')`, `Scorer B (${20+Math.floor(Math.random()*60)}')`]
      });

      // Knockout phase could eliminate one team
      if (nextDayIndex >= 15) {
        const loser = sh >= sa ? away : home;
        elTeams.push(loser);
      }
    }

    // Readjust probabilities
    const updatedProbs = state.teams.map(t => {
      let p = t.prob;
      if (elTeams.includes(t.name)) {
        p = 0;
      } else if (t.status === "Active") {
        p = t.prob + (Math.random() * 2 - 0.5);
        if (p < 0.5) p = 0.5;
      }
      return { team: t.name, prob: parseFloat(p.toFixed(1)) };
    });

    const simulatedDay = {
      matches: sampleMatches,
      eliminatedTeams: elTeams,
      teamProbabilities: updatedProbs,
      wittyNarrative: `Matchday ${nextDayIndex} provided premium footballing action! Underdogs showed massive character while top seeds ran tactical masterclasses. Standings are shaking up rapidly!`
    };

    // Process & Apply rules to Sweepstake state
    const fetchedMatches = simulatedDay.matches || [];
    const eliminatedThisTurn = simulatedDay.eliminatedTeams || [];
    const probabilitiesUpdates = simulatedDay.teamProbabilities || [];

    // 1. Update Game/Goal Stats and Points
    fetchedMatches.forEach((m: Match) => {
      const homeTeam = state.teams.find(t => t.name.toLowerCase() === m.teamHome.toLowerCase());
      const awayTeam = state.teams.find(t => t.name.toLowerCase() === m.teamAway.toLowerCase());

      if (homeTeam && awayTeam) {
        homeTeam.goalsFor += m.scoreHome;
        homeTeam.goalsAgainst += m.scoreAway;
        awayTeam.goalsFor += m.scoreAway;
        awayTeam.goalsAgainst += m.scoreHome;

        // Base points awarding
        if (m.scoreHome > m.scoreAway) {
          homeTeam.points += 3; // Win
        } else if (m.scoreAway > m.scoreHome) {
          awayTeam.points += 3; // Win
        } else {
          homeTeam.points += 1; // Draw
          awayTeam.points += 1; // Draw
        }

        // Gamified point rule: bonus for clean sheets
        if (m.scoreAway === 0) homeTeam.points += 2;
        if (m.scoreHome === 0) awayTeam.points += 2;

        // Goal bonus (max +3 points for goals scored to prevent anomalous blowouts)
        homeTeam.points += Math.min(3, m.scoreHome);
        awayTeam.points += Math.min(3, m.scoreAway);
      }
    });

    // 2. Process Knockout qualifications and elimination status
    eliminatedThisTurn.forEach((elimName: string) => {
      const teamInstance = state.teams.find(t => t.name.toLowerCase() === elimName.toLowerCase());
      if (teamInstance) {
        teamInstance.status = "Eliminated";
        teamInstance.prob = 0;
      }
    });

    // 3. Apply baseline/survival updates
    probabilitiesUpdates.forEach((up: { team: string; prob: number }) => {
      const teamInstance = state.teams.find(t => t.name.toLowerCase() === up.team.toLowerCase());
      if (teamInstance) {
        if (teamInstance.status === "Eliminated") {
          teamInstance.prob = 0;
        } else {
          teamInstance.prob = up.prob;
        }
      }
    });

    // Award bonus points for advancing in rounds (to active teams)
    if (nextDayIndex === 15) { // R32 enters
      state.teams.forEach(t => { if (t.status === "Active") t.points += 5; });
    } else if (nextDayIndex === 21) { // R16 enters
      state.teams.forEach(t => { if (t.status === "Active") t.points += 10; });
    } else if (nextDayIndex === 25) { // QF enters
      state.teams.forEach(t => { if (t.status === "Active") t.points += 15; });
    } else if (nextDayIndex === 27) { // SF enters
      state.teams.forEach(t => { if (t.status === "Active") t.points += 20; });
    } else if (nextDayIndex === 30) { // Final enters & winner
      // Final has concluded! Locate champion
      let championName = "";
      const lastFinalMatch = fetchedMatches[0]; // assuming final match is matches[0] on final day
      if (lastFinalMatch) {
         championName = lastFinalMatch.scoreHome > lastFinalMatch.scoreAway ? lastFinalMatch.teamHome : lastFinalMatch.teamAway;
         const champTeam = state.teams.find(t => t.name.toLowerCase() === championName.toLowerCase());
         if (champTeam) {
           champTeam.points += 50; // Mass champion boost
           // Also make everyone else prob = 0, champion prob = 100
           state.teams.forEach(t => { t.prob = t.name.toLowerCase() === championName.toLowerCase() ? 100 : 0; });
         }
      }
    }

    // 4. Update index and create history record. We store a per-team snapshot
    // so any competition can derive its own standings for this day.
    state.currentDayIndex = nextDayIndex;

    const historyRecord: SharedHistoryRecord = {
      dayIndex: nextDayIndex,
      date: dayInfo.date,
      matches: fetchedMatches,
      eliminatedTeams: eliminatedThisTurn,
      wittyNarrative: simulatedDay.wittyNarrative,
      teamSnapshot: snapshotFromTeams(state.teams)
    };

    state.history.push(historyRecord);

    writeSharedState(state);
    res.json(composeState(state, readParticipants(req.params.comp)));

  } catch (error: any) {
    console.error("Matchday processing failed:", error);
    res.status(500).json({ error: "Matchday simulation was interrupted: " + error.message });
  }
});

// Setup dev server or static serving
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server runs on http://localhost:${PORT}`);
    // Trigger startup upgrade & data sync for every competition
    console.log("Triggering startup players database live-migration sync...");
    listCompetitions().forEach(comp => readState(comp));
  });
};

startServer();
