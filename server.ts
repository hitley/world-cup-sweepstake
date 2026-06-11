import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure config and data folders exist
const CONFIG_DIR = path.join(process.cwd(), "config");
const DATA_DIR = path.join(process.cwd(), "data");
for (const dir of [CONFIG_DIR, DATA_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const STATE_FILE = path.join(CONFIG_DIR, "sweepstake.json");
const PLAYERS_FILE = path.join(DATA_DIR, "players_setup.json");

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "MOCK_KEY",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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

interface Participant {
  name: string;
  teams: string[];
  color: string;
}

interface Match {
  teamHome: string;
  teamAway: string;
  scoreHome: number;
  scoreAway: number;
  highlights: string;
  scorers?: string[];
}

interface HistoricalRecord {
  dayIndex: number;
  date: string;
  matches: Match[];
  eliminatedTeams: string[];
  wittyNarrative: string;
  participantStandings: { participant: string; points: number; activeTeamsCount: number; combinedProb: number }[];
}

interface SweepstakeState {
  participants: Participant[];
  teams: typeof INITIAL_TEAMS;
  currentDayIndex: number; // 0 means not started (Eve of Word Cup)
  history: HistoricalRecord[];
}

const DEFAULT_STATE: SweepstakeState = {
  participants: DEFAULT_PARTICIPANTS,
  teams: INITIAL_TEAMS,
  currentDayIndex: 0,
  history: []
};

// Helper to read state
function readState(): SweepstakeState {
  let state: SweepstakeState;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      state = JSON.parse(data);
    } else {
      state = { ...DEFAULT_STATE };
    }
  } catch (error) {
    console.error("Failed to read state file, returning default", error);
    state = { ...DEFAULT_STATE };
  }

  // Fallback/sync to PLAYERS_FILE for participants configuration to guarantee persistent iterations
  try {
    if (fs.existsSync(PLAYERS_FILE)) {
      const data = fs.readFileSync(PLAYERS_FILE, "utf-8");
      const savedParticipants = JSON.parse(data);
      if (Array.isArray(savedParticipants) && savedParticipants.length > 0) {
        state.participants = savedParticipants;
      }
    } else {
      // Bootstrap the backup config
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(state.participants || DEFAULT_PARTICIPANTS, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Failed to sync players configuration backup", error);
  }

  // Automatic programmatic live-upgrade: Migrate any legacy or non-qualifying elements to the correct qualified ones
  let migrationNeeded = false;

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

  if (state.teams) {
    state.teams = state.teams.map(t => {
      if (migrationMap[t.name]) {
        migrationNeeded = true;
        const target = migrationMap[t.name];
        return { ...t, name: target.name, emoji: target.emoji, confed: target.confed, prob: target.prob };
      }
      return t;
    });

    // Deduplicate state.teams in case multiple migrated names collide (e.g. Sweden and Italy both mapping to Norway)
    const seenTeams = new Set<string>();
    const originalCount = state.teams.length;
    state.teams = state.teams.filter(t => {
      if (seenTeams.has(t.name)) {
        migrationNeeded = true;
        return false;
      }
      seenTeams.add(t.name);
      return true;
    });

    // If we filtered out some teams, replenish from INITIAL_TEAMS to always guarantee exactly 48 teams
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

  if (state.participants) {
    state.participants = state.participants.map(p => {
      const updatedTeams = p.teams.map(t => {
        if (migrationMap[t]) {
          migrationNeeded = true;
          return migrationMap[t].name;
        }
        return t;
      });
      // Deduplicate participant's assigned teams just in case
      const uniqueTeams = Array.from(new Set(updatedTeams));
      if (uniqueTeams.length < updatedTeams.length) {
        migrationNeeded = true;
      }
      return { ...p, teams: uniqueTeams };
    });
  }

  if (migrationNeeded) {
    console.log("Migrating state file: Replaced non-qualifying legacy teams with correct 2026 World Cup qualified teams.");
    writeState(state);
    try {
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(state.participants, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write migrated players file:", e);
    }
  }

  return state;
}

// Helper to write state
function writeState(state: SweepstakeState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save state:", err);
  }
}

// Calculate standigs for participants
function getParticipantStandings(participants: Participant[], teams: typeof INITIAL_TEAMS) {
  return participants.map(p => {
    let pts = 0;
    let activeTeamsCount = 0;
    let combinedProb = 0;

    p.teams.forEach(tName => {
      const t = teams.find(team => team.name.toLowerCase() === tName.toLowerCase());
      if (t) {
        pts += t.points;
        combinedProb += t.prob;
        if (t.status === "Active") {
          activeTeamsCount++;
        }
      }
    });

    return {
      participant: p.name,
      points: pts,
      activeTeamsCount,
      combinedProb: parseFloat(combinedProb.toFixed(1))
    };
  }).sort((a, b) => b.points - a.points || b.combinedProb - a.combinedProb);
}

// API Routes

// 1. Get sweepstake current state
app.get("/api/worldcup/state", (req, res) => {
  const state = readState();
  res.json(state);
});

// 2. Reset / Initialize setup (Standings-only Non-Destructive Reset)
app.post("/api/worldcup/reset", (req, res) => {
  // Read current custom state first so we retain players and drafts
  const state = readState();
  
  // Clean resets scores, active states, match histories, and days,
  // but perfectly retains custom players and their assigned draft selections!
  const resetState: SweepstakeState = {
    participants: state.participants && state.participants.length > 0 ? state.participants : DEFAULT_PARTICIPANTS,
    teams: INITIAL_TEAMS.map(t => ({ ...t, points: 0, goalsFor: 0, goalsAgainst: 0, status: "Active" })),
    currentDayIndex: 0,
    history: []
  };
  
  writeState(resetState);
  res.json(resetState);
});

// 3. Update Custom Standings Setup
app.post("/api/worldcup/update-setup", (req, res) => {
  const { participants } = req.body;
  const state = readState();

  if (participants) {
    state.participants = participants;
    // Persist custom setup to players_setup.json as the durable truth
    try {
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(participants, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to backup players file:", err);
    }
  }

  // Recalculate everything with new configurations
  writeState(state);
  res.json(state);
});

// 4. Fetch/Progress World Cup results using Gemini Model
app.post("/api/worldcup/fetch-results", async (req, res) => {
  const state = readState();
  const nextDayIndex = state.currentDayIndex + 1;

  if (nextDayIndex > SCHEDULED_DAYS.length) {
    return res.status(400).json({ error: "The tournament has concluded!" });
  }

  const dayInfo = SCHEDULED_DAYS.find(d => d.dayIndex === nextDayIndex);
  if (!dayInfo) {
    return res.status(500).json({ error: "Day configuration not found" });
  }

  const activeTeams = state.teams.filter(t => t.status === "Active").map(t => t.name);
  const formattedActiveTeams = activeTeams.join(", ");

  // Real-mode behavior (always): use Google search tools to fetch real results where possible
  const prompt = `Search Google for the real results of the 2026 FIFA World Cup on ${dayInfo.date}. 
If no matches were actually played on this day (e.g., if the tournament has not reached this date yet or it is rest day), 
simulate highly sensible and realistic group stage or knockout matches based on realistic FIFA 2026 scheduling.
Include real star players like Mbappé, Messi, Vinicius Jr, etc.

Represent matches involving some of these active teams: [${formattedActiveTeams}].
Only include active teams in matches.

Generate the response strictly as valid JSON conforming to the schema.`;

  try {
    const isMock = process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === "MOCK_KEY";
    let geminiObj;

      if (!isMock) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are the lead narrator and stats statistician of the Ultimate FIFA World Cup 2026 Sweepstake. 
Your goal is to provide highly engaging, funny, and accurate match summaries and update winning probabilities. 
Return the output strictly in JSON according to the schema provided. No conversational markdown wrap outside the JSON.`,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    teamHome: { type: Type.STRING },
                    teamAway: { type: Type.STRING },
                    scoreHome: { type: Type.INTEGER },
                    scoreAway: { type: Type.INTEGER },
                    highlights: { type: Type.STRING, description: "Highly engaging, dramatic, and humorous 1-2 sentence match summary" },
                    scorers: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["teamHome", "teamAway", "scoreHome", "scoreAway", "highlights"]
                }
              },
              eliminatedTeams: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of team names knocked out on this tournament day."
              },
              teamProbabilities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    team: { type: Type.STRING },
                    prob: { type: Type.NUMBER, description: "New tournament success probability (%) (0 to 100). Sum of active teams must equal close to 100%." }
                  },
                  required: ["team", "prob"]
                }
              },
              wittyNarrative: {
                type: Type.STRING,
                description: "A funny and engaging 2-3 sentence podcast style roundup highlighting today's drama."
              }
            },
            required: ["matches", "eliminatedTeams", "teamProbabilities", "wittyNarrative"]
          }
        }
      });

      const bodyText = response.text || "{}";
      geminiObj = JSON.parse(bodyText.trim());
    } else {
      // Return beautiful simulated mock JSON if API key is not ready
      console.log("No Gemini API key or mock flag, generating fallback mock data");
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

      geminiObj = {
        matches: sampleMatches,
        eliminatedTeams: elTeams,
        teamProbabilities: updatedProbs,
        wittyNarrative: `Matchday ${nextDayIndex} provided premium footballing action! Underdogs showed massive character while top seeds ran tactical masterclasses. Standings are shaking up rapidly!`
      };
    }

    // Process & Apply rules to Sweepstake state
    const fetchedMatches = geminiObj.matches || [];
    const eliminatedThisTurn = geminiObj.eliminatedTeams || [];
    const probabilitiesUpdates = geminiObj.teamProbabilities || [];

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

    // 4. Update index and create history record
    state.currentDayIndex = nextDayIndex;
    const currentStandings = getParticipantStandings(state.participants, state.teams);

    const historyRecord: HistoricalRecord = {
      dayIndex: nextDayIndex,
      date: dayInfo.date,
      matches: fetchedMatches,
      eliminatedTeams: eliminatedThisTurn,
      wittyNarrative: geminiObj.wittyNarrative,
      participantStandings: currentStandings
    };

    state.history.push(historyRecord);

    writeState(state);
    res.json(state);

  } catch (error: any) {
    console.error("Gemini sweepstake processing failed:", error);
    res.status(500).json({ error: "Gemini sweepstake generation was interrupted: " + error.message });
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
    // Trigger startup upgrade & data sync
    console.log("Triggering startup players database live-migration sync...");
    readState();
  });
};

startServer();
