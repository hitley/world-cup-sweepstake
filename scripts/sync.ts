// Headless results sync — the same recompute the "Sync Latest Results" button
// does, runnable without the UI or Express server. Reads config/sweepstake.json
// for the team list, fetches all finished matches from football-data.org,
// replays the tournament from scratch (idempotent), and writes the split store
// (sweepstake.json + groupFixtures.json + knockout.json) back, each file only
// when its content changed. Used by the nightly job and `npm run sync`.
import fs from "fs";
import path from "path";
import { fetchAllMatches } from "../lib/footballData";
import { replayTournament, ReplayTeam } from "../lib/replayTournament";
import { INITIAL_TEAMS } from "../lib/baseTeams";
import { tournamentFiles, writeJsonIfChanged } from "../lib/tournamentFiles";

const FILES = tournamentFiles();
const STATE_FILE = FILES.core;

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

  // Reseed from the canonical constant (not the mutated config) so the replay's
  // immutable strengths never drift and the recompute stays idempotent.
  const seedTeams: ReplayTeam[] = INITIAL_TEAMS;

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

  const replay = replayTournament(seedTeams, parsed.matches, parsed.knockoutFixtures);
  const core = {
    teams: replay.teams,
    currentDayIndex: replay.currentDayIndex,
    history: replay.history
  };

  // Idempotent per file: only the files whose content changed are rewritten.
  const changed = [
    writeJsonIfChanged(FILES.core, core) && "sweepstake.json",
    writeJsonIfChanged(FILES.groupFixtures, parsed.groupFixtures) && "groupFixtures.json",
    writeJsonIfChanged(FILES.knockout, parsed.knockoutFixtures) && "knockout.json"
  ].filter(Boolean);

  if (changed.length === 0) {
    console.log(`Already up to date — day ${core.currentDayIndex}, no changes.`);
    return;
  }

  console.log(
    `Synced: day ${core.currentDayIndex}, ${parsed.finished} finished matches, ` +
    `${parsed.groupFixtures.length} group + ${parsed.knockoutFixtures.length} knockout fixtures. ` +
    `Updated: ${changed.join(", ")}.`
  );
}

main();
