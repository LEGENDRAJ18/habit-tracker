"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, Users, Trophy, TrendingUp, RefreshCw, BarChart3 } from "lucide-react";
import AvatarDisplay from "@/components/ui/AvatarDisplay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassMember {
  id: string;
  username: string | null;
  avatar_id: string | null;
  totalHabits: number;
  completedToday: number;
  streak: number;
  completionRate: number; // 7-day
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ─── Invite code section ──────────────────────────────────────────────────────

function InviteCodeSection({ inviteCode, userId }: { inviteCode: string | null; userId: string }) {
  const supabase = createClient();
  const [code, setCode]     = useState(inviteCode);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const newCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    await supabase.from("profiles").update({ invite_code: newCode }).eq("id", userId);
    setCode(newCode);
    setLoading(false);
  }, [supabase, userId]);

  const copy = useCallback(async (what: "code" | "link") => {
    const text = what === "code" ? (code ?? "") : `${window.location.origin}/join-class?code=${code}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="bg-amber-950/20 border border-amber-700/25 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl leading-none">🔗</span>
        <div>
          <p className="text-sm font-bold text-amber-300">Your class invite code</p>
          <p className="text-xs text-slate-500">Students enter this to join your class</p>
        </div>
      </div>

      {code ? (
        <div className="space-y-2.5">
          <div className="bg-[#0a0a14] border border-amber-800/30 rounded-xl px-4 py-3 text-center">
            <p className="text-3xl font-black text-amber-300 tracking-[0.3em] font-mono">{code}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void copy("code")}
              className="flex items-center justify-center gap-1.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-xs font-semibold rounded-xl transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy code
            </button>
            <button
              onClick={() => void copy("link")}
              className="flex items-center justify-center gap-1.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-xs font-semibold rounded-xl transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy link
            </button>
          </div>
          <button
            onClick={() => void generate()}
            disabled={loading}
            className="w-full py-2 border border-amber-900/40 text-slate-600 hover:text-slate-400 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Generate new code
          </button>
        </div>
      ) : (
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          Generate class code
        </button>
      )}
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, rank }: { member: ClassMember; rank?: number }) {
  const p = pct(member.completedToday, member.totalHabits);
  const isTop = rank !== undefined && rank <= 3;

  const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-violet-900/10 last:border-0">
      <div className="w-6 text-center flex-shrink-0">
        {medalEmoji ? (
          <span className="text-sm leading-none">{medalEmoji}</span>
        ) : (
          <span className="text-xs text-slate-700 font-bold">{rank}</span>
        )}
      </div>
      <AvatarDisplay avatarId={member.avatar_id ?? "ghost"} size="sm" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isTop ? "text-white" : "text-slate-300"} leading-none mb-1`}>
          {member.username ? `@${member.username}` : "Anonymous"}
        </p>
        <div className="w-full h-1 bg-violet-950/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              p === 100 ? "bg-emerald-500" : p >= 50 ? "bg-violet-500" : "bg-slate-700"
            }`}
            style={{ width: `${p}%` }}
          />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${p === 100 ? "text-emerald-400" : "text-slate-400"}`}>{p}%</p>
        <p className="text-[10px] text-slate-600">{member.completedToday}/{member.totalHabits}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 text-xs text-orange-400">
        <span>🔥</span>
        <span className="font-semibold">{member.streak}</span>
      </div>
    </div>
  );
}

// ─── Export button ────────────────────────────────────────────────────────────

