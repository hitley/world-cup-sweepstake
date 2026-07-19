// Prize resolution for the end-of-tournament "Winners" reveal. The sweepstake
// payout follows the REAL tournament outcome, not the XP standings:
//   1st  = winner of the FINAL          2nd = beaten finalist
//   3rd  = winner of the THIRD_PLACE     4th = loser of the THIRD_PLACE
//   🥄   = worst group-stage team (fewest group points, then worst goal diff)
// The prize winners are the contenders who drafted each of those teams.
//
// Pure and deterministic — derived entirely from the schedule fixtures and each
// competition's drafts. Mirrors the champion check in replayTournament.ts so the
// modal and the +50 champion bonus can never disagree.
import { KnockoutFixture, GroupFixture, Participant } from "../src/types";

export type PrizeRank = 1 | 2 | 3 | 4 | "spoon";

export interface Prize {
  rank: PrizeRank;
  label: string; // "Champions", "Runners-up", "Third Place", "Fourth Place", "Wooden Spoon"
  team: string | null; // the team that earned this prize (null if not yet resolved)
  contender: string | null; // who drafted it (null if undrafted)
  detail: string; // short human sentence, e.g. "Beat Argentina 2–1 in the final"
}

// A FINAL fixture that has been played marks the tournament as decided.
export function isTournamentComplete(knockout: KnockoutFixture[]): boolean {
  return knockout.some(f => f.stage === "FINAL" && f.played && f.winner);
}

// Case-insensitive team → contender lookup, matching DashboardStats/headToHead.
function drafterMap(participants: Participant[]): Map<string, string> {
  const m = new Map<string, string>();
  participants.forEach(p => p.teams.forEach(t => m.set(t.toLowerCase(), p.name)));
  return m;
}

// The other team in a decided tie (the one that isn't the winner).
function loserOf(f: KnockoutFixture): string | null {
  if (!f.winner) return null;
  return f.winner === f.teamHome ? f.teamAway : f.teamHome;
}

const scoreLine = (f: KnockoutFixture): string =>
  f.scoreHome !== null && f.scoreAway !== null ? `${f.scoreHome}–${f.scoreAway}` : "";

// Build the worst group-stage team from the group fixtures alone (3 pts win /
// 1 draw), sorted ascending on points, then goal difference, then goals for.
// This aggregates by TEAM, unlike headToHead's buildTable which is by contender.
export function worstGroupTeam(
  groupFixtures: GroupFixture[]
): { team: string; points: number; goalsFor: number; goalDiff: number } | null {
  interface Row { team: string; points: number; goalsFor: number; goalsAgainst: number }
  const rows = new Map<string, Row>();
  const row = (name: string): Row => {
    let r = rows.get(name);
    if (!r) { r = { team: name, points: 0, goalsFor: 0, goalsAgainst: 0 }; rows.set(name, r); }
    return r;
  };

  for (const f of groupFixtures) {
    if (!f.played || f.scoreHome === null || f.scoreAway === null) continue;
    const home = row(f.teamHome), away = row(f.teamAway);
    home.goalsFor += f.scoreHome; home.goalsAgainst += f.scoreAway;
    away.goalsFor += f.scoreAway; away.goalsAgainst += f.scoreHome;
    if (f.scoreHome > f.scoreAway) home.points += 3;
    else if (f.scoreHome < f.scoreAway) away.points += 3;
    else { home.points += 1; away.points += 1; }
  }

  const sorted = [...rows.values()]
    .map(r => ({ team: r.team, points: r.points, goalsFor: r.goalsFor, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((a, b) => a.points - b.points || a.goalDiff - b.goalDiff || a.goalsFor - b.goalsFor || a.team.localeCompare(b.team));

  return sorted[0] ?? null;
}

// The five prizes, top to bottom. Team/contender fields are null until the
// relevant fixture has been played (or if the team was left undrafted).
export function buildPrizes(
  knockout: KnockoutFixture[],
  groupFixtures: GroupFixture[],
  participants: Participant[]
): Prize[] {
  const drafters = drafterMap(participants);
  const drafterOf = (team: string | null): string | null =>
    team ? drafters.get(team.toLowerCase()) ?? null : null;

  const played = (stage: string): KnockoutFixture | undefined =>
    knockout.find(f => f.stage === stage && f.played && f.winner);

  const final = played("FINAL");
  const third = played("THIRD_PLACE");

  const champion = final?.winner ?? null;
  const runnerUp = final ? loserOf(final) : null;
  const thirdPlace = third?.winner ?? null;
  const fourthPlace = third ? loserOf(third) : null;
  const spoon = worstGroupTeam(groupFixtures);

  return [
    {
      rank: 1, label: "Champions", team: champion, contender: drafterOf(champion),
      detail: final && runnerUp ? `Beat ${runnerUp} ${scoreLine(final)} in the final` : "World Cup winners"
    },
    {
      rank: 2, label: "Runners-up", team: runnerUp, contender: drafterOf(runnerUp),
      detail: final && champion ? `Lost the final to ${champion} ${scoreLine(final)}` : "Beaten finalists"
    },
    {
      rank: 3, label: "Third Place", team: thirdPlace, contender: drafterOf(thirdPlace),
      detail: third && fourthPlace ? `Beat ${fourthPlace} ${scoreLine(third)} in the play-off` : "Won the third-place play-off"
    },
    {
      rank: 4, label: "Fourth Place", team: fourthPlace, contender: drafterOf(fourthPlace),
      detail: third && thirdPlace ? `Lost the play-off to ${thirdPlace} ${scoreLine(third)}` : "Fourth at the World Cup"
    },
    {
      rank: "spoon", label: "Wooden Spoon", team: spoon?.team ?? null, contender: drafterOf(spoon?.team ?? null),
      detail: spoon
        ? `Worst group record: ${spoon.points} pt${spoon.points === 1 ? "" : "s"}, GD ${spoon.goalDiff > 0 ? "+" : ""}${spoon.goalDiff}`
        : "Bottom of the pile"
    }
  ];
}
