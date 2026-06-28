// Build-time helper for the split tournament store. Reads the three shared
// config files (sweepstake.json + groupFixtures.json + knockout.json) and:
//   - copies the schedule files (no participant data) once to the site root, so
//     every competition page fetches them from ../groupFixtures.json etc.
//   - writes each competition's composed sweepstake.json (participants + core
//     state) into its own folder, from a PARTICIPANTS_<SLUG> env var on Vercel
//     or the local gitignored participants.json.
// Mirrors the dev server's compose step + shared-fixture endpoints so the static
// deployment serves the exact shape the frontend expects.
import fs from "fs";
import path from "path";
import { composeState, SharedState } from "../lib/composeState";
import { loadParticipants, envVarNameForSlug } from "../lib/loadParticipants";
import { tournamentFiles, readJsonFile } from "../lib/tournamentFiles";

const root = process.cwd();
const competitionsDir = path.join(root, "config", "competitions");
const siteDir = path.join(root, "site");
const files = tournamentFiles(root);

const shared: SharedState = JSON.parse(fs.readFileSync(files.core, "utf-8"));

// Shared schedule files, served once from the site root (no participant data).
fs.writeFileSync(path.join(siteDir, "groupFixtures.json"), JSON.stringify(readJsonFile(files.groupFixtures, []), null, 2));
fs.writeFileSync(path.join(siteDir, "knockout.json"), JSON.stringify(readJsonFile(files.knockout, []), null, 2));
console.log("Wrote shared groupFixtures.json + knockout.json to site root");

for (const slug of fs.readdirSync(competitionsDir)) {
  const siteSlugDir = path.join(siteDir, slug);
  if (!fs.existsSync(siteSlugDir)) continue;

  const participants = loadParticipants(slug);
  if (!participants) {
    console.warn(`⚠  Skipping "${slug}": no ${envVarNameForSlug(slug)} env var and no participants.json. Page will have no contenders.`);
    continue;
  }

  const composed = composeState(shared, participants);
  fs.writeFileSync(path.join(siteSlugDir, "sweepstake.json"), JSON.stringify(composed, null, 2));
  console.log(`Composed ${slug}: ${participants.length} participants, day ${shared.currentDayIndex}`);
}
