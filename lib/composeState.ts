// Shared between the dev server (live API responses) and the static site
// builder: composes the per-competition state the frontend expects out of the
// single shared tournament state plus a competition's participants.

export interface ParticipantConfig {
  name: string;
  teams: string[];
  color: string;
}

// Per-day snapshot of every team's cumulative standing, recorded in the
// shared history so each competition's standings can be derived for any day.
export interface TeamSnapshot {
  points: number;
  status: string;
  prob: number;
}

export interface SharedHistoryRecord {
  dayIndex: number;
  date: string;
  matches: unknown[];
  eliminatedTeams: string[];
  wittyNarrative: string;
  teamSnapshot: Record<string, TeamSnapshot>;
}

// Group-stage fixture for the Head-to-Head game (same shape as footballData's
// GroupFixture; duplicated here to keep this module dependency-free).
export interface GroupFixtureRecord {
  round: number;
  date: string;
  teamHome: string;
  teamAway: string;
  played: boolean;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface SharedState {
  teams: ({ name: string } & TeamSnapshot & Record<string, unknown>)[];
  currentDayIndex: number;
  history: SharedHistoryRecord[];
  groupFixtures?: GroupFixtureRecord[];
}

export function snapshotFromTeams(
  teams: Array<{ name: string } & TeamSnapshot>
): Record<string, TeamSnapshot> {
  const snapshot: Record<string, TeamSnapshot> = {};
  teams.forEach(t => {
    snapshot[t.name] = { points: t.points, status: t.status, prob: t.prob };
  });
  return snapshot;
}

export function standingsForDay(participants: ParticipantConfig[], teamSnapshot: Record<string, TeamSnapshot>) {
  const byLowerName = new Map(Object.entries(teamSnapshot).map(([name, snap]) => [name.toLowerCase(), snap]));

  return participants.map(p => {
    let points = 0;
    let activeTeamsCount = 0;
    let combinedProb = 0;

    p.teams.forEach(tName => {
      const snap = byLowerName.get(tName.toLowerCase());
      if (snap) {
        points += snap.points;
        combinedProb += snap.prob;
        if (snap.status === "Active") {
          activeTeamsCount++;
        }
      }
    });

    return {
      participant: p.name,
      points,
      activeTeamsCount,
      combinedProb: parseFloat(combinedProb.toFixed(1))
    };
  }).sort((a, b) => b.points - a.points || b.combinedProb - a.combinedProb);
}

// Shape the frontend consumes (SweepstakeState in src/types.ts)
export function composeState(shared: SharedState, participants: ParticipantConfig[]) {
  return {
    participants,
    teams: shared.teams,
    currentDayIndex: shared.currentDayIndex,
    groupFixtures: shared.groupFixtures ?? [],
    history: shared.history.map(h => ({
      dayIndex: h.dayIndex,
      date: h.date,
      matches: h.matches,
      eliminatedTeams: h.eliminatedTeams,
      wittyNarrative: h.wittyNarrative,
      participantStandings: standingsForDay(participants, h.teamSnapshot || {})
    }))
  };
}
