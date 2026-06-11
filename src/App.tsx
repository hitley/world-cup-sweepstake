import { useEffect, useState, useRef } from "react";
import { SweepstakeState, Participant, MATCHDAY_DATES } from "./types";
import DashboardStats from "./components/DashboardStats";
import MatchesTimeline from "./components/MatchesTimeline";
import SvgCharts from "./components/SvgCharts";
import SetupDialog from "./components/SetupDialog";
import html2canvas from "html2canvas";
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
  Download,
  Printer
} from "lucide-react";

export default function App() {
  const [state, setState] = useState<SweepstakeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [activeTab, setActiveTab ] = useState<"standings" | "matches" | "trends">("standings");
  const [error, setError] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // Loading quotes pool
  const LOADING_QUOTES = [
    "Referees tuning their whistles...",
    "Gemini studying soccer tactical sheets...",
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
      const res = await fetch("/api/worldcup/state");
      if (!res.ok) throw new Error("Failed to contact full-stack server state");
      const data = await res.json();
      setState(data);
      setError(null);
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
      const res = await fetch("/api/worldcup/fetch-results", {
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
      const res = await fetch("/api/worldcup/reset", {
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
      const res = await fetch("/api/worldcup/update-setup", {
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

  // Handle Export Poster to PNG
  const handleExportPoster = async () => {
    if (!posterRef.current) return;
    
    try {
      setIsLoading(true);
      // Make the poster temporarily visible for capture
      posterRef.current.style.visibility = "visible";
      posterRef.current.style.position = "fixed";
      posterRef.current.style.left = "0";
      posterRef.current.style.top = "0";
      posterRef.current.style.zIndex = "9999";
      posterRef.current.style.pointerEvents = "none";
      
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        logging: true,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          const tag = element.tagName.toLowerCase();
          return tag === 'script' || tag === 'style';
        }
      });
      
      // Hide the poster again
      posterRef.current.style.position = "absolute";
      posterRef.current.style.left = "-100%";
      posterRef.current.style.visibility = "hidden";
      posterRef.current.style.zIndex = "-1000";
      
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `world-cup-sweepstake-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setError(null);
    } catch (err) {
      console.error("Export failed:", err);
      if (posterRef.current) {
        posterRef.current.style.position = "absolute";
        posterRef.current.style.left = "-100%";
        posterRef.current.style.visibility = "hidden";
      }
      setError("Failed to export poster. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <button
              onClick={() => setPrintMode(prev => !prev)}
              className={`p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl transition border border-white/5 cursor-pointer ${printMode ? 'ring-2 ring-blue-400/30' : ''}`}
              title={printMode ? "Exit print-friendly view" : "Show print-friendly view"}
            >
              <Printer className="w-4 h-4" />
              <span className="sr-only">{printMode ? "Exit Print View" : "Print View"}</span>
            </button>

            {!printMode && (
              <>
                <button
                  onClick={() => setShowSetup(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold font-outfit rounded-xl flex items-center gap-2 text-xs border border-white/10 transition duration-150 active:scale-95 cursor-pointer uppercase tracking-wider"
                  title="Open Setup Room"
                >
                  <Settings className="w-4 h-4" />
                  <span>Draft Setup</span>
                </button>

                <button
                  onClick={handleExportPoster}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl transition border border-white/5 cursor-pointer"
                  title="Export as PNG Poster"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetTournament}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition border border-white/5 cursor-pointer"
                  title="Reset Sweepstake"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      {printMode ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-outfit">
          <div className="space-y-8">
            <div className="bg-slate-950/90 border border-slate-900 rounded-3xl p-8">
              <div className="flex flex-col gap-4 items-start">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-400 text-slate-950 rounded-2xl font-black shadow-lg shadow-yellow-400/10 rotate-1">
                    <Trophy className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="font-bungee text-3xl text-yellow-400 uppercase tracking-widest leading-none">
                      WORLD CUP 2026 <span className="text-rose-500 underline decoration-rose-500/80 decoration-2">SWEEPSTAKE</span>
                    </h1>
                    <p className="text-sm text-slate-400 uppercase tracking-wide font-outfit">
                      Matchday Live Portal & Survival Probability Math
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide font-bold">Print-friendly mode enabled. Use browser Print / Save as PDF after reviewing.</div>
              </div>
            </div>

            <DashboardStats
              participants={state.participants}
              teams={state.teams}
              history={state.history}
              forceExpandAll={true}
            />

            <div className="p-6 bg-slate-900/80 border-2 border-slate-800 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bungee text-amber-400 uppercase tracking-widest">Prize Distribution</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
                  <div className="text-3xl font-black text-amber-400">65%</div>
                  <div className="mt-2 text-slate-400">Tournament Winner</div>
                </div>
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
                  <div className="text-3xl font-black text-orange-400">20%</div>
                  <div className="mt-2 text-slate-400">Runner-Up</div>
                </div>
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
                  <div className="text-3xl font-black text-rose-400">5%</div>
                  <div className="mt-2 text-slate-400">3rd Place</div>
                </div>
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
                  <div className="text-3xl font-black text-slate-400">5%</div>
                  <div className="mt-2 text-slate-400">Wooden Spoon</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-outfit">
          {/* Poster Export Section - Hidden off-screen but ready for capture */}
          <div
            ref={posterRef}
            style={{
              width: "1200px",
              left: "-1400px",
              zIndex: -1000,
              visibility: "hidden",
              position: "absolute",
              top: "0",
              backgroundColor: "#0f172a",
              padding: "32px",
              pointerEvents: "none"
            }}
          >
            {/* Poster Header */}
            <div style={{ marginBottom: "32px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <div style={{
                  padding: "16px",
                  backgroundColor: "#facc15",
                  color: "#0f172a",
                  borderRadius: "16px",
                  fontWeight: "900",
                  boxShadow: "0 20px 25px -5px rgba(250, 204, 21, 0.1)",
                  transform: "rotate(1deg)",
                  width: "fit-content"
                }}>
                  <Trophy className="w-8 h-8" style={{ stroke: "#0f172a", strokeWidth: "2.5" }} />
                </div>
              </div>
              <h1 style={{
                fontFamily: "bungee",
                fontSize: "36px",
                color: "#facc15",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                lineHeight: "1"
              }}>
                WORLD CUP 2026 <span style={{ color: "#f43f5e", textDecoration: "underline", textDecorationColor: "#f43f5e", textDecorationThickness: "2px" }}>SWEEPSTAKE</span>
              </h1>
              <p style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "outfit", marginTop: "8px", letterSpacing: "0.05em" }}>
                Matchday Live Portal & Survival Probability Math
              </p>
            </div>

            {/* Static Poster Stats Section */}
            {state && (
              <div>
                {/* Prize Distribution Card */}
                <div style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid rgba(251, 146, 60, 0.2)",
                  borderRadius: "24px",
                  padding: "24px",
                  marginBottom: "24px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Trophy className="w-5 h-5" style={{ color: "#fbbf24" }} />
                    <h3 style={{
                      fontFamily: "bungee",
                      color: "#fbbf24",
                      textTransform: "uppercase",
                      letterSpacing: "0.125em",
                      fontSize: "14px"
                    }}>Prize Distribution</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "900", color: "#facc15" }}>65%</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Tournament Winner</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "900", color: "#fb923c" }}>20%</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Runner-Up</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "900", color: "#f43f5e" }}>5%</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>3rd Place</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", fontWeight: "900", color: "#64748b" }}>5%</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Bottom Team</div>
                    </div>
                  </div>
                </div>

                {/* Standings */}
                <div style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid rgba(250, 204, 21, 0.1)",
                  borderRadius: "24px",
                  padding: "24px",
                  marginBottom: "24px"
                }}>
                  <h3 style={{
                    fontFamily: "bungee",
                    color: "#facc15",
                    textTransform: "uppercase",
                    letterSpacing: "0.125em",
                    fontSize: "14px",
                    marginBottom: "16px"
                  }}>Sweepstake Standings</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                    {state.participants.map((p, idx) => {
                      const pts = p.teams.reduce((acc, tName) => {
                        const team = state.teams.find(t => t.name.toLowerCase() === tName.toLowerCase());
                        return acc + (team?.points || 0);
                      }, 0);
                      const activeCount = p.teams.filter(tName => {
                        const team = state.teams.find(t => t.name.toLowerCase() === tName.toLowerCase());
                        return team?.status === "Active";
                      }).length;

                      return (
                        <div key={p.name} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "rgba(30, 41, 59, 0.5)",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.05)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              fontWeight: "900",
                              color: "#facc15",
                              fontSize: "18px",
                              width: "24px"
                            }}>{idx + 1}</div>
                            <div>
                              <div style={{ fontWeight: "600", color: "#ffffff" }}>{p.name}</div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{activeCount}/3 Active</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: "900", color: "#facc15" }}>{pts} Pts</div>
                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>{(pts / state.participants.length * 100).toFixed(0)}% Share</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

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
                    : MATCHDAY_DATES[state.currentDayIndex - 1] || "Knockout stage"}
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
                  ? `Last update — ${latestHistory.date}: "${latestHistory.wittyNarrative}"`
                  : "No results fetched yet. Kick off the tournament when you're ready!"}
              </p>
            </div>
            <button
              onClick={handleProgressMatchday}
              disabled={isLoading}
              className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-bungee rounded-xl flex items-center gap-2 text-xs uppercase tracking-wider transition duration-150 active:scale-95 cursor-pointer flex-shrink-0 shadow-lg shadow-yellow-400/10"
            >
              <Play className="w-4 h-4" />
              Fetch Next Matchday
            </button>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 border-b-2 border-slate-900 pb-0">
            {([
              { id: "standings", label: "Standings", icon: Trophy },
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
          <p className="text-slate-550 text-xs mt-3">Gemini model is scanning web scores or running tactical math...</p>
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
              Are you sure you want to reset the sweepstake standings? All matchday history will be cleared and reset to Day 0 (Eve of World Cup).
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
