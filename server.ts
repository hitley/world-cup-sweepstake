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
import { fetchAllMatches, GroupFixture, KnockoutFixture } from "./lib/footballData";
import { replayTournament } from "./lib/replayTournament";
import { INITIAL_TEAMS } from "./lib/baseTeams";
import { tournamentFiles, readJsonFile, writeJsonIfChanged } from "./lib/tournamentFiles";

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
// competitions and lives in config/sweepstake.json, with the schedule data split
// into sibling files (config/groupFixtures.json + config/knockout.json). Each
// competition only owns its participants, in
// config/competitions/<slug>/participants.json. A competition exists iff its
// config folder exists.
const FILES = tournamentFiles();
const SHARED_STATE_FILE = FILES.core;
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

// The canonical 48-team seed (INITIAL_TEAMS) lives in lib/baseTeams.ts so the
// server, the headless sync and scripts all reseed replays identically.

const DEFAULT_PARTICIPANTS = [
  { name: "Hitesh Bechar", teams: ["Brazil", "USA", "Croatia", "Australia", "Germany", "Austria", "Algeria", "Iraq"], color: "#f59e0b" },
  { name: "Chloe", teams: ["Argentina", "Netherlands", "Japan", "Switzerland", "IR Iran", "Paraguay", "Tunisia", "Jordan"], color: "#10b981" },
  { name: "Alex", teams: ["France", "Portugal", "Senegal", "Canada", "Ecuador", "Türkiye", "Egypt", "Qatar"], color: "#3b82f6" },
  { name: "Sarah", teams: ["England", "Uruguay", "Bosnia and Herzegovina", "Czechia", "Scotland", "Sweden", "South Africa", "Uzbekistan"], color: "#ec4899" },
  { name: "Mateo", teams: ["Norway", "Belgium", "Mexico", "Cabo Verde", "Colombia", "Congo DR", "Ghana", "New Zealand"], color: "#8b5cf6" },
  { name: "Yuki", teams: ["Spain", "Morocco", "Korea Republic (South Korea)", "Saudi Arabia", "Curaçao", "Côte d'Ivoire", "Panama", "Haiti"], color: "#14b8a6" }
];




// The core shared tournament state (config/sweepstake.json): identical for every
// competition. History records carry a per-team snapshot so each competition's
// standings can be derived for any day from its own participants. The schedule
// data (group + knockout fixtures) lives in sibling files; see readGroupFixtures
// / readKnockout below.
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
    writeJsonIfChanged(SHARED_STATE_FILE, state);
  } catch (err) {
    console.error("Failed to save shared state:", err);
  }
}

// Schedule data lives in its own files, shared across competitions and served to
// the frontend separately (it carries no participant data).
function readGroupFixtures(): GroupFixture[] {
  return readJsonFile<GroupFixture[]>(FILES.groupFixtures, []);
}

function readKnockout(): KnockoutFixture[] {
  return readJsonFile<KnockoutFixture[]>(FILES.knockout, []);
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

// Shared schedule data — identical for every competition and carrying no
// participant data, so it is served from standalone endpoints (mirrored by the
// static build's site-root groupFixtures.json / knockout.json files).
app.get("/api/groupFixtures", (req, res) => res.json(readGroupFixtures()));
app.get("/api/knockout", (req, res) => res.json(readKnockout()));

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
  writeJsonIfChanged(FILES.groupFixtures, []);
  writeJsonIfChanged(FILES.knockout, []);
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
  const previousDay = readSharedState().currentDayIndex;
  const replay = replayTournament(INITIAL_TEAMS, parsed.matches, parsed.knockoutFixtures);
  const newState: SharedTournamentState = {
    teams: replay.teams as typeof INITIAL_TEAMS,
    currentDayIndex: replay.currentDayIndex,
    history: replay.history
  };

  // Persist each file only when its content changed, so re-running produces no
  // spurious git diff (the group fixtures stop changing once groups are done).
  const changed = [
    writeJsonIfChanged(SHARED_STATE_FILE, newState) && "sweepstake.json",
    writeJsonIfChanged(FILES.groupFixtures, parsed.groupFixtures) && "groupFixtures.json",
    writeJsonIfChanged(FILES.knockout, parsed.knockoutFixtures) && "knockout.json"
  ].filter(Boolean);
  if (changed.length) {
    console.log(`Synced tournament: day ${newState.currentDayIndex} (was ${previousDay}). Updated: ${changed.join(", ")}.`);
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
