import { useState } from "react";
import { Participant, GroupFixture } from "../types";
import { Swords, Medal, CalendarClock } from "lucide-react";
import { buildTable, buildFixtures, roundsAvailable } from "@/lib/headToHead";
import { trackEvent } from "../analytics";

interface HeadToHeadProps {
  participants: Participant[];
  groupFixtures: GroupFixture[];
}

// The Head-to-Head mini-game: real group-stage fixtures mirrored onto the
// contenders who drafted each team, with football points and goals.
export default function HeadToHead({ participants, groupFixtures }: HeadToHeadProps) {
  const rounds = roundsAvailable(groupFixtures);
  // Default to the latest round that has a played fixture, else the first round
  const latestPlayedRound = Math.max(
    0,
    ...groupFixtures.filter(f => f.played).map(f => f.round)
  );
  const [round, setRound] = useState<number>(latestPlayedRound || rounds[0] || 1);

  const table = buildTable(groupFixtures, participants);
  const fixtures = buildFixtures(groupFixtures, participants).filter(f => f.round === round);
  const medalColor = ["text-yellow-400", "text-slate-300", "text-amber-700"];
  const colorOf = new Map(participants.map(p => [p.name, p.color]));

  // Bucket this round's fixtures by their real World Cup group (A, B, C…)
  const byGroup = new Map<string, typeof fixtures>();
  fixtures.forEach(f => {
    const arr = byGroup.get(f.group) ?? [];
    arr.push(f);
    byGroup.set(f.group, arr);
  });
  const groupOrder = [...byGroup.keys()].sort((a, b) => a.localeCompare(b));

  if (groupFixtures.length === 0) {
    return (
      <div className="bg-slate-900/40 rounded-3xl p-10 border border-slate-800 text-center text-slate-400">
        <Swords className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-lg font-medium text-slate-300">No Head-to-Head Fixtures Yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Group-stage fixtures appear here after the first results sync. Each real group game becomes a duel between the contenders who drafted those teams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bungee text-slate-100 flex items-center gap-3">
            <Swords className="w-6 h-6 text-yellow-400" />
            HEAD-TO-HEAD
          </h2>
          <p className="text-xs text-slate-400 font-outfit mt-1">Group-stage fixtures mirrored onto the contenders who drafted each team</p>
        </div>
        <span className="text-xs px-3 py-1 bg-slate-950 border-2 border-slate-900 rounded-full text-yellow-400 font-bungee uppercase tracking-wider self-start sm:self-auto">
          Group Stage
        </span>
      </div>

      {/* Two-pane layout: standings in the left third, the round selector +
          fixtures fill the right two thirds so it's clear there's more here
          than just the table. Stacks vertically on mobile. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* League table — left third, sticky so it stays in view while
            scrolling the fixtures on the right */}
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <h3 className="text-xs uppercase font-bungee tracking-widest text-slate-400 mb-3">League Table</h3>
          <div className="bento-card overflow-x-auto !p-0">
            <table className="w-full text-xs sm:text-sm font-outfit min-w-[440px] lg:min-w-0">
              <thead>
                <tr className="text-[10px] uppercase font-bungee tracking-wider text-slate-400 border-b-2 border-slate-800 text-center">
                  <th className="text-left py-3 px-3 w-8">#</th>
                  <th className="text-left py-3 px-2">Contender</th>
                  <th className="py-3 px-1.5" title="Played">P</th>
                  <th className="py-3 px-1.5" title="Won">W</th>
                  <th className="py-3 px-1.5" title="Drawn">D</th>
                  <th className="py-3 px-1.5" title="Lost">L</th>
                  <th className="py-3 px-1.5" title="Goals for">GF</th>
                  <th className="py-3 px-1.5" title="Goals against">GA</th>
                  <th className="py-3 px-1.5" title="Goal difference">GD</th>
                  <th className="text-right py-3 px-3">Pts</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {table.map((r, i) => (
                  <tr key={r.name} className={`border-b border-slate-900/80 transition hover:bg-slate-900/40 ${i === 0 ? "bg-yellow-400/[0.04]" : ""}`}>
                    <td className="text-left py-3 px-3">
                      {i < 3 ? (
                        <span className="font-bungee text-slate-300 inline-flex items-center gap-1">
                          <Medal className={`w-4 h-4 ${medalColor[i]}`} />{i + 1}
                        </span>
                      ) : (
                        <span className="font-bungee text-slate-500">{i + 1}</span>
                      )}
                    </td>
                    <td className="text-left py-3 px-2">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="font-bold text-slate-100">{r.name}</span>
                      </span>
                    </td>
                    <td className="py-3 px-1.5 font-mono text-slate-400">{r.played}</td>
                    <td className="py-3 px-1.5 font-mono text-slate-200">{r.wins}</td>
                    <td className="py-3 px-1.5 font-mono text-slate-300">{r.draws}</td>
                    <td className="py-3 px-1.5 font-mono text-slate-400">{r.losses}</td>
                    <td className="py-3 px-1.5 font-mono text-slate-300">{r.goalsFor}</td>
                    <td className="py-3 px-1.5 font-mono text-slate-400">{r.goalsAgainst}</td>
                    <td className="py-3 px-1.5 font-mono">
                      <span className={r.goalDiff > 0 ? "text-emerald-400" : r.goalDiff < 0 ? "text-rose-400" : "text-slate-400"}>
                        {r.goalDiff > 0 ? "+" : ""}{r.goalDiff}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3"><span className="font-bungee text-yellow-400 text-base">{r.points}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Round selector + fixtures — right two thirds */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {rounds.map(r => (
              <button
                key={r}
                onClick={() => { trackEvent("h2h_round", { round: r }); setRound(r); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-bungee uppercase tracking-wider transition cursor-pointer border-2 ${
                  round === r
                    ? "bg-yellow-400 border-yellow-400 text-slate-950"
                    : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                }`}
              >
                Round {r}
              </button>
            ))}
          </div>

          {/* Round fixtures — one card per group, results + this round's games */}
          <div>
            <h3 className="text-xs uppercase font-bungee tracking-widest text-slate-400 mb-3">Round {round} Fixtures</h3>
            {fixtures.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/30 rounded-2xl text-slate-500 text-xs font-outfit flex flex-col items-center gap-2">
                <CalendarClock className="w-6 h-6 text-slate-600" />
                No fixtures for this round yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {groupOrder.map(g => {
                  const gf = byGroup.get(g)!;
                  const playedCount = gf.filter(f => f.played).length;
                  return (
                    <div key={g || "ungrouped"} className="bento-card !p-0 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-800">
                        <span className="font-bungee text-base text-slate-100">{g || "Fixtures"}</span>
                        <span className="text-[10px] font-bungee uppercase tracking-wider text-slate-500">{playedCount} of {gf.length} played</span>
                      </div>
                      {gf.map((f, idx) => renderFixtureRow(f, idx))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function renderFixtureRow(f: ReturnType<typeof buildFixtures>[number], idx: number) {
    const homeWon = f.played && (f.scoreHome ?? 0) > (f.scoreAway ?? 0);
    const awayWon = f.played && (f.scoreAway ?? 0) > (f.scoreHome ?? 0);
    return (
      <div key={idx} className="px-4 py-3 border-t border-slate-900/70 first:border-t-0">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide font-outfit mb-1.5 flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3 flex-shrink-0" /> {formatKickoff(f)}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorOf.get(f.ownerHome ?? "") ?? "#64748b", opacity: awayWon ? 0.4 : 1 }} />
            <span className={`text-sm font-semibold truncate ${awayWon ? "text-slate-500" : "text-slate-100"}`}>{f.ownerHome ?? "—"}</span>
          </span>
          {f.played ? (
            <span className="font-bungee text-slate-100 text-sm flex-shrink-0 w-14 text-center tabular-nums">{f.scoreHome}&nbsp;–&nbsp;{f.scoreAway}</span>
          ) : (
            <span className="font-bungee text-slate-600 text-[10px] flex-shrink-0 w-14 text-center">VS</span>
          )}
          <span className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className={`text-sm font-semibold truncate ${homeWon ? "text-slate-500" : "text-slate-100"}`}>{f.ownerAway ?? "—"}</span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorOf.get(f.ownerAway ?? "") ?? "#64748b", opacity: homeWon ? 0.4 : 1 }} />
          </span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 uppercase tracking-wide font-outfit">
          <span className="truncate">{f.teamHome}</span>
          <span className="truncate text-right">{f.teamAway}</span>
        </div>
      </div>
    );
  }

  function formatKickoff(f: ReturnType<typeof buildFixtures>[number]): string {
    if (!f.kickoff) return f.date || "";
    const d = new Date(f.kickoff);
    if (isNaN(d.getTime())) return f.date || "";
    return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  }
}
