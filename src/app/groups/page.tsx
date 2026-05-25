"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Users, Plus, Copy, Check, Flame,
  AlertCircle, X, Hash, Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";

interface Group {
  id: string;
  name: string;
  habit_name: string;
  admin_id: string;
  invite_code: string;
  members: Array<{ user_id: string; joined_at: string; completed_today?: boolean }>;
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

export default function GroupsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId,      setUserId]      = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [ownGroups,   setOwnGroups]   = useState<Group[]>([]);
  const [memberGroup, setMemberGroup] = useState<Group | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showJoin,    setShowJoin]    = useState(false);
  const [name,        setName]        = useState("");
  const [habitName,   setHabitName]   = useState("");
  const [joinCode,    setJoinCode]    = useState("");
  const [creating,    setCreating]    = useState(false);
  const [joining,     setJoining]     = useState(false);
  const [logging,     setLogging]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setUserId(user.id);

    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json() as { ownGroups: Group[]; memberGroup: Group | null };
      setOwnGroups(data.ownGroups ?? []);
      setMemberGroup(data.memberGroup);
    }
    setLoading(false);
  }

  async function createGroup() {
    if (!name.trim() || !habitName.trim()) return;
    setCreating(true); setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), habit_name: habitName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOwnGroups((prev) => [data.group, ...prev]);
      setShowCreate(false); setName(""); setHabitName("");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  const myMemberData = memberGroup?.members.find((m) => m.user_id === userId);
  const iCompletedToday = myMemberData?.completed_today === true;
  const squadCompletedCount = memberGroup?.members.filter((m) => m.completed_today).length ?? 0;

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

        {/* Actions */}
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
                <p className="text-lg font-bold text-white">{memberGroup.name}</p>
                <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />{memberGroup.habit_name}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-black text-orange-400">{memberGroup.group_streak}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5">Group streak</p>
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
              className={`w-full py-3 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                iCompletedToday
                  ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 cursor-default"
                  : "bg-orange-600 hover:bg-orange-500 text-white"
              }`}
            >
              {logging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {iCompletedToday ? "✓ Logged today" : `Log ${memberGroup.habit_name}`}
            </button>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-600">{memberGroup.members.length} members</span>
              <CopyButton text={memberGroup.invite_code} />
            </div>
          </div>
        )}

        {/* Own groups */}
        {ownGroups.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Groups You Manage</h2>
            {ownGroups.map((group) => (
              <div key={group.id} className="bg-[#0f0f1a] border border-orange-700/20 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-white">{group.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{group.habit_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-base font-bold text-orange-400">{group.group_streak}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-orange-950/20 border border-orange-900/20 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-[10px] text-orange-500/70 font-bold uppercase tracking-wider mb-0.5">Invite Code</p>
                    <p className="font-mono text-lg font-bold text-white tracking-widest">{group.invite_code}</p>
                  </div>
                  <CopyButton text={group.invite_code} />
                </div>
                <p className="text-xs text-slate-600 mt-2">{group.members.length} members · {group.members.filter((m) => m.completed_today).length} completed today</p>
              </div>
            ))}
          </div>
        )}

        {ownGroups.length === 0 && !memberGroup && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-sm text-slate-500">No group yet.</p>
            <p className="text-xs text-slate-700 mt-1">Create one or join a friend{"'"}s group with their code.</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
