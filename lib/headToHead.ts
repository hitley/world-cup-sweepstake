// Head-to-Head mini-game: each real group-stage fixture is mirrored onto the
// two contenders who drafted those teams, with football points (3/1/0) and
// goals. Pure and deterministic — derived entirely from the group fixtures and
// each competition's drafts.
import { GroupFixtureRecord, ParticipantConfig } from "./composeState";

export interface H2HFixture {
  round: number;
  group: string;
  date: string;
  kickoff: string;
  ownerHome: string | null; // contender who drafted teamHome
  ownerAway: string | null;
  teamHome: string;
  teamAway: string;
  played: boolean;
  scoreHome: number | null;
  scoreAway: number | null;
  selfFixture: boolean; // one contender owns both teams
}

export interface H2HRow {
  name: string;
  color: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

function ownerOf(team: string, teamToOwner: Map<string, ParticipantConfig>): ParticipantConfig | undefined {
  return teamToOwner.get(team.toLowerCase());
}

// Build the per-round fixtures (owner vs owner) from the raw group fixtures.
export function buildFixtures(groupFixtures: GroupFixtureRecord[], participants: ParticipantConfig[]): H2HFixture[] {
  const teamToOwner = new Map<string, ParticipantConfig>();
  participants.forEach(p => p.teams.forEach(t => teamToOwner.set(t.toLowerCase(), p)));

  return groupFixtures.map(f => {
    const home = ownerOf(f.teamHome, teamToOwner);
    const away = ownerOf(f.teamAway, teamToOwner);
    return {
      round: f.round,
      group: f.group,
      date: f.date,
      kickoff: f.kickoff,
      ownerHome: home?.name ?? null,
      ownerAway: away?.name ?? null,
      teamHome: f.teamHome,
      teamAway: f.teamAway,
      played: f.played,
      scoreHome: f.scoreHome,
      scoreAway: f.scoreAway,
      selfFixture: !!home && !!away && home.name === away.name
    };
  });
}

// Build the league table from played fixtures, applying the football + self-
// fixture rules. Sorted Pts → GD → GF → name.
export function buildTable(groupFixtures: GroupFixtureRecord[], participants: ParticipantConfig[]): H2HRow[] {
  const rows = new Map<string, H2HRow>();
  participants.forEach(p => rows.set(p.name, {
    name: p.name, color: p.color,
    played: 0, wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0
  }));

  const fixtures = buildFixtures(groupFixtures, participants);

  for (const f of fixtures) {
    if (!f.played || f.scoreHome === null || f.scoreAway === null) continue;
    const home = f.ownerHome ? rows.get(f.ownerHome) : undefined;
    const away = f.ownerAway ? rows.get(f.ownerAway) : undefined;

    if (f.selfFixture && home) {
      // One contender owns both teams: a single fixture worth 3 (any win) or 1
      // (draw); both teams' goals cumulate, so GF and GA both gain the total.
      const draw = f.scoreHome === f.scoreAway;
      home.played += 1;
      home.goalsFor += f.scoreHome + f.scoreAway;
      home.goalsAgainst += f.scoreHome + f.scoreAway;
      if (draw) { home.draws += 1; home.points += 1; }
      else { home.wins += 1; home.points += 3; }
      continue;
    }

    // Normal fixture: each owner gets their own team's real result
    if (home) {
      home.played += 1;
      home.goalsFor += f.scoreHome;
      home.goalsAgainst += f.scoreAway;
      if (f.scoreHome > f.scoreAway) { home.wins += 1; home.points += 3; }
      else if (f.scoreHome < f.scoreAway) { home.losses += 1; }
      else { home.draws += 1; home.points += 1; }
    }
    if (away) {
      away.played += 1;
      away.goalsFor += f.scoreAway;
      away.goalsAgainst += f.scoreHome;
      if (f.scoreAway > f.scoreHome) { away.wins += 1; away.points += 3; }
      else if (f.scoreAway < f.scoreHome) { away.losses += 1; }
      else { away.draws += 1; away.points += 1; }
    }
  }

  return [...rows.values()]
    .map(r => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name)
    );
}

export function roundsAvailable(groupFixtures: GroupFixtureRecord[]): number[] {
  return [...new Set(groupFixtures.map(f => f.round))].sort((a, b) => a - b);
}
