import { Participant, Team, HistoricalRecord } from "../types";
import { ListOrdered, Medal, Lightbulb } from "lucide-react";

interface XpLadderProps {
  participants: Participant[];
  teams: Team[];
  history: HistoricalRecord[];
}

// EPL-ladder-style table of every contender's XP and the lower-level stats that
// feed it (match wins, goals for/against, goal difference).
export default function XpLadder({ participants, teams, history }: XpLadderProps) {
  const teamByName = new Map(teams.map(t => [t.name.toLowerCase(), t]));

  // Wins per team, derived from the real match scores in history
  const teamWins = new Map<string, number>();
  history.forEach(rec =>
    rec.matches.forEach(m => {
      let winner: string | null = null;
      if (m.scoreHome > m.scoreAway) winner = m.teamHome;
      else if (m.scoreAway > m.scoreHome) winner = m.teamAway;
      if (winner) {
        const key = winner.toLowerCase();
        teamWins.set(key, (teamWins.get(key) || 0) + 1);
      }
    })
  );

  const rows = participants.map(p => {
    let xp = 0, wins = 0, goalsFor = 0, goalsAgainst = 0;
    p.teams.forEach(name => {
      const t = teamByName.get(name.toLowerCase());
      if (!t) return;
      xp += t.points;
      goalsFor += t.goalsFor;
      goalsAgainst += t.goalsAgainst;
      wins += teamWins.get(name.toLowerCase()) || 0;
    });
    return {
      name: p.name,
      color: p.color,
      xp,
      wins,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst
    };
  }).sort((a, b) =>
    b.xp - a.xp ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name)
  );

  const medalColor = ["text-yellow-400", "text-slate-300", "text-amber-700"];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bungee text-slate-100 flex items-center gap-3">
            <ListOrdered className="w-6 h-6 text-yellow-400" />
            XP LADDER
          </h2>
          <p className="text-xs text-slate-400 font-outfit mt-1">Full contender table — XP and the stats that build it</p>
        </div>
        <span className="text-xs px-3 py-1 bg-slate-950 border-2 border-slate-900 rounded-full text-yellow-400 font-bungee uppercase tracking-wider self-start sm:self-auto">
          {participants.length} Contenders
        </span>
      </div>

      {/* Ladder table */}
      <div className="bento-card overflow-x-auto !p-0">
        <table className="w-full text-sm font-outfit min-w-[520px]">
          <thead>
            <tr className="text-[10px] uppercase font-bungee tracking-wider text-slate-400 border-b-2 border-slate-800">
              <th className="text-left py-3 px-4 w-10">#</th>
              <th className="text-left py-3 px-2">Contender</th>
              <th className="text-center py-3 px-2" title="Total match wins across drafted squads">Wins</th>
              <th className="text-center py-3 px-2" title="Goals for">GF</th>
              <th className="text-center py-3 px-2" title="Goals against">GA</th>
              <th className="text-center py-3 px-2" title="Goal difference">GD</th>
              <th className="text-right py-3 px-4">XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.name}
                className={`border-b border-slate-900/80 transition hover:bg-slate-900/40 ${i === 0 ? "bg-yellow-400/[0.04]" : ""}`}
              >
                <td className="py-3 px-4">
                  {i < 3 ? (
                    <span className="flex items-center gap-1 font-bungee text-slate-300">
                      <Medal className={`w-4 h-4 ${medalColor[i]}`} />
                      {i + 1}
                    </span>
                  ) : (
                    <span className="font-bungee text-slate-500">{i + 1}</span>
                  )}
                </td>
                <td className="py-3 px-2">
                  <span className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="font-bold text-slate-100">{r.name}</span>
                  </span>
                </td>
                <td className="text-center py-3 px-2 font-mono text-slate-200">{r.wins}</td>
                <td className="text-center py-3 px-2 font-mono text-slate-300">{r.goalsFor}</td>
                <td className="text-center py-3 px-2 font-mono text-slate-400">{r.goalsAgainst}</td>
                <td className="text-center py-3 px-2 font-mono">
                  <span className={r.goalDiff > 0 ? "text-emerald-400" : r.goalDiff < 0 ? "text-rose-400" : "text-slate-400"}>
                    {r.goalDiff > 0 ? "+" : ""}{r.goalDiff}
                  </span>
                </td>
                <td className="text-right py-3 px-4">
                  <span className="font-bungee text-yellow-400 text-base">{r.xp}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-sans font-bold ml-1">XP</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <p className="text-[10px] text-slate-500 font-outfit uppercase tracking-wider px-1">
        Wins = individual squad match wins · GF/GA = goals for/against · GD = goal difference
      </p>

      {/* Strategy Rulebook — explains how XP is earned */}
      <div className="p-4 bg-indigo-950/20 border-2 border-indigo-900/30 rounded-2xl flex items-start gap-4">
        <Lightbulb className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed font-outfit">
          <span className="text-yellow-400 font-bungee uppercase tracking-wider block mb-1">Strategy Rulebook</span> Team points accumulate as they score goals, win matches, and secure clean sheets! Reaching successive knockout rounds grants massive point multipliers (+5 to +50 XP bonus) to whoever owns that squad, completely turning rankings around!
        </p>
      </div>
    </div>
  );
}
