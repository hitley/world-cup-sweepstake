// Rebuilds the entire tournament state from a list of real finished matches.
// Pure and deterministic: replaying the same matches always yields the same
// state, which is what makes "Fetch Next Matchday" idempotent and able to
// catch up multiple missed days in one call.
import { RealMatch, isKnockoutStage, KnockoutFixture } from "./footballData";
import { SharedHistoryRecord, snapshotFromTeams } from "./composeState";

export interface ReplayTeam {
  name: string;
  emoji: string;
  confed: string;
  prob: number;
  status: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  // XP breakdown (points = 3*wins + draws + 2*cleanSheets + goalPoints + bonusPoints)
  wins: number;
  draws: number;
  cleanSheets: number;
  goalPoints: number;
  bonusPoints: number;
}

export interface ReplayResult {
  teams: ReplayTeam[];
  currentDayIndex: number;
  history: SharedHistoryRecord[];
}

// XP for reaching a knockout round (awarded once per team per stage)
const STAGE_BONUS: Record<string, number> = {
  LAST_32: 5,
  LAST_16: 10,
  QUARTER_FINALS: 15,
  SEMI_FINALS: 20
};

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

// Re-spread championship-win probability across whoever is still alive, in
// proportion to each team's immutable seed strength (its pre-tournament odds).
// Eliminated teams drop to 0 and their share flows to the survivors. Called
// after every matchday, so the odds automatically recompute at each knockout
// round — and once only the champion remains, they converge on ~100%.
function renormalizeProbs(teams: ReplayTeam[], strength: Map<string, number>) {
  const aliveStrength = teams.reduce(
    (sum, t) => sum + (t.status === "Active" ? strength.get(t.name.toLowerCase()) ?? 0 : 0),
    0
  );
  for (const t of teams) {
    if (t.status !== "Active" || aliveStrength <= 0) {
      t.prob = 0;
      continue;
    }
    const s = strength.get(t.name.toLowerCase()) ?? 0;
    t.prob = Math.round((s / aliveStrength) * 1000) / 10; // one decimal place
  }
}

function buildAppMatch(m: RealMatch) {
  const result = m.winner
    ? `${m.winner} won ${Math.max(m.scoreHome, m.scoreAway)}-${Math.min(m.scoreHome, m.scoreAway)}`
    : `${m.teamHome} and ${m.teamAway} drew ${m.scoreHome}-${m.scoreAway}`;
  return {
    teamHome: m.teamHome,
    teamAway: m.teamAway,
    scoreHome: m.scoreHome,
    scoreAway: m.scoreAway,
    highlights: `${m.teamHome} ${m.scoreHome}-${m.scoreAway} ${m.teamAway} — ${result}.`
  };
}

