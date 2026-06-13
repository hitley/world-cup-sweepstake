import { Participant, Team } from "../types";
import { ListOrdered, Medal, Lightbulb } from "lucide-react";

interface XpLadderProps {
  participants: Participant[];
  teams: Team[];
}

// EPL-ladder-style table of every contender's XP, broken down into the
// components that actually earn it. Every column here feeds the XP total:
//   XP = 3·Wins + 1·Draw + 2·Clean Sheet + Goal XP + Bonus
export default function XpLadder({ participants, teams }: XpLadderProps) {
  const teamByName = new Map(teams.map(t => [t.name.toLowerCase(), t]));

  const rows = participants.map(p => {
    let xp = 0, wins = 0, draws = 0, cleanSheets = 0, goalPoints = 0, bonusPoints = 0;
    p.teams.forEach(name => {
      const t = teamByName.get(name.toLowerCase());
      if (!t) return;
      xp += t.points;
      wins += t.wins ?? 0;
      draws += t.draws ?? 0;
      cleanSheets += t.cleanSheets ?? 0;
      goalPoints += t.goalPoints ?? 0;
      bonusPoints += t.bonusPoints ?? 0;
    });
    return { name: p.name, color: p.color, xp, wins, draws, cleanSheets, goalPoints, bonusPoints };
  }).sort((a, b) =>
    b.xp - a.xp ||
    b.wins - a.wins ||
    b.goalPoints - a.goalPoints ||
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
          <p className="text-xs text-slate-400 font-outfit mt-1">Full contender table — XP broken down by where it's earned</p>
        </div>
        <span className="text-xs px-3 py-1 bg-slate-950 border-2 border-slate-900 rounded-full text-yellow-400 font-bungee uppercase tracking-wider self-start sm:self-auto">
          {participants.length} Contenders
        </span>
      </div>

      {/* Ladder table */}
      <div className="bento-card overflow-x-auto !p-0">
        <table className="w-full text-sm font-outfit min-w-[560px]">
          <thead>
            <tr className="text-[10px] uppercase font-bungee tracking-wider text-slate-400 border-b-2 border-slate-800">
              <th className="text-left py-3 px-4 w-10">#</th>
              <th className="text-left py-3 px-2">Contender</th>
              <th className="text-center py-3 px-2" title="Match wins (3 XP each)">W</th>
              <th className="text-center py-3 px-2" title="Draws (1 XP each)">D</th>
              <th className="text-center py-3 px-2" title="Clean sheets (2 XP each)">CS</th>
              <th className="text-center py-3 px-2" title="Goal XP (1 per goal, max 3 per match)">Gls</th>
              <th className="text-center py-3 px-2" title="Knockout & champion bonuses">Bon</th>
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
                <td className="text-center py-3 px-2 font-mono text-slate-400">{r.draws}</td>
                <td className="text-center py-3 px-2 font-mono text-slate-300">{r.cleanSheets}</td>
                <td className="text-center py-3 px-2 font-mono text-slate-300">{r.goalPoints}</td>
                <td className="text-center py-3 px-2 font-mono text-indigo-300">{r.bonusPoints}</td>
                <td className="text-right py-3 px-4">
                  <span className="font-bungee text-yellow-400 text-base">{r.xp}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-sans font-bold ml-1">XP</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formula legend */}
      <p className="text-[10px] text-slate-500 font-outfit uppercase tracking-wider px-1">
        XP = 3·W (wins) + 1·D (draws) + 2·CS (clean sheets) + Gls (goal XP, max 3/match) + Bon (round &amp; champion bonuses)
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
