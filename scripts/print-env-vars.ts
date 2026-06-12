// Prints the PARTICIPANTS_<SLUG> env var name + minified value for each local
// competition, ready to paste into Vercel's Environment Variables. Run with:
//   npx tsx scripts/print-env-vars.ts
import fs from "fs";
import path from "path";
import { loadParticipants, envVarNameForSlug } from "../lib/loadParticipants";

const competitionsDir = path.join(process.cwd(), "config", "competitions");

for (const slug of fs.readdirSync(competitionsDir)) {
  if (!fs.statSync(path.join(competitionsDir, slug)).isDirectory()) continue;
  const participants = loadParticipants(slug);
  if (!participants) continue;
  console.log(`\n# ${slug}`);
  console.log(`${envVarNameForSlug(slug)}=${JSON.stringify(participants)}`);
}
console.log("");
