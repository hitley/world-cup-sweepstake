// Build-time helper: writes each competition's composed sweepstake.json into
// its site folder, derived from the single shared config/sweepstake.json plus
// that competition's participants (from a PARTICIPANTS_<SLUG> env var on
// Vercel, or the local gitignored participants.json). Mirrors the dev server's
// compose step so the static deployment serves the exact shape the frontend
// expects.
import fs from "fs";
import path from "path";
import { composeState, SharedState } from "../lib/composeState";
import { loadParticipants, envVarNameForSlug } from "../lib/loadParticipants";

const root = process.cwd();
const sharedFile = path.join(root, "config", "sweepstake.json");
const competitionsDir = path.join(root, "config", "competitions");
const siteDir = path.join(root, "site");

const shared: SharedState = JSON.parse(fs.readFileSync(sharedFile, "utf-8"));

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
