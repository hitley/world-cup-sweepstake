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

export interface ParsedMatches {
  matches: RealMatch[]; // FINISHED, mapped matches (sorted by date)
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
export function resolveTeamName(apiName: string, appTeamNames: string[]): string | null {
  const key = normalize(apiName);
  if (NAME_ALIASES[key]) return NAME_ALIASES[key];
  const match = appTeamNames.find(n => normalize(n) === key);
  return match ?? null;
}

export function isKnockoutStage(stage: string): boolean {
  return KNOCKOUT_STAGES.has(stage);
}

// Pure: turn a football-data.org /matches payload into mapped, finished results
// sorted by date. Designed to be replayed from scratch for idempotency.
export function parseMatches(payload: any, appTeamNames: string[]): ParsedMatches {
  const all: any[] = Array.isArray(payload?.matches) ? payload.matches : [];
  const finishedRaw = all.filter(m => m.status === "FINISHED");
  const matches: RealMatch[] = [];
  const unmapped = new Set<string>();

  for (const m of finishedRaw) {
    const homeApi = m.homeTeam?.name ?? "";
    const awayApi = m.awayTeam?.name ?? "";
    const teamHome = resolveTeamName(homeApi, appTeamNames);
    const teamAway = resolveTeamName(awayApi, appTeamNames);

    if (!teamHome) unmapped.add(homeApi);
    if (!teamAway) unmapped.add(awayApi);
    if (!teamHome || !teamAway) continue; // skip matches we can't map cleanly

    const ft = m.score?.fullTime ?? {};
    const scoreHome = typeof ft.home === "number" ? ft.home : 0;
    const scoreAway = typeof ft.away === "number" ? ft.away : 0;

    let winner: string | null = null;
    if (m.score?.winner === "HOME_TEAM") winner = teamHome;
    else if (m.score?.winner === "AWAY_TEAM") winner = teamAway;

    const date = typeof m.utcDate === "string" ? m.utcDate.slice(0, 10) : "";

    matches.push({ date, teamHome, teamAway, scoreHome, scoreAway, stage: m.stage ?? "", winner });
  }

  // Stable sort by date so replay order is deterministic
  matches.sort((a, b) => a.date.localeCompare(b.date));

  return {
    matches,
    finished: finishedRaw.length,
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
