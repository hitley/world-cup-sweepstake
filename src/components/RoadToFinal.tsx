import { Participant, Team, KnockoutFixture } from "../types";
import { Route, Crown } from "lucide-react";

interface RoadToFinalProps {
  participants: Participant[];
  teams: Team[];
  knockout: KnockoutFixture[];
}

// ── Fixed FIFA 2026 knockout bracket topology ──────────────────────────────
// The bracket shape is invariant (independent of who qualifies): match numbers
// M73–M104 with a fixed feed graph. We bind live results onto these slots:
//   • Round of 32 slots are bound by chronological order. The official R32
//     match numbers are NOT in kickoff order (e.g. M76 kicks off before M74),
//     but FIFA does assign them by schedule slot, so the slots sorted by their
//     official kickoff give the order fixtures actually arrive in. We bind the
//     i-th LAST_32 fixture (sorted by kickoff) to the i-th slot in that order.
//     The official times below are used ONLY to derive that ordering, never for
//     exact matching — so a uniform timezone/schedule offset in the synced data
//     (the feed runs ~8h behind the official table) can't break the binding.
//   • Every later slot resolves to the winners of the two matches feeding it,
//     then binds to the API fixture whose two teams match — so the tree fills
//     in automatically as the sync captures each round.
const R32_KICKOFFS: Record<string, string> = {
  M73: "2026-06-29T03:00:00Z", M74: "2026-06-30T04:30:00Z", M75: "2026-06-30T09:00:00Z", M76: "2026-06-30T01:00:00Z",
  M77: "2026-07-01T05:00:00Z", M78: "2026-07-01T01:00:00Z", M79: "2026-07-01T09:00:00Z", M80: "2026-07-02T00:00:00Z",
  M81: "2026-07-02T08:00:00Z", M82: "2026-07-02T04:00:00Z", M83: "2026-07-03T07:00:00Z", M84: "2026-07-03T03:00:00Z",
  M85: "2026-07-03T11:00:00Z", M86: "2026-07-04T06:00:00Z", M87: "2026-07-04T09:30:00Z", M88: "2026-07-04T02:00:00Z"
};
// R32 bracket slots in official chronological order (the order fixtures arrive).
const R32_SLOTS: string[] = Object.keys(R32_KICKOFFS).sort(
  (a, b) => new Date(R32_KICKOFFS[a]).getTime() - new Date(R32_KICKOFFS[b]).getTime()
);
const isR32Slot = (id: string) => id in R32_KICKOFFS;
const FEEDS: Record<string, [string, string]> = {
  M89: ["M74", "M77"], M90: ["M73", "M75"], M91: ["M76", "M78"], M92: ["M79", "M80"],
  M93: ["M83", "M84"], M94: ["M81", "M82"], M95: ["M86", "M88"], M96: ["M85", "M87"],
  M97: ["M89", "M90"], M98: ["M93", "M94"], M99: ["M91", "M92"], M100: ["M95", "M96"],
  M101: ["M97", "M98"], M102: ["M99", "M100"], M104: ["M101", "M102"]
};
const THIRD_FEEDS: [string, string] = ["M101", "M102"]; // M103: losers of the two semis

// Column layout, top→bottom, for each half of the draw.
const LEFT: string[][] = [
  ["M74", "M77", "M73", "M75", "M83", "M84", "M81", "M82"],
  ["M89", "M90", "M93", "M94"],
  ["M97", "M98"],
  ["M101"]
];
const RIGHT: string[][] = [
  ["M76", "M78", "M79", "M80", "M86", "M88", "M85", "M87"],
  ["M91", "M92", "M95", "M96"],
  ["M99", "M100"],
  ["M102"]
];

interface Resolved {
  teamA?: string;
  teamB?: string;
  fx?: KnockoutFixture;
  winner?: string;
  loser?: string;
}

