import { useEffect, useState } from "react";
import { Participant, Team, KnockoutFixture, GroupFixture } from "../types";
import { buildPrizes, Prize } from "@/lib/prizes";
import { buildTable } from "@/lib/headToHead";
import { motion, useReducedMotion } from "motion/react";
import { Trophy, X, Medal, Swords, Star, ListOrdered, ChevronLeft, ChevronRight } from "lucide-react";
import { trackEvent } from "../analytics";

interface WinnersModalProps {
  participants: Participant[];
  teams: Team[];
  knockout: KnockoutFixture[];
  groupFixtures: GroupFixture[];
  onClose: () => void;
}

// Rank badge shown on each prize row (top → bottom).
const RANK_BADGE: Record<string, string> = { "1": "🥇", "2": "🥈", "3": "🥉", "4": "4️⃣", spoon: "🥄" };

// The reveal modal that announces the sweepstake prize winners over a blurred
// page. Page 1 = the real prizes (top 4 + wooden spoon, decided by the actual
// tournament outcome). Page 2 = fun secondary honours. Click-away / Esc / the X
// all dismiss it so people can carry on browsing.
export default function WinnersModal({ participants, teams, knockout, groupFixtures, onClose }: WinnersModalProps) {
  const [page, setPage] = useState<0 | 1>(0);
  const reduceMotion = useReducedMotion();

  const teamByName = new Map(teams.map(t => [t.name.toLowerCase(), t]));
  const colorOf = new Map(participants.map(p => [p.name, p.color]));

  const prizes = buildPrizes(knockout, groupFixtures, participants);

  useEffect(() => {
    trackEvent("winners_modal_view");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goToPage = (p: 0 | 1) => { setPage(p); trackEvent("winners_modal_page", { page: p }); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-white/5 transition cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Close winners</span>
        </button>

        {/* Header */}
        <div className="text-center px-6 pt-8 pb-4">
          <div className="inline-flex p-4 bg-yellow-400 text-slate-950 rounded-2xl shadow-lg shadow-yellow-400/20 rotate-1 mb-4">
            <Trophy className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="font-bungee text-2xl sm:text-3xl text-yellow-400 uppercase tracking-tight leading-none">
            {page === 0 ? "The Winners" : "Extra Honours"}
          </h2>
          <p className="text-xs text-slate-400 font-outfit mt-2">
            {page === 0
              ? "World Cup 2026 sweepstake — final standings"
              : "Bragging rights beyond the prize money"}
          </p>
        </div>

        <div className="px-5 sm:px-6 pb-6">
          {page === 0 ? (
            <PrizeList prizes={prizes} teamByName={teamByName} colorOf={colorOf} reduceMotion={!!reduceMotion} />
          ) : (
            <Honours
              participants={participants}
              teams={teams}
              groupFixtures={groupFixtures}
              teamByName={teamByName}
              colorOf={colorOf}
            />
          )}
        </div>

        {/* Pager footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t-2 border-slate-800 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => goToPage(0)}
            disabled={page === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-default text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4" /> Prizes
          </button>

          <div className="flex items-center gap-2">
            {[0, 1].map(i => (
              <button
                key={i}
                onClick={() => goToPage(i as 0 | 1)}
                className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${page === i ? "bg-yellow-400" : "bg-slate-700 hover:bg-slate-600"}`}
                title={i === 0 ? "Prizes" : "Extra honours"}
              >
                <span className="sr-only">Page {i + 1}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => goToPage(1)}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-default text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
          >
            Honours <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Page 1: the prize rows. Rendered bottom (spoon) → top (champions) so the
// staggered reveal lands the winner last.
function PrizeList({
  prizes, teamByName, colorOf, reduceMotion
}: {
  prizes: Prize[];
  teamByName: Map<string, Team>;
  colorOf: Map<string, string>;
  reduceMotion: boolean;
}) {
  // prizes are top→bottom; reveal spoon first, champions last
  const revealOrder = [...prizes].reverse();
  const total = revealOrder.length;

  return (
    <div className="flex flex-col gap-3">
      {prizes.map(prize => {
        const team = prize.team ? teamByName.get(prize.team.toLowerCase()) : undefined;
        const isChampion = prize.rank === 1;
        const isSpoon = prize.rank === "spoon";
        const color = prize.contender ? colorOf.get(prize.contender) : undefined;
        // reveal index counts from the bottom of the list
        const revealIdx = revealOrder.findIndex(p => p.rank === prize.rank);

        return (
          <motion.div
            key={String(prize.rank)}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.15 + (revealIdx / total) * 0.9, duration: 0.4, ease: "easeOut" }}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${
              isChampion
                ? "bg-yellow-400/10 border-yellow-400/40 ring-2 ring-yellow-400/20"
                : isSpoon
                ? "bg-slate-950/60 border-slate-800"
                : "bg-slate-950/50 border-slate-800"
            }`}
          >
            {/* Rank badge */}
            <div className="flex-shrink-0 w-12 text-center">
              <div className="text-3xl leading-none">{RANK_BADGE[String(prize.rank)]}</div>
              <div className="text-[9px] uppercase font-bungee tracking-wider text-slate-500 mt-1">{prize.label}</div>
            </div>

            {/* Team + contender */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{team?.emoji ?? "🏳️"}</span>
                <span className="font-bold text-slate-100 truncate">{prize.team ?? "To be decided"}</span>
              </div>
              <div className="text-xs text-slate-400 font-outfit mt-0.5 truncate">{prize.detail}</div>
            </div>

            {/* Winner (contender) */}
            <div className="flex-shrink-0 text-right max-w-[40%]">
              {prize.contender ? (
                <>
                  <div className="text-[9px] uppercase font-bungee tracking-widest text-slate-500">Won by</div>
                  <div className="font-bungee text-sm sm:text-base truncate leading-tight" style={{ color: color || "#facc15" }}>
                    {prize.contender}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-600 italic font-outfit">{prize.team ? "Undrafted" : "—"}</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// A single honour row on page 2.
function HonourRow({
  icon, label, teamName, teamEmoji, contender, color, sub
}: {
  icon: React.ReactNode;
  label: string;
  teamName?: string;
  teamEmoji?: string;
  contender: string | null;
  color?: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-800 bg-slate-950/50">
      <div className="flex-shrink-0 p-2.5 bg-slate-900 rounded-xl border border-white/5 text-yellow-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-bungee tracking-widest text-slate-500">{label}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {teamEmoji && <span className="text-lg">{teamEmoji}</span>}
          <span className="font-bold text-slate-100 truncate">{teamName ?? contender ?? "—"}</span>
        </div>
        <div className="text-xs text-slate-400 font-outfit mt-0.5 truncate">{sub}</div>
      </div>
      {contender && (
        <div className="flex-shrink-0 text-right max-w-[40%]">
          <div className="text-[9px] uppercase font-bungee tracking-widest text-slate-500">Contender</div>
          <div className="font-bungee text-sm truncate leading-tight" style={{ color: color || "#facc15" }}>{contender}</div>
        </div>
      )}
    </div>
  );
}

// Page 2: fun secondary honours computed from the same data.
function Honours({
  participants, teams, groupFixtures, teamByName, colorOf
}: {
  participants: Participant[];
  teams: Team[];
  groupFixtures: GroupFixture[];
  teamByName: Map<string, Team>;
  colorOf: Map<string, string>;
}) {
  // XP ladder leader — same comparator as the XP Ladder tab.
  const xpRows = participants.map(p => {
    let xp = 0, wins = 0, goalPoints = 0;
    p.teams.forEach(name => {
      const t = teamByName.get(name.toLowerCase());
      if (!t) return;
      xp += t.points; wins += t.wins ?? 0; goalPoints += t.goalPoints ?? 0;
    });
    return { name: p.name, xp, wins, goalPoints };
  }).sort((a, b) => b.xp - a.xp || b.wins - a.wins || b.goalPoints - a.goalPoints || a.name.localeCompare(b.name));
  const xpLeader = xpRows[0];

  // Head-to-Head champion — reuse the existing contender-level table.
  const h2h = buildTable(groupFixtures, participants)[0];

  // Team of the sweepstake — highest-XP single drafted team.
  const drafterOf = new Map<string, string>();
  participants.forEach(p => p.teams.forEach(t => drafterOf.set(t.toLowerCase(), p.name)));
  const bestTeam = [...teams]
    .filter(t => drafterOf.has(t.name.toLowerCase()))
    .sort((a, b) => b.points - a.points || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name))[0];
  const bestTeamOwner = bestTeam ? drafterOf.get(bestTeam.name.toLowerCase()) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      {xpLeader && (
        <HonourRow
          icon={<ListOrdered className="w-5 h-5" />}
          label="XP Ladder Leader"
          contender={xpLeader.name}
          color={colorOf.get(xpLeader.name)}
          sub={`${xpLeader.xp} XP earned across the whole tournament`}
        />
      )}
      {h2h && h2h.played > 0 && (
        <HonourRow
          icon={<Swords className="w-5 h-5" />}
          label="Head-to-Head Champion"
          contender={h2h.name}
          color={colorOf.get(h2h.name)}
          sub={`${h2h.points} pts · ${h2h.wins}W ${h2h.draws}D ${h2h.losses}L in the group-stage duels`}
        />
      )}
      {bestTeam && (
        <HonourRow
          icon={<Star className="w-5 h-5" />}
          label="Team of the Sweepstake"
          teamName={bestTeam.name}
          teamEmoji={bestTeam.emoji}
          contender={bestTeamOwner}
          color={bestTeamOwner ? colorOf.get(bestTeamOwner) : undefined}
          sub={`${bestTeam.points} XP — the highest-scoring drafted squad`}
        />
      )}
      <div className="flex items-center gap-2 justify-center text-slate-600 text-[10px] uppercase font-bungee tracking-widest pt-2">
        <Medal className="w-3.5 h-3.5" /> That's a wrap on World Cup 2026
      </div>
    </div>
  );
}
