import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import {
  composeState,
  ParticipantConfig,
  SharedHistoryRecord
} from "./lib/composeState";
import { loadParticipants, participantsFile, envVarNameForSlug } from "./lib/loadParticipants";
import { fetchAllMatches, GroupFixture } from "./lib/footballData";
import { replayTournament } from "./lib/replayTournament";

// Load .env (gitignored) for local secrets like FOOTBALL_DATA_TOKEN. Minimal
// and dependency-free: KEY=value lines, # comments, optional surrounding quotes.
function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

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
const BASE_TEAMS = [
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

// Canonical seed: every team carries a zeroed XP breakdown so all persisted
// states (default, reset, replayed) share one shape.
const INITIAL_TEAMS = BASE_TEAMS.map(t => ({
  ...t,
  wins: 0,
  draws: 0,
  cleanSheets: 0,
  goalPoints: 0,
  bonusPoints: 0
}));

const DEFAULT_PARTICIPANTS = [
  { name: "Hitesh Bechar", teams: ["Brazil", "USA", "Croatia", "Australia", "Germany", "Austria", "Algeria", "Iraq"], color: "#f59e0b" },
  { name: "Chloe", teams: ["Argentina", "Netherlands", "Japan", "Switzerland", "IR Iran", "Paraguay", "Tunisia", "Jordan"], color: "#10b981" },
  { name: "Alex", teams: ["France", "Portugal", "Senegal", "Canada", "Ecuador", "Türkiye", "Egypt", "Qatar"], color: "#3b82f6" },
  { name: "Sarah", teams: ["England", "Uruguay", "Bosnia and Herzegovina", "Czechia", "Scotland", "Sweden", "South Africa", "Uzbekistan"], color: "#ec4899" },
  { name: "Mateo", teams: ["Norway", "Belgium", "Mexico", "Cabo Verde", "Colombia", "Congo DR", "Ghana", "New Zealand"], color: "#8b5cf6" },
  { name: "Yuki", teams: ["Spain", "Morocco", "Korea Republic (South Korea)", "Saudi Arabia", "Curaçao", "Côte d'Ivoire", "Panama", "Haiti"], color: "#14b8a6" }
];




// The shared tournament state (config/sweepstake.json): identical for every
// competition. History records carry a per-team snapshot so each competition's
// standings can be derived for any day from its own participants.
interface SharedTournamentState {
  teams: typeof INITIAL_TEAMS;
  currentDayIndex: number; // 0 means not started (Eve of World Cup)
  history: SharedHistoryRecord[];
  groupFixtures: GroupFixture[]; // group-stage fixtures for the Head-to-Head game
}

const DEFAULT_SHARED_STATE: SharedTournamentState = {
  teams: INITIAL_TEAMS,
  currentDayIndex: 0,
  history: [],
  groupFixtures: []
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
    history: [],
    groupFixtures: []
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

// 4. Sync the shared tournament to real results from football-data.org. This
// recomputes the whole tournament from every finished match, so it is
// idempotent (re-running changes nothing) and catches up any missed days in
// one call. Shared, so it updates all competitions at once.
app.post("/api/:comp/worldcup/fetch-results", async (req, res) => {
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) {
    return res.status(400).json({ error: "No FOOTBALL_DATA_TOKEN configured. Add a football-data.org API token to .env to fetch real results." });
  }

  let parsed;
  try {
    parsed = await fetchAllMatches(token, INITIAL_TEAMS.map(t => t.name));
  } catch (e: any) {
    return res.status(502).json({ error: `Could not reach football-data.org: ${e.message}` });
  }

  if (parsed.unmapped.length > 0) {
    console.warn(`Unmapped team names from football-data.org: ${parsed.unmapped.join(", ")}`);
  }

  if (parsed.finished === 0) {
    const detail = parsed.totalReturned > 0
      ? "Fixtures are scheduled but none have finished yet."
      : "No fixtures found for the competition yet.";
    return res.status(400).json({ error: `No finished World Cup matches to sync. ${detail}` });
  }

  // Rebuild the entire tournament from scratch (idempotent)
  const replay = replayTournament(INITIAL_TEAMS, parsed.matches);
  const newState: SharedTournamentState = {
    teams: replay.teams as typeof INITIAL_TEAMS,
    currentDayIndex: replay.currentDayIndex,
    history: replay.history,
    groupFixtures: parsed.groupFixtures
  };

  // Only persist when something actually changed, so re-running produces no
  // spurious git diff on config/sweepstake.json.
  const previous = readSharedState();
  const changed = JSON.stringify(previous) !== JSON.stringify(newState);
  if (changed) {
    writeSharedState(newState);
    console.log(`Synced tournament: ${newState.currentDayIndex} matchday(s) processed (was ${previous.currentDayIndex}).`);
  } else {
    console.log("Tournament already up to date — no changes.");
  }

  res.json(composeState(newState, readParticipants(req.params.comp)));
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
