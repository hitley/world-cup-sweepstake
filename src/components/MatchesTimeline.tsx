import { useState } from "react";
import { HistoricalRecord } from "../types";
import { Calendar, RefreshCw, AlertCircle, Quote, Star, Goal, AlertTriangle } from "lucide-react";

interface MatchesTimelineProps {
  history: HistoricalRecord[];
  activeDayIndex: number;
}

export default function MatchesTimeline({ history, activeDayIndex }: MatchesTimelineProps) {
  const [selectedDayTab, setSelectedDayTab] = useState<number>(history.length > 0 ? history[history.length - 1].dayIndex : 1);

  if (history.length === 0) {
    return (
      <div className="bg-slate-900/40 rounded-3xl p-10 border border-slate-800 text-center text-slate-400">
        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-lg font-medium text-slate-300">No Matches Played Yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          The 2026 World Cup is ready! Press "Simulate Next Matchday" above to let the simulation generate outcomes, or "Fetch Real Updates" to let Gemini scan actual World Cup results.
        </p>
      </div>
    );
  }

  // Find historical record for selected tab
  const dayRecord = history.find(h => h.dayIndex === selectedDayTab);

  return (
    <div className="space-y-6 font-outfit">
      {/* Horizontal mini-calendar slider to navigate days played */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-bungee tracking-widest text-slate-400">Matchday Logbook</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {history.map((record) => {
            const isSelected = selectedDayTab === record.dayIndex;
            return (
              <button
                key={record.dayIndex}
                onClick={() => setSelectedDayTab(record.dayIndex)}
                className={`py-2 px-4 rounded-xl text-xs transition flex-shrink-0 flex items-center gap-1.5 border-2 select-none font-bungee tracking-wider uppercase cursor-pointer ${
                  isSelected
                    ? "bg-yellow-400 border-yellow-400 text-slate-950 font-black"
                    : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                }`}
              >
                Match {record.dayIndex}
              </button>
            );
          })}
        </div>
      </div>

      {dayRecord && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Matches column */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs uppercase font-bungee tracking-widest text-slate-500">Fixture scorecard</h4>
            
            <div className="space-y-4">
              {dayRecord.matches.map((match, mIdx) => (
                <div 
                  key={mIdx}
                  className="bento-card bento-card-hover hover:border-yellow-400/50 p-6"
                >
                  {/* Scoreboard layout */}
                  <div className="grid grid-cols-7 items-center gap-3 mb-4 font-bungee">
                    {/* Home Team columns */}
                    <div className="col-span-3 text-right">
                      <span className="font-bungee text-sm sm:text-base text-slate-100 block tracking-tight">{match.teamHome}</span>
                    </div>

                    {/* Numeric Score columns */}
                    <div className="col-span-1 text-center bg-slate-950/80 border-2 border-slate-900 rounded-xl py-2 px-1">
                      <span className="font-extrabold text-sm sm:text-base text-yellow-400">
                        {match.scoreHome} - {match.scoreAway}
                      </span>
                    </div>

                    {/* Away Team columns */}
                    <div className="col-span-3 text-left">
                      <span className="font-bungee text-sm sm:text-base text-slate-100 block tracking-tight">{match.teamAway}</span>
                    </div>
                  </div>

                  {/* Highlights and scorers */}
                  <div className="bg-slate-950/65 p-4 rounded-xl border border-slate-900 text-xs text-slate-400 leading-relaxed italic relative">
                    <Quote className="w-6 h-6 text-slate-800 opacity-20 absolute top-1 left-2 pointer-events-none" />
                    <p className="pl-6 text-slate-300 pr-2">
                      {match.highlights}
                    </p>

                    {match.scorers && match.scorers.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-900 pl-6 flex items-center gap-2 flex-wrap text-[10px] text-slate-400 font-mono">
                        <Goal className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="uppercase font-bold tracking-wider">Goals:</span>
                        <span>{match.scorers.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {dayRecord.matches.length === 0 && (
                <div className="text-center py-10 bg-slate-950/30 rounded-2xl text-slate-500 text-xs">
                  No match recordings for this calendar gap.
                </div>
              )}
            </div>
          </div>

          {/* Podcast Commentary and Eliminated news Column */}
          <div className="space-y-6">
            {/* Podcast Roundup */}
            <div className="bento-card relative overflow-hidden p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4.5 h-4.5 text-yellow-400" />
                <h4 className="text-xs uppercase font-bungee tracking-widest text-slate-300">Sweepstake Roundup</h4>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border-2 border-slate-900/60 font-outfit font-medium">
                "{dayRecord.wittyNarrative}"
              </p>
            </div>

            {/* Eliminations */}
            <div className="bento-card relative overflow-hidden p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                <h4 className="text-xs uppercase font-bungee tracking-widest text-slate-300">Knocked Out Today</h4>
              </div>

              {dayRecord.eliminatedTeams && dayRecord.eliminatedTeams.length > 0 ? (
                <div className="space-y-2">
                  {dayRecord.eliminatedTeams.map((teamName) => (
                    <div 
                      key={teamName}
                      className="p-3 bg-rose-500/5 border border-rose-500/25 rounded-xl text-xs text-rose-300 flex items-center justify-between font-outfit"
                    >
                      <div className="flex items-center gap-2">
                        <span>💔</span>
                        <span className="font-bold">{teamName}</span>
                      </div>
                      <span className="text-[9px] font-bungee tracking-wider uppercase bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg text-rose-400">
                        Eliminated
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6 bg-slate-950 rounded-xl border-2 border-slate-900/60 font-outfit">
                  Safe matchday! No national squad fell victim to the executioner's ax today.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
