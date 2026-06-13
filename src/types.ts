export interface Team {
  name: string;
  emoji: string;
  confed: string;
  prob: number;
  status: "Active" | "Eliminated";
  points: number; // total XP = 3*wins + draws + 2*cleanSheets + goalPoints + bonusPoints
  goalsFor: number;
  goalsAgainst: number;
  // XP breakdown — makes the points total transparent
  wins: number;
  draws: number;
  cleanSheets: number;
  goalPoints: number; // 1 XP per goal, capped at 3 per match
  bonusPoints: number; // knockout round-entry (+5..+20) and champion (+50)
}

export interface Participant {
  name: string;
  teams: string[];
  color: string;
}

export interface Match {
  teamHome: string;
  teamAway: string;
  scoreHome: number;
  scoreAway: number;
  highlights: string;
  scorers?: string[];
}

export interface HistoricalRecord {
  dayIndex: number;
  date: string;
  matches: Match[];
  eliminatedTeams: string[];
  wittyNarrative: string;
  participantStandings: {
    participant: string;
    points: number;
    activeTeamsCount: number;
    combinedProb: number;
  }[];
}

export interface SweepstakeState {
  participants: Participant[];
  teams: Team[];
  currentDayIndex: number;
  history: HistoricalRecord[];
}

export const MATCHDAY_DATES = [
  "June 11, 2026",
  "June 12, 2026",
  "June 13, 2026",
  "June 14, 2026",
  "June 15, 2026",
  "June 16, 2026",
  "June 17, 2026",
  "June 18, 2026",
  "June 19, 2026",
  "June 20, 2026",
  "June 21, 2026",
  "June 22, 2026",
  "June 23, 2026",
  "June 24, 2026",
  "June 27, 2026",
  "June 28, 2026",
  "June 29, 2026",
  "June 30, 2026",
  "July 01, 2026",
  "July 02, 2026",
  "July 04, 2026",
  "July 05, 2026",
  "July 06, 2026",
  "July 07, 2026",
  "July 10, 2026",
  "July 11, 2026",
  "July 14, 2026",
  "July 15, 2026",
  "July 18, 2026",
  "July 19, 2026"
];
