import { useState } from "react";
import { Participant, Team } from "../types";
import { Users, Trash2, Plus, X, Check, Search, AlertCircle, Shuffle } from "lucide-react";

interface SetupDialogProps {
  initialParticipants: Participant[];
  allTeams: Team[];
  onSave: (participants: Participant[]) => void;
  onClose: () => void;
}

const PLAYER_COLORS = [
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#e11d48", // Rose
  "#06b6d4"  // Cyan
];

export default function SetupDialog({
  initialParticipants,
  allTeams,
  onSave,
  onClose,
}: SetupDialogProps) {
  const [participants, setParticipants] = useState<Participant[]>([...initialParticipants]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUnassignedConfirm, setShowUnassignedConfirm] = useState(false);
  const [unassignedPlayerName, setUnassignedPlayerName] = useState("");

  const addPlayer = () => {
    setErrorMsg(null);
    if (!newPlayerName.trim()) return;
    if (participants.some((p: { name: string; }) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
      setErrorMsg("A player with this name already exists!");
      return;
    }

    const nextColor = PLAYER_COLORS[participants.length % PLAYER_COLORS.length];
    setParticipants([
      ...participants,
      { name: newPlayerName.trim(), teams: [], color: nextColor }
    ]);
    setNewPlayerName("");
  };

  const removePlayer = (index: number) => {
    setErrorMsg(null);
    const updated = [...participants];
    updated.splice(index, 1);
    setParticipants(updated);
  };

  const handleAutoDraft = () => {
    setErrorMsg(null);
    if (participants.length === 0) {
      setErrorMsg("Please add at least one participant first before drafting!");
      return;
    }

    // Shuffle active teams
    const teamNames = allTeams.map(t => t.name);
    const shuffledTeams = [...teamNames].sort(() => 0.5 - Math.random());

    // Reset all team mappings for participants
    const draftParticipants = participants.map((p: any) => ({
      ...p,
      teams: [] as string[]
    }));

    // Distribute teams evenly
    let pIdx = 0;
    while (shuffledTeams.length > 0) {
      const team = shuffledTeams.pop();
      if (team) {
        draftParticipants[pIdx].teams.push(team);
        pIdx = (pIdx + 1) % draftParticipants.length;
      }
    }

    setParticipants(draftParticipants);
  };

  const handleAssignTeam = (teamName: string, participantName: string) => {
    setParticipants((prev: Participant[]) => {
      return prev.map((p) => {
        const hasTeam = p.teams.includes(teamName);
        let teams = p.teams.filter((t) => t !== teamName);
        
        if (p.name === participantName) {
          if (!hasTeam) {
            teams = [...teams, teamName];
          }
        }
        return {
          ...p,
          teams
        };
      });
    });
  };

  const handleResetDraft = () => {
    setShowResetConfirm(true);
  };

  const executeResetDraft = () => {
    setParticipants((prev: Participant[]) => prev.map((p) => ({ ...p, teams: [] })));
    setShowResetConfirm(false);
  };

  const getTeamOwner = (teamName: string) => {
    const owner = participants.find((p) => p.teams.some((t) => t.toLowerCase() === teamName.toLowerCase()));
    return owner ? owner.name : "";
  };

  const handleSave = () => {
    setErrorMsg(null);
    // Validate if everyone has teams
    const unassigned = participants.find((p) => p.teams.length === 0);
    if (unassigned) {
      setUnassignedPlayerName(unassigned.name);
      setShowUnassignedConfirm(true);
      return;
    }
    onSave(participants);
  };

  const executeSaveWithUnassigned = () => {
    setShowUnassignedConfirm(false);
    onSave(participants);
  };

  // Check if each team is drafted
  const getDraftPoolStatus = () => {
    const drafted = new Set(participants.flatMap((p: { teams: any; }) => p.teams));
    const undrafted = allTeams.filter(t => !drafted.has(t.name));
    return {
      draftedCount: drafted.size,
      undrafted
    };
  };

  const poolStatus = getDraftPoolStatus();

  const filteredTeams = allTeams.filter(t => 
    t.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
    t.confed.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-outfit">
      <div 
        id="setup-dialog-box"
        className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-950 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-405 bg-yellow-400 text-slate-950 rounded-xl font-bold shadow-md shadow-yellow-400/10">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bungee text-yellow-400 uppercase tracking-tight">Draft Room & Setup</h2>
              <p className="text-xs text-slate-400 font-outfit">Assemble friends and draft real-world national teams</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mode selection removed — mode retained from current deployment when in Real mode */}

          <hr className="border-slate-950 border-t-2" />

          {/* Add Players and Distribute Panels */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bungee tracking-widest text-slate-400">2. Manage Friends List</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Friend's Name (e.g., Sarah, Alex)"
                value={newPlayerName}
                onChange={(e: { target: { value: any; }; }) => {
                  setNewPlayerName(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={(e: { key: string; }) => e.key === "Enter" && addPlayer()}
                className="flex-1 px-4 py-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl focus:outline-none focus:border-yellow-400 text-slate-200 text-sm font-outfit"
              />
              <button
                onClick={addPlayer}
                className="px-5 py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bungee text-sm tracking-wider uppercase rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-450 text-rose-400 font-outfit mt-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-rose-500 font-bold">⚠️</span> {errorMsg}
              </p>
            )}

            {/* List of current players */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {participants.map((p: { color: any; name: any; teams: any[]; }, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3.5 h-3.5 rounded-full block border border-slate-950/50 shadow-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <div>
                      <span className="font-bungee text-sm text-slate-100">{p.name}</span>
                      <p className="text-[10px] text-slate-400 font-outfit">
                        {p.teams.length > 0 
                          ? `Drafted teams count: ${p.teams.length} (${p.teams.join(", ")})` 
                          : "No teams assigned"
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removePlayer(idx)}
                    className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-lg transition cursor-pointer"
                    title="Remove Player"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No friends added yet. Add players below to kick off the draft!
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-950 border-t-2" />

          {/* Draft Distribution Options */}
          <div className="space-y-4">
            <div className="p-5 bg-slate-950/40 rounded-2xl border-2 border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs uppercase font-bungee tracking-widest text-slate-205 text-slate-200">3. Distribute National Teams</h4>
                  <p className="text-xs text-slate-400 font-outfit mt-1">
                    Total: {allTeams.length} teams. Currently drafted: <span className="text-yellow-400 font-bold">{poolStatus.draftedCount}</span>/{allTeams.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoDraft}
                  disabled={participants.length === 0}
                  className="px-4 py-2 bg-indigo-500/10 border-2 border-indigo-500/30 hover:bg-indigo-500/20 disabled:opacity-55 disabled:cursor-not-allowed text-indigo-400 font-bungee text-xs tracking-wider uppercase rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" /> Auto-Shuffle Pool
                </button>
              </div>

              {poolStatus.undrafted.length === 0 ? (
                <div className="text-xs p-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center gap-2 font-outfit">
                  <Check className="w-3.5 h-3.5" /> Everyone successfully assigned World Cup teams!
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 font-outfit">
                  Remaining pool size: {poolStatus.undrafted.length} squads left. Click "Auto-Shuffle" to assign instantly, or assign manually below!
                </div>
              )}
            </div>

            {/* Manual Assignment Desk Grid (The requested feature to add real list of who drew which team) */}
            <div className="p-5 bg-slate-950/40 rounded-2xl border-2 border-slate-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="text-xs uppercase font-bungee tracking-widest text-yellow-400">4. Manual Assignment Board</h4>
                  <p className="text-xs text-slate-400 font-outfit mt-0.5">Assign exact teams manually to match your real-world draw list</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="text-[10px] font-bungee uppercase tracking-wider px-2.5 py-1 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-lg transition cursor-pointer"
                >
                  Unassign All
                </button>
              </div>

              {/* Search Filter for Teams */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter teams (e.g. Brazil, UEFA...)"
                  value={teamSearch}
                  onChange={(e: { target: { value: any; }; }) => setTeamSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border-2 border-slate-800 rounded-xl focus:outline-none focus:border-yellow-400 text-slate-200 text-xs font-outfit"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                {teamSearch && (
                  <button 
                    onClick={() => setTeamSearch("")}
                    className="text-[10px] text-slate-500 hover:text-slate-350 absolute right-3 top-2 uppercase font-bold font-outfit"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Grid of Teams manually assignable */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredTeams.map((team) => {
                  const ownerName = getTeamOwner(team.name);
                  return (
                    <div 
                      key={team.name} 
                      className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition ${
                        ownerName ? "bg-slate-900/80 border-slate-750" : "bg-slate-950 border-slate-900 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate font-outfit">
                          <span>{team.emoji}</span>
                          <span className="truncate">{team.name}</span>
                        </div>
                        <span className="text-[8px] bg-slate-900 px-1 py-0.5 rounded text-slate-500 font-mono">
                          {team.confed}
                        </span>
                      </div>
                      
                      <select
                        value={ownerName}
                        onChange={(e: { target: { value: string; }; }) => handleAssignTeam(team.name, e.target.value)}
                        disabled={participants.length === 0}
                        className="w-full text-[10px] font-outfit bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-yellow-400 cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Unassigned</option>
                        {participants.map((p: { name: any; }) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                {filteredTeams.length === 0 && (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500 font-outfit">
                    No matching teams found for "{teamSearch}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t-2 border-slate-950 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-yellow-404 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bungee text-xs tracking-widest uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-yellow-400/10 transition cursor-pointer"
          >
            <Check className="w-4 h-4" /> Save Setup
          </button>
        </div>
      </div>

      {/* Custom Setup Draft Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="font-bungee text-lg text-rose-500 uppercase">Clear All Drafts?</h3>
            </div>
            <p className="text-xs text-slate-350 font-outfit leading-relaxed">
              Are you sure you want to unassign all national teams from all participants? This action will clear current draft assignments.
            </p>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeResetDraft}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-rose-600/10 cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Unassigned Team Saving Warning Modal */}
      {showUnassignedConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-bungee text-lg text-amber-500 uppercase">Unassigned Teams</h3>
            </div>
            <p className="text-xs text-slate-350 font-outfit leading-relaxed">
              <span className="font-bold text-amber-400">{unassignedPlayerName}</span> doesn't have any assigned World Cup teams. Are you sure you want to save this layout anyway?
            </p>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowUnassignedConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={executeSaveWithUnassigned}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs uppercase shadow-lg shadow-yellow-400/10 cursor-pointer"
              >
                Yes, Save Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
