// Headless results sync — the same recompute the "Sync Latest Results" button
// does, runnable without the UI or Express server. Reads config/sweepstake.json
// for the team list, fetches all finished matches from football-data.org,
// replays the tournament from scratch (idempotent), and writes the file back
// only when something changed. Used by the nightly job and `npm run sync`.
import fs from "fs";
import path from "path";
import { fetchAllMatches } from "../lib/footballData";
import { replayTournament, ReplayTeam } from "../lib/replayTournament";

const STATE_FILE = path.join(process.cwd(), "config", "sweepstake.json");

// Minimal .env loader (dependency-free) so FOOTBALL_DATA_TOKEN is available.
function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadDotEnv();
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) {
    console.error("No FOOTBALL_DATA_TOKEN — add it to .env to sync real results.");
    process.exit(1);
  }
  if (!fs.existsSync(STATE_FILE)) {
    console.error(`Missing ${STATE_FILE}`);
    process.exit(1);
  }

  const prev = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  const seedTeams: ReplayTeam[] = prev.teams; // 48 team identities; replay zeroes them

  let parsed;
  try {
    parsed = await fetchAllMatches(token, seedTeams.map(t => t.name));
  } catch (e: any) {
    console.error("Could not reach football-data.org:", e.message);
    process.exit(1);
  }

  if (parsed.unmapped.length > 0) {
    console.warn("Unmapped team names from football-data.org:", parsed.unmapped.join(", "));
  }

  const replay = replayTournament(seedTeams, parsed.matches);
  const next = {
    teams: replay.teams,
    currentDayIndex: replay.currentDayIndex,
    history: replay.history,
    groupFixtures: parsed.groupFixtures
  };

  // Idempotent: only write when the data actually changed (no spurious diffs)
  const nextJson = JSON.stringify(next, null, 2);
  const prevJson = JSON.stringify(prev, null, 2);
  if (nextJson === prevJson) {
    console.log(`Already up to date — day ${next.currentDayIndex}, no changes.`);
    return;
  }

  fs.writeFileSync(STATE_FILE, nextJson + "\n", "utf-8");
  console.log(`Synced: day ${next.currentDayIndex}, ${parsed.finished} finished matches, ${next.groupFixtures.length} group fixtures.`);
}

main();