// The Road to Final: the full knockout tree, every tie tagged with the
// contender who drafted each team so you can trace anyone's path to the final.
export default function RoadToFinal({ participants, teams, knockout }: RoadToFinalProps) {
  const ownerOf = new Map<string, { name: string; color: string }>();
  participants.forEach(p => p.teams.forEach(t => ownerOf.set(t, { name: p.name, color: p.color })));
  const emojiOf = new Map(teams.map(t => [t.name, t.emoji]));

  // Bind API fixtures: R32 by chronological order (FIFA numbers matches in
  // kickoff order), later rounds matched on their team pair.
  const r32BySlot = new Map<string, KnockoutFixture>();
  knockout
    .filter(f => f.stage === "LAST_32")
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime() || a.teamHome.localeCompare(b.teamHome))
    .forEach((f, i) => { if (i < R32_SLOTS.length) r32BySlot.set(R32_SLOTS[i], f); });
  const laterFixtures = knockout.filter(f => f.stage !== "LAST_32");
  const findByTeams = (a?: string, b?: string) =>
    a && b ? laterFixtures.find(f => (f.teamHome === a && f.teamAway === b) || (f.teamHome === b && f.teamAway === a)) : undefined;

  const decide = (r: Resolved) => {
    const fx = r.fx;
    if (fx?.played) {
      const win = fx.winner ?? ((fx.scoreHome ?? 0) > (fx.scoreAway ?? 0) ? fx.teamHome : (fx.scoreAway ?? 0) > (fx.scoreHome ?? 0) ? fx.teamAway : undefined);
      if (win) {
        r.winner = win;
        r.loser = win === fx.teamHome ? fx.teamAway : fx.teamHome;
      }
    }
    return r;
  };

  const memo = new Map<string, Resolved>();
  const resolve = (id: string): Resolved => {
    const cached = memo.get(id);
    if (cached) return cached;
    let r: Resolved = {};
    if (isR32Slot(id)) {
      const fx = r32BySlot.get(id);
      if (fx) r = { teamA: fx.teamHome, teamB: fx.teamAway, fx };
    } else if (id === "M103") {
      const a = resolve(THIRD_FEEDS[0]);
      const b = resolve(THIRD_FEEDS[1]);
      r = { teamA: a.loser, teamB: b.loser, fx: knockout.find(f => f.stage === "THIRD_PLACE") };
    } else {
      const [f0, f1] = FEEDS[id];
      const a = resolve(f0);
      const b = resolve(f1);
      r = { teamA: a.winner, teamB: b.winner, fx: findByTeams(a.winner, b.winner) };
    }
    decide(r);
    memo.set(id, r);
    return r;
  };

  const hasBracket = knockout.length > 0;
  if (!hasBracket) {
    return (
      <div className="bg-slate-900/40 rounded-3xl p-10 border border-slate-800 text-center text-slate-400">
        <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-lg font-medium text-slate-300">No Knockout Bracket Yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          The Road to the Final lights up once the group stage finishes and the
          Round of 32 is drawn. Each tie shows the contender who drafted each team.
        </p>
      </div>
    );
  }

  // Stage groupings for the narrow 2-column "current → next" fallback.
  const STAGE_SLOTS = [
    { label: "Round of 32", ids: [...LEFT[0], ...RIGHT[0]] },
    { label: "Round of 16", ids: [...LEFT[1], ...RIGHT[1]] },
    { label: "Quarter-finals", ids: [...LEFT[2], ...RIGHT[2]] },
    { label: "Semi-finals", ids: [...LEFT[3], ...RIGHT[3]] },
    { label: "Final", ids: ["M104"] }
  ];
  const currentStage = Math.max(
    0,
    STAGE_SLOTS.findIndex(s => s.ids.some(id => !resolve(id).winner))
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bungee text-slate-100 flex items-center gap-3">
            <Route className="w-6 h-6 text-yellow-400" />
            ROAD TO FINAL
          </h2>
          <p className="text-xs text-slate-400 font-outfit mt-1">Trace each contender's path through the knockout bracket to the final</p>
        </div>
        <span className="text-xs px-3 py-1 bg-slate-950 border-2 border-slate-900 rounded-full text-yellow-400 font-bungee uppercase tracking-wider self-start sm:self-auto">
          Knockouts
        </span>
      </div>

      {/* Wide screens: the full mirrored bracket tree. Breaks out of the page's
          max-width to use the whole viewport, scrolling only if still too narrow. */}
      <div className="hidden xl:block relative left-1/2 right-1/2 -mx-[50vw] w-screen px-6 overflow-x-auto pb-2">{renderTree()}</div>

      {/* Narrow screens: the current round and the round it feeds into, side by
          side — see who you're up against and the potential next matchup. */}
      <div className="xl:hidden">{renderTwoColumn()}</div>
    </div>
  );

  // ── Wide bracket tree ──────────────────────────────────────────────────
  function renderTree() {
    type Col =
      | { kind: "cards"; label: string; ids: string[] }
      | { kind: "conn"; count: number; side: "left" | "right" }
      | { kind: "center" };
    const cols: Col[] = [
      { kind: "cards", label: "Round of 32", ids: LEFT[0] },
      { kind: "conn", count: 4, side: "left" },
      { kind: "cards", label: "Round of 16", ids: LEFT[1] },
      { kind: "conn", count: 2, side: "left" },
      { kind: "cards", label: "Quarter-final", ids: LEFT[2] },
      { kind: "conn", count: 1, side: "left" },
      { kind: "cards", label: "Semi-final", ids: LEFT[3] },
      { kind: "center" },
      { kind: "cards", label: "Semi-final", ids: RIGHT[3] },
      { kind: "conn", count: 1, side: "right" },
      { kind: "cards", label: "Quarter-final", ids: RIGHT[2] },
      { kind: "conn", count: 2, side: "right" },
      { kind: "cards", label: "Round of 16", ids: RIGHT[1] },
      { kind: "conn", count: 4, side: "right" },
      { kind: "cards", label: "Round of 32", ids: RIGHT[0] }
    ];

    return (
      <div className="min-w-max mx-auto w-fit">
        {/* Stage header row, aligned to the columns below */}
        <div className="flex items-end mb-3">
          {cols.map((c, i) =>
            c.kind === "cards" ? (
              <div key={i} className="w-[132px] text-center text-[10px] uppercase font-bungee tracking-widest text-slate-400">{c.label}</div>
            ) : c.kind === "conn" ? (
              <div key={i} className="w-5" />
            ) : (
              <div key={i} className="w-[178px] text-center text-[10px] uppercase font-bungee tracking-widest text-yellow-400">Final</div>
            )
          )}
        </div>

        <div className="flex items-stretch" style={{ height: 1100 }}>
          {cols.map((c, i) => {
            if (c.kind === "conn") return <Connector key={i} count={c.count} side={c.side} />;
            if (c.kind === "center") return renderCenter(i);
            return (
              <div key={i} className="w-[132px] flex flex-col justify-around">
                {c.ids.map(id => (
                  <div key={id} className="h-[120px] flex items-stretch">
                    {renderCard(id)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderCenter(key: number) {
    return (
      <div key={key} className="flex items-center">
        <div className="w-5 self-center h-px bg-slate-700" />
        <div className="w-[168px] flex flex-col justify-center gap-8">
          <div className="ring-1 ring-yellow-400/40 rounded-xl shadow-lg shadow-yellow-400/5">{renderCard("M104")}</div>
          <div>
            <p className="text-center text-[10px] uppercase font-bungee tracking-widest text-slate-500 mb-2">3rd place</p>
            {renderCard("M103")}
          </div>
        </div>
        <div className="w-5 self-center h-px bg-slate-700" />
      </div>
    );
  }

  // ── Narrow 2-column view ───────────────────────────────────────────────
  function renderTwoColumn() {
    const left = STAGE_SLOTS[currentStage];
    const right = STAGE_SLOTS[currentStage + 1];
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <h3 className="text-xs uppercase font-bungee tracking-widest text-slate-300 mb-3">{left.label}</h3>
          <div className="space-y-3">{left.ids.map(id => <div key={id}>{renderCard(id)}</div>)}</div>
        </div>
        <div>
          <h3 className="text-xs uppercase font-bungee tracking-widest text-slate-500 mb-3">
            {right ? right.label : "Champion"}
          </h3>
          <div className="space-y-3">
            {right ? right.ids.map(id => <div key={id}>{renderCard(id)}</div>) : <ChampionCard />}
          </div>
        </div>
      </div>
    );
  }

  function ChampionCard() {
    const champ = resolve("M104").winner;
    const owner = champ ? ownerOf.get(champ) : undefined;
    return (
      <div className="bento-card !p-4 text-center">
        <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
        {champ ? (
          <>
            <p className="font-bungee text-slate-100 text-sm">{owner?.name ?? "—"}</p>
            <p className="text-[11px] text-slate-400 font-outfit mt-0.5">{emojiOf.get(champ) ?? "🏳️"} {champ}</p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500 font-outfit">To be crowned</p>
        )}
      </div>
    );
  }

  // ── A single match card, shared by both layouts ────────────────────────
  function renderCard(id: string) {
    const res = resolve(id);
    const fx = res.fx;
    const teamA = fx?.teamHome ?? res.teamA;
    const teamB = fx?.teamAway ?? res.teamB;
    const scoreA = fx?.played ? fx.scoreHome : null;
    const scoreB = fx?.played ? fx.scoreAway : null;
    const isFinal = id === "M104";
    return (
      <div className={`bento-card !p-0 overflow-hidden w-full ${isFinal ? "border-yellow-400/40" : ""}`}>
        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-900/70">
          <span className="text-[9px] font-bungee tracking-wider text-slate-600">{id}</span>
          <span className="text-[9px] text-slate-500 font-outfit truncate">{kickoffLabel(id, fx)}</span>
        </div>
        {renderSide(teamA, placeholder(id, 0), scoreA, res.winner === teamA && !!teamA, fx?.played)}
        <div className="border-t border-slate-900/70" />
        {renderSide(teamB, placeholder(id, 1), scoreB, res.winner === teamB && !!teamB, fx?.played)}
      </div>
    );
  }

  function renderSide(team: string | undefined, ph: string, score: number | null, won: boolean, played?: boolean) {
    if (!team) {
      return (
        <div className="px-2 py-1.5">
          <span className="text-[11px] font-outfit text-slate-600">{ph}</span>
        </div>
      );
    }
    const owner = ownerOf.get(team);
    const lost = played && !won;
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1.5 ${won ? "bg-yellow-400/[0.06]" : ""}`}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: owner?.color ?? "#64748b", opacity: lost ? 0.4 : 1 }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className={`text-xs font-bold truncate ${lost ? "text-slate-500" : "text-slate-100"}`}>{owner?.name ?? "—"}</span>
            {won && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
          </div>
          <span className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] flex-shrink-0" style={{ opacity: lost ? 0.4 : 1 }}>{emojiOf.get(team) ?? "🏳️"}</span>
            <span className={`text-[10px] font-outfit truncate ${lost ? "text-slate-600" : "text-slate-400"}`}>{team}</span>
          </span>
        </div>
        <span className={`font-bungee text-xs flex-shrink-0 tabular-nums ${won ? "text-yellow-400" : lost ? "text-slate-600" : "text-slate-400"}`}>
          {played ? score : ""}
        </span>
      </div>
    );
  }

  // Placeholder for an undecided side: "W74" (winner of M74) or, for the
  // third-place tie, "RU101" (runner-up of the semi-final).
  function placeholder(id: string, i: 0 | 1): string {
    if (isR32Slot(id)) return "TBD";
    if (id === "M103") return "RU" + THIRD_FEEDS[i].slice(1);
    return "W" + FEEDS[id][i].slice(1);
  }

  function kickoffLabel(_id: string, fx?: KnockoutFixture): string {
    const iso = fx?.kickoff;
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  }
}

// A bracket connector column: one cell per parent match, each drawing the ⊐
// shape linking the parent to its two children (25% / 75% of the cell). The
// cell height is exactly twice the child spacing, so the proportions line up.
function Connector({ count, side }: { count: number; side: "left" | "right" }) {
  const childX = side === "left" ? "left-0" : "left-1/2";
  const parentX = side === "left" ? "left-1/2" : "left-0";
  return (
    <div className="w-5 flex flex-col justify-around flex-shrink-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative flex-1">
          <span className={`absolute ${childX} top-1/4 w-1/2 h-px bg-slate-700`} />
          <span className={`absolute ${childX} top-3/4 w-1/2 h-px bg-slate-700`} />
          <span className="absolute left-1/2 top-1/4 h-1/2 w-px bg-slate-700" />
          <span className={`absolute ${parentX} top-1/2 w-1/2 h-px bg-slate-700`} />
        </div>
      ))}
    </div>
  );
}
