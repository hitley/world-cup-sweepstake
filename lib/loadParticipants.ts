// Node-only resolver for a competition's participants. Used by both the dev
// server and the static build script so they agree on where participants come
// from: an environment variable (preferred — keeps names out of git, set in
// Vercel for deploys) or a local gitignored participants.json (for dev).
import fs from "fs";
import path from "path";
import { ParticipantConfig } from "./composeState";

// gbc-familia → PARTICIPANTS_GBC_FAMILIA
export function envVarNameForSlug(slug: string): string {
  return "PARTICIPANTS_" + slug.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

export function participantsFile(slug: string): string {
  return path.join(process.cwd(), "config", "competitions", slug, "participants.json");
}

// Returns the participants for a competition, or null if neither source exists.
export function loadParticipants(slug: string): ParticipantConfig[] | null {
  const fromEnv = process.env[envVarNameForSlug(slug)];
  if (fromEnv && fromEnv.trim()) {
    try {
      const parsed = JSON.parse(fromEnv);
      if (Array.isArray(parsed)) return parsed;
      console.error(`${envVarNameForSlug(slug)} is not a JSON array; ignoring`);
    } catch (err) {
      console.error(`Failed to parse ${envVarNameForSlug(slug)} as JSON:`, err);
    }
  }

  const file = participantsFile(slug);
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      console.error(`Failed to read participants file for "${slug}":`, err);
    }
  }

  return null;
}
