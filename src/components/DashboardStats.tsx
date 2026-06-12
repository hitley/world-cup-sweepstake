import { useState } from "react";
import { Participant, Team, HistoricalRecord } from "../types";
import { Trophy, ShieldAlert, Sparkles, AlertCircle, Heart, HeartCrack } from "lucide-react";
import { motion } from "motion/react";

interface DashboardStatsProps {
  participants: Participant[];
  teams: Team[];
  history: HistoricalRecord[];
  forceExpandAll?: boolean;
}

export default function DashboardStats({ participants, teams, history, forceExpandAll = false }: DashboardStatsProps) {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  // Compute standings
  const playerStandings = participants.map(p => {
    let pts = 0;
    let activeTeams: Team[] = [];
    let eliminatedTeams: Team[] = [];
    let cumulativeProb = 0;

    p.teams.forEach(tName => {
      const matchTeam = teams.find(t => t.name.toLowerCase() === tName.toLowerCase());
      if (matchTeam) {
        pts += matchTeam.points;
        cumulativeProb += matchTeam.prob;
        if (matchTeam.status === "Active") {
          activeTeams.push(matchTeam);
        } else {
          eliminatedTeams.push(matchTeam);
        }
      }
    });

    return {
      name: p.name,
      color: p.color,
      points: pts,
      activeTeams,
      eliminatedTeams,
      cumulativeProb: parseFloat(cumulativeProb.toFixed(1))
    };
  }).sort((a, b) => b.points - a.points || b.cumulativeProb - a.cumulativeProb);

  // Dynamically allocate badges
  const getBadgeForPlayer = (index: number, player: typeof playerStandings[number]) => {
    if (index === 0 && player.points > 0) {
      return { text: "🏆 Table Leader", style: "bg-amber-500/10 border-amber-500/30 text-amber-500" };
    }
    if (player.activeTeams.length === 0) {
      return { text: "💔 Heartbroken", style: "bg-rose-500/10 border-rose-500/30 text-rose-500" };
    }
    if (player.activeTeams.length === 1 && player.cumulativeProb > 8) {
      return { text: "🎯 One Basket", style: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400" };
    }
    if (player.cumulativeProb > 25) {
      return { text: "🔥 Golden Path", style: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" };
    }
    if (player.activeTeams.length > 0 && player.cumulativeProb < 3) {
      return { text: "🏔️ Long Shot", style: "bg-slate-500/10 border-slate-700 text-slate-400" };
    }
    return { text: "⚽ Contender", style: "bg-slate-800/60 border-slate-700/60 text-slate-300" };
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bungee text-slate-100 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            SWEEPSTAKE STANDINGS
          </h2>
          <p className="text-xs text-slate-400 font-outfit mt-1">Current ranks, points milestones, and survival percentages</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 bg-slate-950 border-2 border-slate-900 rounded-full text-yellow-400 font-bungee uppercase tracking-wider">
            {participants.length} CONTENDERS
          </span>

          {!forceExpandAll && (
            <button
              onClick={() => setExpandAll(prev => !prev)}
              className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-full text-slate-300 font-outfit uppercase tracking-wider"
              title="Expand or collapse all contender cards"
            >
              {expandAll ? "Collapse All" : "Expand All"}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Leaders card and Interactive participants checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playerStandings.map((player, idx) => {
          const badge = getBadgeForPlayer(idx, player);
          const effectiveExpandAll = forceExpandAll || expandAll;
          const isSelected = effectiveExpandAll || selectedFriend === player.name;

          return (
            <motion.div
              layout
              key={player.name}
              onClick={() => {
                if (forceExpandAll) return; // Disable click when exporting
                if (effectiveExpandAll) {
                  setExpandAll(false);
                  setSelectedFriend(player.name);
                } else {
                  setSelectedFriend(isSelected ? null : player.name);
                }
              }}
              className={`bento-card bento-card-hover cursor-pointer p-6 relative overflow-hidden flex flex-col justify-between ${
                isSelected 
                  ? "border-yellow-400 bg-slate-900/40 ring-2 ring-yellow-400/20" 
                  : ""
              }`}
              whileHover={{ y: forceExpandAll ? 0 : -2 }}
            >
              {/* Card design styling flair */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15"
                style={{ backgroundColor: player.color }}
              />

              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bungee text-slate-400 bg-slate-950 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-slate-900">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bungee text-lg text-slate-100 block tracking-tight">{player.name}</span>
                      <span className={`text-[10px] uppercase font-bungee tracking-wider px-2 py-0.5 mt-1 inline-block rounded-lg border ${badge.style}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-bungee text-yellow-400 block bg-slate-950 px-3 py-1 rounded-xl border-2 border-slate-900">
                      {player.points} <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">XP</span>
                    </span>
                  </div>
                </div>

                {/* Team Survival Progression bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold font-outfit uppercase tracking-wider">
                    <span>Squad Integrity</span>
                    <span className="text-slate-300">
                      {player.activeTeams.length} / {player.activeTeams.length + player.eliminatedTeams.length} Active
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden flex gap-0.5 p-0.5 border border-white/5">
                    {/* Active portions */}
                    {player.activeTeams.map((_, aIdx) => (
                      <div key={`a-${aIdx}`} className="h-full flex-1 rounded-sm transition-all" style={{ backgroundColor: player.color }} />
                    ))}
                    {/* Knocked out portions */}
                    {player.eliminatedTeams.map((_, eIdx) => (
                      <div key={`e-${eIdx}`} className="h-full flex-1 bg-slate-800/40 rounded-sm" />
                    ))}
                  </div>
                </div>

                {/* Win probability metric */}
                <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border-2 border-slate-900/60 font-outfit">
                  <span className="text-slate-400 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    Tourney Win Prob
                  </span>
                  <span className="font-bungee text-emerald-400">{player.cumulativeProb}%</span>
                </div>
              </div>

              {/* Expansion/Dropdown view when clicked */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t-2 border-slate-900 grid grid-cols-1 gap-2.5 animate-fadeIn">
                  <div className="text-[10px] uppercase font-bungee tracking-widest text-slate-500">Drafted National Squads</div>
                  
                  {/* List active teams */}
                  {player.activeTeams.map(t => (
                    <div key={t.name} className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl text-xs border border-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-md">{t.emoji}</span>
                        <span className="font-bold text-slate-200">{t.name}</span>
                        <span className="text-[8px] text-yellow-400 border border-yellow-400/20 px-1 bg-yellow-400/5 rounded font-bungee tracking-wider">
                          {t.confed}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-300 font-mono">
                        {t.points} Pts ({t.prob}%)
                      </div>
                    </div>
                  ))}

                  {/* List eliminated teams */}
                  {player.eliminatedTeams.map(t => (
                    <div key={t.name} className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl text-xs border border-slate-900 opacity-60">
                      <div className="flex items-center gap-2 line-through text-slate-500">
                        <span className="text-md grayscale">{t.emoji}</span>
                        <span>{t.name}</span>
                      </div>
                      <div className="text-[8px] bg-rose-500/15 border-2 border-rose-500/30 text-rose-500 font-bungee font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        <HeartCrack className="w-2.5 h-2.5" /> ELIMINATED
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Trigger expansion hint line */}
              {!isSelected && (
                <div className="text-[10px] text-center text-slate-500 hover:text-slate-400 font-bungee uppercase tracking-wider mt-4 pt-2 border-t border-white/5">
                  Expand Draft Profile ↓
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Prize distribution card */}
      <div className="p-4 bg-slate-900/60 border-2 border-slate-800 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-sm font-bungee text-slate-100">Prize Distribution</div>
            <div className="text-[10px] text-slate-400 font-outfit">How the pot is split at tournament end</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-sm">
            <div className="text-3xl font-black text-yellow-400">65%</div>
            <div className="font-bold text-yellow-400 mt-2">Tournament Winner</div>
            <div className="text-xs text-slate-400">Owner of the world champion squad</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-sm">
            <div className="text-3xl font-black text-rose-400">20%</div>
            <div className="font-bold text-rose-400 mt-2">Runner-Up</div>
            <div className="text-xs text-slate-400">Beaten finalist</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-sm">
            <div className="text-3xl font-black text-emerald-400">5%</div>
            <div className="font-bold text-emerald-400 mt-2">3rd & 4th Place (each)</div>
            <div className="text-xs text-slate-400">Each losing semi-finalist</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-sm">
            <div className="text-3xl font-black text-purple-400">5%</div>
            <div className="font-bold text-purple-400 mt-2">Wooden Spoon</div>
            <div className="text-xs text-slate-400">Team with least points & worst GD</div>
          </div>
        </div>
      </div>
    </div>
  );
}