export function replayTournament(
  initialTeams: ReplayTeam[],
  matches: RealMatch[],
  knockoutFixtures: KnockoutFixture[] = []
): ReplayResult {
  // Fresh, zeroed teams — never accumulate onto prior state
  const teams: ReplayTeam[] = initialTeams.map(t => ({
    ...t,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    status: "Active",
    wins: 0,
    draws: 0,
    cleanSheets: 0,
    goalPoints: 0,
    bonusPoints: 0
  }));
  const byName = new Map(teams.map(t => [t.name.toLowerCase(), t]));
  // Immutable seed strength per team (pre-tournament odds), used to renormalize
  // win probabilities as the field thins out.
  const strength = new Map(initialTeams.map(t => [t.name.toLowerCase(), t.prob]));

  // The teams that reached the Round of 32, read from the drawn bracket. Once
  // all 16 ties are populated (32 distinct teams), any team NOT among them
  // failed to escape the group stage and is eliminated there. Gating on a fully
  // drawn R32 keeps this robust to a partially-populated bracket from the API.
  const r32 = knockoutFixtures.filter(f => f.stage === "LAST_32");
  const r32Teams = new Set<string>();
  for (const f of r32) {
    r32Teams.add(f.teamHome.toLowerCase());
    r32Teams.add(f.teamAway.toLowerCase());
  }
  const r32Drawn = r32.length === 16 && r32Teams.size === 32;
  // The group stage ends on the last date that carries a non-knockout match.
  const groupDates = matches.filter(m => !isKnockoutStage(m.stage)).map(m => m.date);
  const lastGroupDate = groupDates.length ? groupDates.sort().slice(-1)[0] : "";

  // Each distinct match date becomes a matchday, in chronological order
  const dates = [...new Set(matches.map(m => m.date))].sort();
  const history: SharedHistoryRecord[] = [];
  const awardedStageBonus = new Set<string>(); // `${team}|${stage}`

  dates.forEach((date, i) => {
    const dayMatches = matches.filter(m => m.date === date);
    const appMatches: ReturnType<typeof buildAppMatch>[] = [];
    const eliminatedToday: string[] = [];

    for (const m of dayMatches) {
      const home = byName.get(m.teamHome.toLowerCase());
      const away = byName.get(m.teamAway.toLowerCase());
      if (!home || !away) continue;

      home.goalsFor += m.scoreHome;
      home.goalsAgainst += m.scoreAway;
      away.goalsFor += m.scoreAway;
      away.goalsAgainst += m.scoreHome;

      // Result (win +3 / draw +1)
      if (m.scoreHome > m.scoreAway) { home.wins += 1; home.points += 3; }
      else if (m.scoreAway > m.scoreHome) { away.wins += 1; away.points += 3; }
      else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }

      // Clean sheet (+2)
      if (m.scoreAway === 0) { home.cleanSheets += 1; home.points += 2; }
      if (m.scoreHome === 0) { away.cleanSheets += 1; away.points += 2; }

      // Goal XP (1 per goal, capped at 3 per match)
      const homeGoalXp = Math.min(3, m.scoreHome);
      const awayGoalXp = Math.min(3, m.scoreAway);
      home.goalPoints += homeGoalXp; home.points += homeGoalXp;
      away.goalPoints += awayGoalXp; away.points += awayGoalXp;

      // Round-entry bonus: reaching a knockout stage, once per team per stage
      const bonus = STAGE_BONUS[m.stage];
      if (bonus) {
        for (const t of [home, away]) {
          const key = `${t.name}|${m.stage}`;
          if (!awardedStageBonus.has(key)) {
            awardedStageBonus.add(key);
            t.bonusPoints += bonus;
            t.points += bonus;
          }
        }
      }

      // Eliminations: the loser of a knockout tie (prob handled by renormalize)
      if (isKnockoutStage(m.stage) && m.winner) {
        const loser = m.winner === m.teamHome ? away : home;
        if (loser.status === "Active") eliminatedToday.push(loser.name);
        loser.status = "Eliminated";
      }

      // Champion: winner of the FINAL takes the +50 bonus (and, as the last
      // team standing, renormalize lands their win probability on ~100%).
      if (m.stage === "FINAL" && m.winner) {
        const champ = byName.get(m.winner.toLowerCase());
        if (champ) {
          champ.bonusPoints += 50;
          champ.points += 50;
        }
      }

      appMatches.push(buildAppMatch(m));
    }

    // Once the bracket is drawn, the close of the group stage eliminates every
    // team that didn't make the Round of 32 (the loser-of-a-tie rule above can
    // never catch them, since they play no knockout match).
    if (r32Drawn && date === lastGroupDate) {
      for (const t of teams) {
        if (t.status === "Active" && !r32Teams.has(t.name.toLowerCase())) {
          t.status = "Eliminated";
          eliminatedToday.push(t.name);
        }
      }
    }

    // Re-spread championship odds across whoever is still alive after today.
    renormalizeProbs(teams, strength);

    const totalGoals = appMatches.reduce((a, mm) => a + mm.scoreHome + mm.scoreAway, 0);
    const niceDate = formatDate(date);
    history.push({
      dayIndex: i + 1,
      date: niceDate,
      matches: appMatches,
      eliminatedTeams: eliminatedToday,
      wittyNarrative: `Matchday ${i + 1} (${niceDate}): ${dayMatches.length} match${dayMatches.length === 1 ? "" : "es"} settled, ${totalGoals} goal${totalGoals === 1 ? "" : "s"} scored${eliminatedToday.length ? `, ${eliminatedToday.length} knocked out` : ""}.`,
      teamSnapshot: snapshotFromTeams(teams)
    });
  });

  // Final pass so the top-level odds reflect the current field even before any
  // match has been played (otherwise teams would keep their raw seed values).
  renormalizeProbs(teams, strength);

  return { teams, currentDayIndex: history.length, history };
}
