// Canonical 48-team seed for the 2026 World Cup. Single source of truth shared
// by the dev server, the headless sync and any script — kept here (not in
// server.ts) so they all seed replays identically.
//
// `prob` is each team's pre-tournament championship-win probability. It serves
// two roles: the odds shown on the Eve of the tournament, and the immutable
// "strength" that live win probabilities are renormalized from as teams are
// eliminated (see lib/replayTournament.ts). Because replays reseed from this
// constant every run, the strengths never drift and the recompute stays
// idempotent.

const BASE_TEAMS = [
  { name: "Brazil", emoji: "🇧🇷", confed: "CONMEBOL", prob: 10.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "France", emoji: "🇫🇷", confed: "UEFA", prob: 9.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Argentina", emoji: "🇦🇷", confed: "CONMEBOL", prob: 8.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confed: "UEFA", prob: 7.6, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Spain", emoji: "🇪🇸", confed: "UEFA", prob: 7.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Germany", emoji: "🇩🇪", confed: "UEFA", prob: 6.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Portugal", emoji: "🇵🇹", confed: "UEFA", prob: 5.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Netherlands", emoji: "🇳🇱", confed: "UEFA", prob: 4.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Norway", emoji: "🇳🇴", confed: "UEFA", prob: 4.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Belgium", emoji: "🇧🇪", confed: "UEFA", prob: 3.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Croatia", emoji: "🇭🇷", confed: "UEFA", prob: 3.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Uruguay", emoji: "🇺🇾", confed: "CONMEBOL", prob: 3.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Colombia", emoji: "🇨🇴", confed: "CONMEBOL", prob: 2.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Morocco", emoji: "🇲🇦", confed: "CAF", prob: 2.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "USA", emoji: "🇺🇸", confed: "CONCACAF", prob: 1.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Senegal", emoji: "🇸🇳", confed: "CAF", prob: 1.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Japan", emoji: "🇯🇵", confed: "AFC", prob: 1.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Korea Republic (South Korea)", emoji: "🇰🇷", confed: "AFC", prob: 1.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Mexico", emoji: "🇲🇽", confed: "CONCACAF", prob: 1.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Sweden", emoji: "🇸🇪", confed: "UEFA", prob: 1.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Switzerland", emoji: "🇨🇭", confed: "UEFA", prob: 1.1, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Ecuador", emoji: "🇪🇨", confed: "CONMEBOL", prob: 1.0, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Canada", emoji: "🇨🇦", confed: "CONCACAF", prob: 0.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "IR Iran", emoji: "🇮🇷", confed: "AFC", prob: 0.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Saudi Arabia", emoji: "🇸🇦", confed: "AFC", prob: 0.8, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Austria", emoji: "🇦🇹", confed: "UEFA", prob: 0.7, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Türkiye", emoji: "🇹🇷", confed: "UEFA", prob: 0.7, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Paraguay", emoji: "🇵🇾", confed: "CONMEBOL", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Algeria", emoji: "🇩🇿", confed: "CAF", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Egypt", emoji: "🇪🇬", confed: "CAF", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Côte d'Ivoire", emoji: "🇨🇮", confed: "CAF", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Ghana", emoji: "🇬🇭", confed: "CAF", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Tunisia", emoji: "🇹🇳", confed: "CAF", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Australia", emoji: "🇦🇺", confed: "AFC", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Panama", emoji: "🇵🇦", confed: "CONCACAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "South Africa", emoji: "🇿🇦", confed: "CAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Qatar", emoji: "🇶🇦", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Uzbekistan", emoji: "🇺🇿", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Iraq", emoji: "🇮🇶", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Jordan", emoji: "🇯🇴", confed: "AFC", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "New Zealand", emoji: "🇳🇿", confed: "OFC", prob: 0.1, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Bosnia and Herzegovina", emoji: "🇧🇦", confed: "UEFA", prob: 0.5, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Cabo Verde", emoji: "🇨🇻", confed: "CAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Congo DR", emoji: "🇨🇩", confed: "CAF", prob: 0.4, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Curaçao", emoji: "🇨🇼", confed: "CONCACAF", prob: 0.2, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Czechia", emoji: "🇨🇿", confed: "UEFA", prob: 0.6, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Haiti", emoji: "🇭🇹", confed: "CONCACAF", prob: 0.3, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 },
  { name: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confed: "UEFA", prob: 0.6, status: "Active", points: 0, goalsFor: 0, goalsAgainst: 0 }
];

// Canonical seed: every team also carries a zeroed XP breakdown so all persisted
// states (default, reset, replayed) share one shape.
export const INITIAL_TEAMS = BASE_TEAMS.map(t => ({
  ...t,
  wins: 0,
  draws: 0,
  cleanSheets: 0,
  goalPoints: 0,
  bonusPoints: 0
}));
