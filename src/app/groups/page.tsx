"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Users, Plus, Copy, Check, Flame,
  AlertCircle, X, Hash, Target, LogOut, Trophy, Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import BackToDashboardButton from "@/components/ui/BackToDashboardButton";

interface Member {
  user_id: string;
  joined_at: string;
  completed_today?: boolean;
  display_name?: string;
}

interface Group {
  id: string;
  name: string;
  habit_name: string;
  emoji?: string;
  admin_id: string;
  invite_code: string;
  members: Member[];
  group_streak: number;
  created_at: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy code"}
    </button>
  );
}

function Leaderboard({ members, userId }: { members: Member[]; userId: string | null }) {
  const sorted = [...members].sort((a, b) => {
    // Completed today first, then alphabetical
    if (a.completed_today && !b.completed_today) return -1;
    if (!a.completed_today && b.completed_today) return 1;
    return (a.display_name ?? "").localeCompare(b.display_name ?? "");
  });

  return (
    <div className="space-y-1.5">
      {sorted.map((m, i) => (
        <div
          key={m.user_id}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
            m.user_id === userId
              ? "bg-violet-950/50 border border-violet-700/30"
              : "bg-orange-950/15 border border-transparent"
          }`}
        >
          <span className={`text-xs font-bold w-4 text-center ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-600"}`}>
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
          </span>
          <span className="text-sm text-white flex-1 truncate font-medium">
            {m.display_name ?? "Member"}
            {m.user_id === userId && <span className="text-[10px] text-violet-400 ml-1.5">(you)</span>}
          </span>
          {m.completed_today
            ? <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/30 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">✓ Done</span>
            : <span className="text-[10px] text-slate-600">Pending</span>
          }
        </div>
      ))}
    </div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId,      setUserId]      = useState<string | null>(null);
  const [userTier,    setUserTier]    = useState<string>("free");
  const [loading,     setLoading]     = useState(true);
  const [ownGroups,   setOwnGroups]   = useState<Group[]>([]);
  const [memberGroup, setMemberGroup] = useState<Group | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showJoin,    setShowJoin]    = useState(false);
  const [name,        setName]        = useState("");
  const [habitName,   setHabitName]   = useState("");
  const [emoji,       setEmoji]       = useState("🔥");
  const [joinCode,    setJoinCode]    = useState("");
  const [creating,    setCreating]    = useState(false);
  const [joining,     setJoining]     = useState(false);
  const [logging,     setLogging]     = useState(false);
  const [leaving,     setLeaving]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    let retries = 0;

    async function init() {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 5000)),
        ]);

        if (result === "timeout") {
          if (retries === 0) { retries++; void init(); return; }
          setError("Couldn't load — please retry");
          setLoading(false);
          return;
        }

        const user = result.data.session?.user ?? null;
        if (!user) { router.push("/auth/login"); return; }
        setUserId(user.id);

        const res = await fetch("/api/groups");
        if (res.ok) {
          const data = await res.json() as { ownGroups: Group[]; memberGroup: Group | null; tier: string };
          setOwnGroups(data.ownGroups ?? []);
          setMemberGroup(data.memberGroup);
          setUserTier(data.tier ?? "free");
        }
        setLoading(false);
      } catch {
        if (retries === 0) { retries++; void init(); return; }
        setError("Couldn't load — please retry");
        setLoading(false);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createGroup() {
    if (!name.trim() || !habitName.trim()) return;
    setCreating(true); setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), habit_name: habitName.trim(), emoji }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOwnGroups((prev) => [data.group, ...prev]);
      setShowCreate(false); setName(""); setHabitName(""); setEmoji("🔥");
    } finally { setCreating(false); }
  }

  async function joinGroup() {
    if (!joinCode.trim()) return;
    setJoining(true); setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", invite_code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMemberGroup(data.group);
      setShowJoin(false); setJoinCode("");
    } finally { setJoining(false); }
  }

  async function logCompletion(groupId: string) {
    setLogging(true);
    try {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log_completion", group_id: groupId }),
      });
      if (res.ok) {
        const data = await res.json() as { allDone: boolean; group_streak: number };
        if (memberGroup?.id === groupId) {
          setMemberGroup((prev) => prev ? {
            ...prev,
            group_streak: data.group_streak,
            members: prev.members.map((m) => m.user_id === userId ? { ...m, completed_today: true } : m),
          } : null);
        }
      }
    } finally { setLogging(false); }
  }

  async function leaveGroup(groupId: string) {
    if (!confirm("Leave this group? If you're the admin, the group will be deleted.")) return;
    setLeaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", group_id: groupId }),
      });
      if (res.ok) {
        // Remove from state
        setOwnGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (memberGroup?.id === groupId) setMemberGroup(null);
      }
    } finally { setLeaving(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        {error ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-slate-400 text-sm">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
              className="px-4 py-2 text-sm font-semibold text-violet-400 border border-violet-800/40 rounded-xl hover:border-violet-600/50 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        )}
      </div>
    );
  }

  const isPlusPro = userTier === "plus" || userTier === "pro";
  const myMemberData = memberGroup?.members.find((m) => m.user_id === userId);
  const iCompletedToday = myMemberData?.completed_today === true;
  const squadCompletedCount = memberGroup?.members.filter((m) => m.completed_today).length ?? 0;

  const EMOJI_OPTIONS = ["🔥", "💪", "🧘", "📚", "🏃", "🌅", "🎯", "⚡", "🌿", "🎵"];

  return (
    <div className="min-h-screen bg-[#09090f] pb-24 sm:pb-8">
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">Group Habits</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-orange-950/40 to-[#0f0f1a] border border-orange-700/25 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl leading-none">🔥</div>
            <div>
              <h1 className="text-xl font-bold text-white">Group Habits</h1>
              <p className="text-xs text-orange-400">Track the same habit together with friends or family</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Create a group, invite your squad, and build a shared streak. Everyone tracks the same habit — miss a day and the group streak resets.
          </p>
        </div>

        {/* Tier gate */}
        {!isPlusPro && (
          <div className="bg-gradient-to-br from-violet-950/50 to-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5 flex items-start gap-4">
            <Crown className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Plus or Pro required</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Group Habits are available on Plus and Pro plans. Upgrade to create or join a group and hold each other accountable.
              </p>
              <Link
                href="/settings?tab=billing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 bg-violet-900/40 border border-violet-700/40 px-3 py-1.5 rounded-lg hover:bg-violet-800/40 transition-colors"
              >
                Upgrade to Plus →
              </Link>
            </div>
          </div>
        )}

        {/* Actions — only show if Plus/Pro */}
        {isPlusPro && (
          <div className="flex gap-3">
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />Create Group
            </button>
            {!memberGroup && (
              <button
                onClick={() => { setShowJoin(true); setShowCreate(false); setError(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-violet-700/40 text-violet-300 hover:border-violet-500/60 font-semibold text-sm rounded-xl transition-all"
              >
                <Hash className="w-4 h-4" />Join with Code
              </button>
            )}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="bg-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Create Group</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Group name (e.g. Morning Squad)"
                maxLength={50}
                className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600"
              />
              <input
                value={habitName} onChange={(e) => setHabitName(e.target.value)}
                placeholder="Shared habit (e.g. Morning run 30 min)"
                maxLength={80}
                className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600"
              />
              {/* Emoji picker */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Group emoji</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-violet-700/50 ring-1 ring-violet-500" : "bg-violet-950/30 hover:bg-violet-900/30"}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
              <button onClick={() => void createGroup()} disabled={creating || !name.trim() || !habitName.trim()}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        )}

        {/* Join form */}
        {showJoin && (
          <div className="bg-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Join with Code</h3>
              <button onClick={() => setShowJoin(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <input
                value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character invite code"
                maxLength={8}
                className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 font-mono tracking-widest text-center"
              />
              {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
              <button onClick={() => void joinGroup()} disabled={joining || joinCode.length < 4}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Join
              </button>
            </div>
          </div>
        )}

        {/* Member group */}
        {memberGroup && (
          <div className="bg-gradient-to-br from-orange-950/30 to-[#0f0f1a] border border-orange-700/30 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">Your Squad</p>
                <p className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{memberGroup.emoji ?? "🔥"}</span>{memberGroup.name}
                </p>
                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />{memberGroup.habit_name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-black text-orange-400">{memberGroup.group_streak}</span>
                </div>
                <p className="text-[10px] text-slate-600">Group streak</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">{squadCompletedCount}/{memberGroup.members.length} completed today</span>
                <span className="text-xs text-slate-600">{Math.round((squadCompletedCount / Math.max(memberGroup.members.length, 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-orange-950/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                     style={{ width: `${(squadCompletedCount / Math.max(memberGroup.members.length, 1)) * 100}%` }} />
              </div>
            </div>

            {/* Log completion */}
            <button
              onClick={() => void logCompletion(memberGroup.id)}
              disabled={iCompletedToday || logging}
              className={`w-full py-3 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mb-4 ${
                iCompletedToday
                  ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 cursor-default"
                  : "bg-orange-600 hover:bg-orange-500 text-white"
              }`}
            >
              {logging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {iCompletedToday ? "✓ Logged today" : `Log ${memberGroup.habit_name}`}
            </button>

            {/* Leaderboard */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Trophy className="w-3 h-3" />Members
              </p>
              <Leaderboard members={memberGroup.members} userId={userId} />
            </div>

            <div className="flex items-center justify-between">
              <CopyButton text={memberGroup.invite_code} />
              <button
                onClick={() => void leaveGroup(memberGroup.id)}
                disabled={leaving}
                className="flex items-center gap-1.5 text-xs text-red-500/60 hover:text-red-400 transition-colors"
              >
                {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                Leave group
              </button>
            </div>
          </div>
        )}

        {/* Own groups */}
        {ownGroups.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              Groups You Manage
            </h2>
            {ownGroups.map((group) => (
              <div key={group.id} className="bg-[#0f0f1a] border border-orange-700/20 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-white flex items-center gap-2">
                      <span>{group.emoji ?? "🔥"}</span>{group.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{group.habit_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-base font-bold text-orange-400">{group.group_streak}</span>
                  </div>
                </div>

                {/* Members leaderboard */}
                {group.members.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Members · {group.members.filter((m) => m.completed_today).length}/{group.members.length} done today</p>
                    <Leaderboard members={group.members} userId={userId} />
                  </div>
                )}

                <div className="flex items-center justify-between bg-orange-950/20 border border-orange-900/20 rounded-xl px-4 py-2.5 mb-3">
                  <div>
                    <p className="text-[10px] text-orange-500/70 font-bold uppercase tracking-wider mb-0.5">Invite Code</p>
                    <p className="font-mono text-lg font-bold text-white tracking-widest">{group.invite_code}</p>
                  </div>
                  <CopyButton text={group.invite_code} />
                </div>

                <button
                  onClick={() => void leaveGroup(group.id)}
                  disabled={leaving}
                  className="flex items-center gap-1.5 text-xs text-red-500/60 hover:text-red-400 transition-colors"
                >
                  {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                  Delete group
                </button>
              </div>
            ))}
          </div>
        )}

        {ownGroups.length === 0 && !memberGroup && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-sm text-slate-500">No group yet.</p>
            <p className="text-xs text-slate-700 mt-1">
              {isPlusPro
                ? "Create one or join a friend's group with their code."
                : "Upgrade to Plus to create or join groups."}
            </p>
          </div>
        )}

        <BackToDashboardButton />
      </main>

      <BottomNav />
    </div>
  );
}
