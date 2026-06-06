"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Swords, Loader2, Trophy, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Plan } from "@/types";
import FeatureUpgradeGate from "./FeatureUpgradeGate";
import posthog from "posthog-js";

interface BattleWithNames {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_name: string;
  opponent_name: string;
  habit_name: string;
  duration_days: number;
  start_date: string | null;
  status: "pending" | "active" | "completed" | "declined";
  winner_id: string | null;
  challenger_completions: number;
  opponent_completions: number;
  created_at: string;
  is_challenger: boolean;
}

interface Props {
  tier: Plan;
  friends: Array<{ id: string; name: string; username: string }>;
  onClose: () => void;
  onUpgrade: () => void;
}

function BattleCard({ battle, onAction, actioning }: { battle: BattleWithNames; onAction: (id: string, action: string) => void; actioning: string | null }) {
  const myCompletions    = (battle.is_challenger ? battle.challenger_completions : battle.opponent_completions) ?? 0;
  const theirCompletions = (battle.is_challenger ? battle.opponent_completions   : battle.challenger_completions) ?? 0;
  const opponentName     = (battle.is_challenger ? battle.opponent_name          : battle.challenger_name) ?? "Unknown";
  const iWon             = battle.winner_id === (battle.is_challenger ? battle.challenger_id : battle.opponent_id);
  const isActioning      = (action: string) => actioning === `${battle.id}:${action}`;

  return (
    <div className={`bg-[#0f0f1a] border rounded-2xl p-4 ${
      battle.status === "active" ? "border-violet-600/40" :
      battle.status === "completed" ? (iWon ? "border-emerald-600/30" : "border-slate-700/30") :
      "border-violet-900/20"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="text-sm font-bold text-white truncate max-w-[160px]">{battle.habit_name}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
          battle.status === "active"    ? "text-violet-300 border-violet-600/40 bg-violet-950/40" :
          battle.status === "pending"   ? "text-amber-300 border-amber-600/30 bg-amber-950/20" :
          battle.status === "completed" ? (iWon ? "text-emerald-300 border-emerald-600/30 bg-emerald-950/20" : "text-slate-400 border-slate-700/30 bg-slate-900/20") :
          "text-slate-500 border-slate-700/20"
        }`}>
          {battle.status === "completed" ? (iWon ? "🏆 Won!" : "Finished") : battle.status}
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        vs <span className="text-slate-300 font-medium">@{opponentName}</span> · {battle.duration_days}-day battle
      </p>

      {(battle.status === "active" || battle.status === "completed") && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">You: <span className="text-violet-400 font-bold">{myCompletions}</span></span>
            <span className="text-[10px] text-slate-500">@{opponentName}: <span className="text-slate-400 font-bold">{theirCompletions}</span></span>
          </div>
          <div className="flex gap-1 h-2">
            <div className="flex-1 bg-violet-950/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all"
                   style={{ width: `${Math.min(100, (myCompletions / Math.max(1, myCompletions + theirCompletions)) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {battle.status === "pending" && !battle.is_challenger && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(battle.id, "accept")}
            disabled={!!actioning}
            className="flex-1 py-2.5 min-h-[44px] bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            {isActioning("accept") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Accept ⚔️"}
          </button>
          <button
            onClick={() => onAction(battle.id, "decline")}
            disabled={!!actioning}
            className="flex-1 py-2.5 min-h-[44px] border border-slate-700/40 text-slate-400 hover:text-slate-200 disabled:opacity-60 text-xs font-semibold rounded-xl transition-all flex items-center justify-center"
          >
            {isActioning("decline") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Decline"}
          </button>
        </div>
      )}
      {battle.status === "pending" && battle.is_challenger && (
        <p className="text-xs text-slate-500 text-center">Waiting for response…</p>
      )}
      {battle.status === "active" && (
        <button
          onClick={() => onAction(battle.id, "log_completion")}
          disabled={!!actioning}
          className="w-full py-2.5 min-h-[44px] bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-60 border border-violet-600/30 text-violet-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          {isActioning("log_completion") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> Log today's completion</>}
        </button>
      )}
    </div>
  );
}

export default function HabitBattleModal({ tier, friends, onClose, onUpgrade }: Props) {
  const isPaid = tier === "plus" || tier === "pro";
  const router = useRouter();

  const [battles, setBattles]         = useState<BattleWithNames[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actioning, setActioning]     = useState<string | null>(null);
  const [creating, setCreating]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [opponentId, setOpponentId]   = useState("");
  const [habitName, setHabitName]     = useState("");
  const [duration, setDuration]       = useState(7);

  const handleUpgrade = () => { onClose(); router.push("/billing"); };

  useEffect(() => {
    if (!isPaid) { setLoading(false); return; }
    fetch("/api/battles")
      .then((r) => r.json())
      .then((d) => { setBattles(d.battles ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isPaid]);

  const handleAction = async (battleId: string, action: string) => {
    setActioning(`${battleId}:${action}`);
    try {
      const res  = await fetch("/api/battles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battle_id: battleId, action }),
      });
      const data = await res.json();
      if (data.battle) {
        setBattles((prev) => prev.map((b) => b.id === battleId ? { ...b, ...data.battle, is_challenger: b.is_challenger, challenger_name: b.challenger_name, opponent_name: b.opponent_name } : b));
      }
    } finally { setActioning(null); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim() || !opponentId) return;
    setCreating(true);
    setError(null);
    try {
      const res  = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponent_id: opponentId, habit_name: habitName.trim(), duration_days: duration }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create battle"); return; }
      posthog.capture("battle_created", { habit_name: habitName.trim(), duration_days: duration });
      // Refetch
      const r2 = await fetch("/api/battles");
      const d2 = await r2.json();
      setBattles(d2.battles ?? []);
      setShowForm(false);
      setHabitName("");
      setOpponentId("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const active    = battles.filter((b) => b.status === "active");
  const pending   = battles.filter((b) => b.status === "pending");
  const completed = battles.filter((b) => b.status === "completed");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-16 sm:p-4 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mobile-sheet-enter w-full sm:max-w-md bg-[#0d0d1a] border border-violet-700/30 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden max-h-[90vh] flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-violet-900/20 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/25 border border-violet-500/35 flex items-center justify-center"
                   style={{ boxShadow: "0 0 18px rgba(139,92,246,0.35)" }}>
                <Swords className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Habit Battles</h2>
                <p className="text-[11px] text-violet-400/70">Challenge friends to 7-day duels</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-violet-950/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {!isPaid ? (
            <FeatureUpgradeGate
              requiredTier="plus"
              featureName="Habit Battles"
              description="Challenge friends to 7-day habit duels. Track your completions, compete for the win, and earn leaderboard bragging rights."
              onUpgrade={handleUpgrade}
            />
          ) : loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" /> Challenge a Friend
                </button>
              )}

              {showForm && (
                <form onSubmit={handleCreate} className="bg-violet-950/30 border border-violet-800/30 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-white mb-1">New Battle</p>
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Opponent</label>
                    <select
                      value={opponentId}
                      onChange={(e) => setOpponentId(e.target.value)}
                      required
                      className="w-full bg-[#0f0f1a] border border-violet-800/40 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500/70"
                    >
                      <option value="">Select a friend…</option>
                      {friends.map((f) => (
                        <option key={f.id} value={f.id}>@{f.username || f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Habit to battle on</label>
                    <input
                      type="text"
                      value={habitName}
                      onChange={(e) => setHabitName(e.target.value)}
                      placeholder='e.g. "Run 3x this week"'
                      maxLength={80}
                      required
                      className="w-full bg-[#0f0f1a] border border-violet-800/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-[#0f0f1a] border border-violet-800/40 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500/70"
                    >
                      {[3, 5, 7, 14, 21, 30].map((d) => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={creating}
                      className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                      {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Swords className="w-3.5 h-3.5" />}
                      Send Challenge
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 border border-slate-700/40 text-slate-400 hover:text-white rounded-xl text-sm transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {pending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending ({pending.length})</span>
                  </div>
                  <div className="space-y-2">{pending.map((b) => <BattleCard key={b.id} battle={b} onAction={handleAction} actioning={actioning} />)}</div>
                </div>
              )}

              {active.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Swords className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Active ({active.length})</span>
                  </div>
                  <div className="space-y-2">{active.map((b) => <BattleCard key={b.id} battle={b} onAction={handleAction} actioning={actioning} />)}</div>
                </div>
              )}

              {completed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
                  </div>
                  <div className="space-y-2">{completed.slice(0, 3).map((b) => <BattleCard key={b.id} battle={b} onAction={handleAction} actioning={actioning} />)}</div>
                </div>
              )}

              {battles.length === 0 && !showForm && (
                <div className="text-center py-8">
                  <Swords className="w-10 h-10 text-violet-800/50 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No battles yet — challenge a friend above!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
