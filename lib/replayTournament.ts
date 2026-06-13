// Rebuilds the entire tournament state from a list of real finished matches.
// Pure and deterministic: replaying the same matches always yields the same
// state, which is what makes "Fetch Next Matchday" idempotent and able to
// catch up multiple missed days in one call.
import { RealMatch, isKnockoutStage } from "./footballData";
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

export function replayTournament(initialTeams: ReplayTeam[], matches: RealMatch[]): ReplayResult {
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

      // Eliminations: the loser of a knockout tie
      if (isKnockoutStage(m.stage) && m.winner) {
        const loser = m.winner === m.teamHome ? away : home;
        loser.status = "Eliminated";
        loser.prob = 0;
        eliminatedToday.push(loser.name);
      }

      // Champion: winner of the FINAL
      if (m.stage === "FINAL" && m.winner) {
        const champ = byName.get(m.winner.toLowerCase());
        if (champ) {
          champ.bonusPoints += 50;
          champ.points += 50;
          teams.forEach(t => { t.prob = t.name.toLowerCase() === m.winner!.toLowerCase() ? 100 : 0; });
        }
      }

      appMatches.push(buildAppMatch(m));
    }

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

  return { teams, currentDayIndex: history.length, history };
}