function ExportButton({ members, className }: { members: ClassMember[]; className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const rows = [
      ["Username", "Habits Today", "Completed Today", "Completion %", "Streak"],
      ...members.map((m) => [
        m.username ?? "Anonymous",
        m.totalHabits,
        m.completedToday,
        pct(m.completedToday, m.totalHabits),
        m.streak,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `class-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading || members.length === 0}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 border border-amber-700/30 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      <BarChart3 className="w-3.5 h-3.5" />
      Export CSV
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const supabase = createClient();
  const [userId,    setUserId]    = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [className_,  setClassName_]  = useState<string | null>(null);
  const [members,   setMembers]   = useState<ClassMember[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Fetch teacher's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code, username")
        .eq("id", user.id)
        .single();

      const code = profile?.invite_code ?? null;
      setInviteCode(code);
      setClassName_(profile?.username ? `${profile.username}'s Class` : "My Class");

      if (!code) { setLoading(false); return; }

      // Find members who joined with this code
      // For now we fetch profiles with matching invite_code in organisation context
      // We'll use a simple approach: students join via invite code → their org is linked
      // We look for profiles where organisation_id = teacher's org OR sharing the same invite_code prefix
      // Simplified: show members from same organisation
      const { data: org } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", user.id)
        .single();

      let memberList: ClassMember[] = [];

      if (org?.organisation_id) {
        const { data: orgMembers } = await supabase
          .from("profiles")
          .select("id, username, avatar_id")
          .eq("organisation_id", org.organisation_id)
          .neq("id", user.id)
          .limit(50);

        if (orgMembers && orgMembers.length > 0) {
          const today = new Date().toISOString().split("T")[0];

          memberList = await Promise.all(
            orgMembers.map(async (m: { id: string; username: string | null; avatar_id: string | null }) => {
              const { data: habits } = await supabase.from("habits").select("id").eq("user_id", m.id);
              const { data: logs }   = await supabase
                .from("habit_logs").select("habit_id")
                .eq("user_id", m.id)
                .gte("completed_at", `${today}T00:00:00`)
                .lte("completed_at", `${today}T23:59:59`);

              const { data: allLogs } = await supabase
                .from("habit_logs").select("completed_at")
                .eq("user_id", m.id)
                .order("completed_at", { ascending: false })
                .limit(60);

              const dates = new Set((allLogs ?? []).map((l: { completed_at: string }) => l.completed_at.split("T")[0]));
              let streak = 0; let offset = 0;
              const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
              if (dates.has(today) || dates.has(daysAgo(1))) {
                while (dates.has(daysAgo(offset))) { streak++; offset++; }
              }

              const totalHabits    = habits?.length ?? 0;
              const completedToday = logs?.length ?? 0;
              return {
                id: m.id,
                username: m.username,
                avatar_id: m.avatar_id,
                totalHabits,
                completedToday,
                streak,
                completionRate: pct(completedToday, totalHabits),
              } satisfies ClassMember;
            })
          );
        }
      }

      // Sort by completion rate desc
      memberList.sort((a, b) => b.completionRate - a.completionRate || b.streak - a.streak);
      setMembers(memberList);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const classAvg = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.completionRate, 0) / members.length)
    : 0;
  const allDoneCount = members.filter((m) => m.completionRate === 100).length;
  const top3 = members.slice(0, 3);

  return (
    <div className="bg-[#09090f] min-h-screen">
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{today}</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">🏫 {className_}</h1>
              <p className="text-sm text-slate-500 mt-0.5">Your class habit dashboard</p>
            </div>
            <ExportButton members={members} />
          </div>
        </div>

        <div className="xl:grid xl:grid-cols-[1fr_280px] xl:gap-6 xl:items-start">
          {/* Left column */}
          <div className="space-y-5 min-w-0">

            {/* Class stats */}
            {!loading && members.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users,       value: members.length, label: "Members",          color: "text-violet-400" },
                  { icon: TrendingUp,  value: `${classAvg}%`, label: "Class avg today",  color: classAvg >= 70 ? "text-emerald-400" : classAvg >= 40 ? "text-amber-400" : "text-red-400" },
                  { icon: Trophy,      value: allDoneCount,   label: "100% today",       color: "text-amber-400" },
                ].map(({ icon: Icon, value, label, color }) => (
                  <div key={label} className="bg-[#0c0c18] border border-violet-900/20 rounded-xl px-3 py-3 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                    <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Class progress bar */}
            {!loading && members.length > 0 && (
              <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Class completion today</p>
                  <p className={`text-sm font-bold ${classAvg >= 70 ? "text-emerald-400" : classAvg >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {classAvg}%
                  </p>
                </div>
                <div className="h-2 bg-violet-950/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      classAvg >= 70 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                      classAvg >= 40 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                      "bg-gradient-to-r from-red-700 to-red-500"
                    }`}
                    style={{ width: `${classAvg}%` }}
                  />
                </div>
                {classAvg < 50 && (
                  <p className="text-xs text-amber-400/80 mt-2">
                    💡 Class is below 50% — consider sending a group encouragement
                  </p>
                )}
              </div>
            )}

            {/* Member list */}
            <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-violet-900/15">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  Members
                </p>
                <span className="text-xs text-slate-600">{members.length} students</span>
              </div>

              <div className="px-5 pb-2">
                {loading ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-xl bg-violet-950/20 animate-pulse" />
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-4xl mb-3">🎓</div>
                    <p className="text-sm text-slate-400 mb-1">No students yet</p>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto">Share your invite code (right panel) for students to join your class</p>
                  </div>
                ) : (
                  members.map((member, i) => (
                    <MemberRow key={member.id} member={member} rank={i + 1} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="mt-5 xl:mt-0 space-y-4">

            {/* Invite code */}
            {userId && (
              <InviteCodeSection inviteCode={inviteCode} userId={userId} />
            )}

            {/* Top performers */}
            {!loading && top3.length > 0 && (
              <div className="bg-[#0f0f1a] border border-amber-900/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-white">Top performers</p>
                  <span className="text-xs text-slate-600 ml-auto">this week</span>
                </div>
                <div className="space-y-3">
                  {top3.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <span className="text-base leading-none">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                      <AvatarDisplay avatarId={m.avatar_id ?? "ghost"} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {m.username ? `@${m.username}` : "Anonymous"}
                        </p>
                        <p className="text-[10px] text-slate-600">{m.completionRate}% · 🔥{m.streak}d</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics insight */}
            {!loading && members.length > 0 && (
              <div className="bg-[#0f0f1a] border border-violet-900/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">Quick insight</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {classAvg >= 80
                    ? `🌟 Outstanding! ${classAvg}% class completion — your class is in the top tier.`
                    : classAvg >= 60
                    ? `📈 Good progress at ${classAvg}%. ${allDoneCount} students at 100% today.`
                    : classAvg >= 40
                    ? `⚡ ${classAvg}% completion — ${members.length - allDoneCount} students could use encouragement.`
                    : `🎯 ${classAvg}% today. Consider a group challenge to boost engagement this week.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
