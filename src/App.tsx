import { useEffect, useState } from "react";
import { SweepstakeState, Participant } from "./types";
import DashboardStats from "./components/DashboardStats";
import MatchesTimeline from "./components/MatchesTimeline";
import SvgCharts from "./components/SvgCharts";
import XpLadder from "./components/XpLadder";
import SetupDialog from "./components/SetupDialog";
import {
  Trophy,
  Calendar,
  Settings,
  RefreshCw,
  Activity,
  Users,
  Skull,
  Play,
  AlertCircle,
  TrendingUp,
  ListOrdered,
  Printer
} from "lucide-react";

// Competition slug comes from ?c=<slug> when running locally against the API.
// On the static deployment each competition lives in its own folder with a
// sweepstake.json next to index.html, and the app runs read-only.
const competition = new URLSearchParams(window.location.search).get("c");
const apiBase = `/api/${competition}/worldcup`;

export default function App() {
  const [state, setState] = useState<SweepstakeState | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [competitions, setCompetitions] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [activeTab, setActiveTab ] = useState<"standings" | "ladder" | "matches" | "trends">("standings");
  const [error, setError] = useState<string | null>(null);

  // Loading quotes pool
  const LOADING_QUOTES = [
    "Referees tuning their whistles...",
    "Studying soccer tactical sheets...",
    "Vesting pitch grass on the stadiums...",
    "Warming up the virtual keyboards...",
    "Fetching coordinates of Mbappé's boots...",
    "Consulting statistical supercomputers...",
    "Preparing witty commentaries...",
    "Inspecting VR VAR cameras..."
  ];

  // Fetch current sweepstake state
  const fetchState = async (silently = false) => {
    if (!silently) setIsLoading(true);
    try {
      if (competition) {
        // Local admin mode: talk to the Express API for the chosen competition
        const res = await fetch(`${apiBase}/state`);
        if (!res.ok) throw new Error("Failed to contact full-stack server state");
        setState(await res.json());
        setError(null);
        return;
      }

      // No competition in the URL: either a static read-only deployment
      // (sweepstake.json sits next to index.html) or the local picker.
      const staticRes = await fetch("sweepstake.json", { cache: "no-store" });
      const contentType = staticRes.headers.get("content-type") || "";
      if (staticRes.ok && contentType.includes("json")) {
        // Static files skip the server's read-time normalization, so guard
        // against missing fields in older state snapshots
        const data = await staticRes.json();
        setState({ participants: [], teams: [], currentDayIndex: 0, history: [], ...data });
        setReadOnly(true);
        setError(null);
        return;
      }

      const listRes = await fetch("/api/competitions");
      if (!listRes.ok) throw new Error("No competitions available");
      setCompetitions(await listRes.json());
    } catch (err: any) {
      console.error(err);
      setError("Cannot sync with server. Check if local backend dev server has completed setup.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Set up rotation of loaders
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        const randomQuote = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
        setLoadingMsg(randomQuote);
      }, 2500);
      setLoadingMsg(LOADING_QUOTES[0]);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Handle Fetch Results for next Matchday
  const handleProgressMatchday = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/fetch-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Server match processing error");
      }
      const updated = await res.json();
      setState(updated);
      
      // Auto switch to matches page to see immediate outcomes
      setActiveTab("matches");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process match results. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Reset Tournament Trigger
  const handleResetTournament = () => {
    setShowResetConfirm(true);
  };

  const executeResetTournament = async () => {
    setShowResetConfirm(false);
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "Real" })
      });
      const data = await res.json();
      setState(data);
      setActiveTab("standings");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to reset database on the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle custom setup dialog save
  const handleSaveSetup = async (updatedParticipants: Participant[]) => {
    setShowSetup(false);
    setIsLoading(true);
    try {
      // Put setup
      const res = await fetch(`${apiBase}/update-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: updatedParticipants })
      });
      const data = await res.json();
      setState(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to apply your newly drafted sweepstake settings.");
    } finally {
      setIsLoading(false);
    }
  };

  // Local admin landing: no competition chosen yet, offer the available ones
  if (!state && competitions) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 select-none font-outfit gap-6">
        <div className="absolute top-0 w-full h-[300px] bg-amber-500/5 blur-3xl rounded-full -z-10" />
        <div className="p-4 bg-yellow-400 text-slate-950 rounded-2xl shadow-lg shadow-yellow-400/10 rotate-1">
          <Trophy className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="text-center">
          <h1 className="font-bungee text-2xl text-yellow-400 uppercase">Pick a competition</h1>
          <p className="text-xs text-slate-500 mt-2">Each competition keeps its own draft, standings, and matchday history.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {competitions.length === 0 && (
            <p className="text-xs text-center text-slate-500">
              No competitions found. Create a folder under <code className="text-slate-300">config/competitions/</code> to start one.
            </p>
          )}
          {competitions.map(c => (
            <a
              key={c}
              href={`?c=${c}`}
              className="px-5 py-4 bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-yellow-400/50 rounded-2xl text-center font-bungee text-slate-200 uppercase tracking-wider transition"
            >
              {c}
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 select-none font-sans">
        <div className="absolute top-0 w-full h-[300px] bg-amber-500/5 blur-3xl rounded-full -z-10" />
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-300">Warming Up Game Day Arena...</p>
        <p className="text-xs text-slate-500 mt-2">Checking full-stack ports and server state structures.</p>
      </div>
    );
  }

  // Find active dates/records
  const latestHistory = state.history[state.history.length - 1];
  const allSquads = state.teams;
  const activeCount = allSquads.filter(t => t.status === "Active").length;
  const eliminatedCount = allSquads.filter(t => t.status === "Eliminated").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 select-none pb-12 font-sans relative overflow-x-hidden">
      {/* Background decoration flares */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[#1e1b4b]/20 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-indigo-950/15 blur-3xl -z-10 pointer-events-none" />

      {/* Main Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b-2 border-slate-900 sticky top-0 z-40 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-400 text-slate-950 rounded-2xl font-black shadow-lg shadow-yellow-400/10 rotate-1">
              <Trophy className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bungee text-2xl sm:text-3xl text-yellow-400 tracking-tighter uppercase leading-none">
                WORLD CUP 2026 <span className="text-rose-500 underline decoration-rose-500/80 decoration-2">SWEEPSTAKE</span>
              </h1>
              <p className="text-xs text-slate-400 font-outfit mt-1 tracking-wide">
                Matchday Live Portal & Survival Probability Math
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Admin controls: hidden on the read-only deployment, kept in the
                layout (invisible) during print mode so the print button never shifts */}
            {!readOnly && (
              <>
                <button
                  onClick={handleResetTournament}
                  className={`p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition border border-white/5 cursor-pointer ${printMode ? 'invisible' : ''}`}
                  title="Reset Sweepstake"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowSetup(true)}
                  className={`px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold font-outfit rounded-xl flex items-center gap-2 text-xs border border-white/10 transition duration-150 active:scale-95 cursor-pointer uppercase tracking-wider ${printMode ? 'invisible' : ''}`}
                  title="Open Setup Room"
                >
                  <Settings className="w-4 h-4" />
                  <span>Draft Setup</span>
                </button>
              </>
            )}

            <button
              onClick={() => setPrintMode(prev => !prev)}
              className={`p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl transition border border-white/5 cursor-pointer ${printMode ? 'ring-2 ring-blue-400/30' : ''}`}
              title={printMode ? "Exit print-friendly view" : "Show print-friendly view"}
            >
              <Printer className="w-4 h-4" />
              <span className="sr-only">{printMode ? "Exit Print View" : "Print View"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      {printMode ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-outfit">
          <div className="space-y-8">
            <DashboardStats
              participants={state.participants}
              teams={state.teams}
              history={state.history}
              forceExpandAll={true}
            />
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-outfit">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <div>
                <div className="font-bungee text-xs uppercase tracking-wider text-rose-400 mb-1">Sync Problem</div>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Tournament status stats bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bento-card p-5 flex items-center gap-4">
              <div className="p-3 bg-yellow-400/10 text-yellow-400 rounded-2xl border border-yellow-400/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bungee text-slate-100 leading-none">
                  {state.currentDayIndex === 0 ? "Eve" : `Day ${state.currentDayIndex}`}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                  {state.currentDayIndex === 0
                    ? "Tournament not started"
                    : latestHistory?.date || "In progress"}
                </div>
              </div>
            </div>

            <div className="bento-card p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bungee text-slate-100 leading-none">{activeCount}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Teams Alive</div>
              </div>
            </div>

            <div className="bento-card p-5 flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                <Skull className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bungee text-slate-100 leading-none">{eliminatedCount}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Knocked Out</div>
              </div>
            </div>

            <div className="bento-card p-5 flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bungee text-slate-100 leading-none">{state.participants.length}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Contenders</div>
              </div>
            </div>
          </div>

          {/* Matchday action + latest roundup */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bento-card">
            <div className="min-w-0">
              <div className="text-xs font-bungee text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                Matchday Control Room
              </div>
              <p className="text-xs text-slate-400 truncate">
                {latestHistory
                  ? `Through ${latestHistory.date} (Day ${state.currentDayIndex}): "${latestHistory.wittyNarrative}"`
                  : "No results synced yet. Pull the latest scores when you're ready!"}
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={handleProgressMatchday}
                disabled={isLoading}
                title="Pull all finished World Cup results to date (safe to re-run)"
                className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-bungee rounded-xl flex items-center gap-2 text-xs uppercase tracking-wider transition duration-150 active:scale-95 cursor-pointer flex-shrink-0 shadow-lg shadow-yellow-400/10"
              >
                <Play className="w-4 h-4" />
                Sync Latest Results
              </button>
            )}
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 border-b-2 border-slate-900 pb-0">
            {([
              { id: "standings", label: "Standings", icon: Trophy },
              { id: "ladder", label: "XP Ladder", icon: ListOrdered },
              { id: "matches", label: "Matches", icon: Calendar },
              { id: "trends", label: "Trends", icon: TrendingUp }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-t-xl text-xs font-bungee uppercase tracking-wider flex items-center gap-2 transition cursor-pointer border-2 border-b-0 ${
                  activeTab === tab.id
                    ? "bg-slate-900 border-slate-800 text-yellow-400"
                    : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          {activeTab === "standings" && (
            <DashboardStats
              participants={state.participants}
              teams={state.teams}
              history={state.history}
            />
          )}

          {activeTab === "ladder" && (
            <XpLadder
              participants={state.participants}
              teams={state.teams}
            />
          )}

          {activeTab === "matches" && (
            <MatchesTimeline
              history={state.history}
              activeDayIndex={state.currentDayIndex}
            />
          )}

          {activeTab === "trends" && (
            <SvgCharts
              history={state.history}
              participants={state.participants}
            />
          )}
        </main>
      )}
      {/* Hilarious loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-slate-350 select-none">
          <div className="relative mb-6">
            <Trophy className="w-16 h-16 text-amber-500 animate-pulse" />
            <div className="absolute inset-0 border-2 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin w-full h-full" />
          </div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 block mb-1">
            Stadium Broadcaster Live Feed
          </span>
          <p className="text-slate-200 font-extrabold text-sm text-center">{loadingMsg}</p>
          <p className="text-slate-550 text-xs mt-3">Fetching real World Cup results and tallying XP...</p>
        </div>
      )}

      {/* Setup / Draft room dialog */}
      {showSetup && (
        <SetupDialog
          initialParticipants={state.participants}
          allTeams={state.teams}
          onClose={() => setShowSetup(false)}
          onSave={handleSaveSetup}
        />
      )}

      {/* Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="font-bungee text-lg text-rose-500 uppercase">Reset Standing?</h3>
            </div>
            <p className="text-xs text-slate-350 font-outfit leading-relaxed">
              Are you sure you want to reset the tournament? All matchday history will be cleared and reset to Day 0 (Eve of World Cup). The tournament is <span className="text-rose-400 font-bold">shared across all competitions</span>, so every group's standings reset — drafts are kept.
            </p>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeResetTournament}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-rose-600/10 cursor-pointer"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
