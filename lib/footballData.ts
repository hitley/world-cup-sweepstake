// Pulls real 2026 World Cup results from football-data.org (free tier) and maps
// them onto the app's 48 team names. Node-only (used by the dev server). The
// parsing is split out as a pure function so it can be unit-tested with a
// fixture, without hitting the network.

const COMPETITION_CODE = "WC"; // football-data.org code for the FIFA World Cup

// football-data.org names that differ from the app's INITIAL_TEAMS names.
// Keyed by the normalized (accent/punctuation-stripped, lowercased) API name.
const NAME_ALIASES: Record<string, string> = {
  unitedstates: "USA",
  usa: "USA",
  southkorea: "Korea Republic (South Korea)",
  korearepublic: "Korea Republic (South Korea)",
  iran: "IR Iran",
  drcongo: "Congo DR",
  democraticrepublicofcongo: "Congo DR",
  capeverde: "Cabo Verde",
  caboverde: "Cabo Verde",
  czechrepublic: "Czechia",
  turkey: "Türkiye",
  turkiye: "Türkiye",
  ivorycoast: "Côte d'Ivoire",
  cotedivoire: "Côte d'Ivoire",
  curacao: "Curaçao",
  bosniaherzegovina: "Bosnia and Herzegovina",
  bosniaandherzegovina: "Bosnia and Herzegovina"
};

const KNOCKOUT_STAGES = new Set([
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL"
]);

export interface RealMatch {
  date: string; // match calendar date, YYYY-MM-DD (UTC)
  teamHome: string; // canonical app name
  teamAway: string; // canonical app name
  scoreHome: number;
  scoreAway: number;
  stage: string;
  winner: string | null; // canonical app name of the winner, or null for a draw
}

// A group-stage fixture (played or scheduled), used for the Head-to-Head game.
export interface GroupFixture {
  round: number; // group matchday 1, 2 or 3
  group: string; // e.g. "Group A" ("" if the API didn't provide one)
  date: string; // YYYY-MM-DD (UTC)
  kickoff: string; // full UTC ISO datetime ("" if missing)
  teamHome: string; // canonical app name
  teamAway: string; // canonical app name
  played: boolean;
  scoreHome: number | null; // null until played
  scoreAway: number | null;
}

// Normalize football-data's group value ("GROUP_A", "Group A", "A") → "Group A"
function groupLabel(raw: unknown): string {
  if (!raw) return "";
  const token = String(raw).replace(/_/g, " ").trim().split(/\s+/).pop() ?? "";
  return token ? `Group ${token.toUpperCase()}` : "";
}

export interface ParsedMatches {
  matches: RealMatch[]; // FINISHED, mapped matches (sorted by date)
  groupFixtures: GroupFixture[]; // all GROUP_STAGE fixtures, played + scheduled
  finished: number; // count of FINISHED matches the API returned
  totalReturned: number; // all matches returned (any status)
  unmapped: string[]; // API team names we couldn't map to the app's 48
}

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Resolve an API team name to the app's canonical name, or null if unknown.
// Tries: alias map → exact normalized match → a conservative prefix match that
// tolerates trailing qualifiers (e.g. "Cape Verde Islands" → "Cape Verde").
export function resolveTeamName(apiName: string, appTeamNames: string[]): string | null {
  const key = normalize(apiName);
  if (!key) return null;
  if (NAME_ALIASES[key]) return NAME_ALIASES[key];

  const exact = appTeamNames.find(n => normalize(n) === key);
  if (exact) return exact;

  // Fuzzy fallback: one normalized name is a prefix of the other (≥5 chars),
  // covering trailing words the API may add ("Islands", "Is.", etc.)
  const prefixMatch = (a: string, b: string) => a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a));

  for (const aliasKey of Object.keys(NAME_ALIASES)) {
    if (prefixMatch(key, aliasKey)) return NAME_ALIASES[aliasKey];
  }
  const fuzzy = appTeamNames.find(n => prefixMatch(key, normalize(n)));
  return fuzzy ?? null;
}

export function isKnockoutStage(stage: string): boolean {
  return KNOCKOUT_STAGES.has(stage);
}

// Pure: turn a football-data.org /matches payload into mapped, finished results
// sorted by date. Designed to be replayed from scratch for idempotency.
export function parseMatches(payload: any, appTeamNames: string[]): ParsedMatches {
  const all: any[] = Array.isArray(payload?.matches) ? payload.matches : [];
  const matches: RealMatch[] = [];
  const groupFixtures: GroupFixture[] = [];
  const unmapped = new Set<string>();
  let finished = 0;

  for (const m of all) {
    const homeApi = m.homeTeam?.name ?? "";
    const awayApi = m.awayTeam?.name ?? "";
    const teamHome = resolveTeamName(homeApi, appTeamNames);
    const teamAway = resolveTeamName(awayApi, appTeamNames);
    const isFinished = m.status === "FINISHED";
    if (isFinished) finished += 1;

    if (!teamHome && homeApi) unmapped.add(homeApi);
    if (!teamAway && awayApi) unmapped.add(awayApi);
    if (!teamHome || !teamAway) continue; // skip matches we can't map cleanly

    const ft = m.score?.fullTime ?? {};
    const hasScore = typeof ft.home === "number" && typeof ft.away === "number";
    const scoreHome = hasScore ? ft.home : 0;
    const scoreAway = hasScore ? ft.away : 0;
    const date = typeof m.utcDate === "string" ? m.utcDate.slice(0, 10) : "";

    if (isFinished) {
      let winner: string | null = null;
      if (m.score?.winner === "HOME_TEAM") winner = teamHome;
      else if (m.score?.winner === "AWAY_TEAM") winner = teamAway;
      matches.push({ date, teamHome, teamAway, scoreHome, scoreAway, stage: m.stage ?? "", winner });
    }

    // Capture every group-stage fixture (played or not) for the Head-to-Head game
    if (m.stage === "GROUP_STAGE") {
      groupFixtures.push({
        round: typeof m.matchday === "number" ? m.matchday : 1,
        group: groupLabel(m.group),
        date,
        kickoff: typeof m.utcDate === "string" ? m.utcDate : "",
        teamHome,
        teamAway,
        played: isFinished,
        scoreHome: isFinished && hasScore ? ft.home : null,
        scoreAway: isFinished && hasScore ? ft.away : null
      });
    }
  }

  // Stable sort by date so replay order is deterministic
  matches.sort((a, b) => a.date.localeCompare(b.date));
  groupFixtures.sort((a, b) => a.round - b.round || a.date.localeCompare(b.date));

  return {
    matches,
    groupFixtures,
    finished,
    totalReturned: all.length,
    unmapped: [...unmapped]
  };
}

// Fetch + parse every finished match of the competition (one request).
export async function fetchAllMatches(
  token: string,
  appTeamNames: string[]
): Promise<ParsedMatches> {
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION_CODE}/matches`;
  const res = await fetch(url, { headers: { "X-Auth-Token": token } });
  if (!res.ok) {
    throw new Error(`football-data.org responded ${res.status} ${res.statusText}`);
  }
  return parseMatches(await res.json(), appTeamNames);
}
