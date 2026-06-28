// Node-only helpers for the split tournament store. The shared tournament state
// lives across three sibling files under config/ so the big, frequently-changing
// XP/history state is separated from the schedule data:
//
//   sweepstake.json    — { teams, currentDayIndex, history } (mutates every sync)
//   groupFixtures.json — GroupFixture[]    (frozen once the group stage is done)
//   knockout.json      — KnockoutFixture[] (empty until the knockouts start)
//
// Writers are idempotent per file: each is only rewritten when its serialized
// content actually changes, so re-running a sync produces no spurious git diff.
import fs from "fs";
import path from "path";

export function tournamentFiles(root = process.cwd()) {
  const dir = path.join(root, "config");
  return {
    core: path.join(dir, "sweepstake.json"),
    groupFixtures: path.join(dir, "groupFixtures.json"),
    knockout: path.join(dir, "knockout.json")
  };
}

export function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch (err) {
    console.error(`Failed to read ${file}:`, err);
  }
  return fallback;
}

// Write pretty JSON (trailing newline) only when the content differs from disk.
// Returns true if the file was (re)written.
export function writeJsonIfChanged(file: string, data: unknown): boolean {
  const next = JSON.stringify(data, null, 2) + "\n";
  let prev: string | null = null;
  try {
    if (fs.existsSync(file)) prev = fs.readFileSync(file, "utf-8");
  } catch {
    /* treat an unreadable file as absent and overwrite */
  }
  if (prev === next) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next, "utf-8");
  return true;
}
