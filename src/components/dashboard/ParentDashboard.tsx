"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Copy, Check, ChevronRight, RefreshCw, MessageCircle, X } from "lucide-react";
import AvatarDisplay from "@/components/ui/AvatarDisplay";
import { computeAggregateOccurrenceStreak } from "@/lib/streaks";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrafficLight = "green" | "yellow" | "red" | "none";

interface LinkedChild {
  id: string;
  username: string | null;
  avatar_id: string | null;
  totalHabits: number;
  completedToday: number;
  light: TrafficLight;
  streak: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTrafficLight(completed: number, total: number): TrafficLight {
  if (total === 0) return "none";
  if (completed === total) return "green";
  if (completed === 0) return "red";
  return "yellow";
}

const LIGHT_CONFIG: Record<TrafficLight, { emoji: string; label: string; desc: string; ring: string; bg: string }> = {
  green:  { emoji: "🟢", label: "All done",       desc: "Completed all habits today",      ring: "ring-emerald-500/40", bg: "bg-emerald-950/30 border-emerald-700/30" },
  yellow: { emoji: "🟡", label: "Making progress", desc: "Completed some habits today",     ring: "ring-amber-500/40",   bg: "bg-amber-950/30 border-amber-700/30" },
  red:    { emoji: "🔴", label: "Not started",     desc: "No habits completed yet today",   ring: "ring-red-500/40",     bg: "bg-red-950/20 border-red-700/25" },
  none:   { emoji: "⚪", label: "No habits",       desc: "No habits set up yet",            ring: "ring-slate-700/30",   bg: "bg-slate-900/30 border-slate-700/20" },
};

const ENCOURAGEMENTS = [
  "You're doing amazing — keep it up! 🌟",
  "So proud of your consistency! 🔥",
  "Every habit you complete is a win! 💪",
  "Your dedication inspires me! 🎯",
  "Keep going — you're building something great! 🚀",
  "You make it look easy! ⭐",
  "I see you working hard — it's paying off! 💫",
  "Incredible effort today! 🏆",
];

// ─── Invite section ───────────────────────────────────────────────────────────

function InviteSection({ parentId }: { parentId: string }) {
  const supabase = createClient();
  const [token, setToken]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("parent_invite_token").eq("id", parentId).single()
      .then(({ data }) => { if (data?.parent_invite_token) setToken(data.parent_invite_token); });
  }, [supabase, parentId]);

  const generateToken = useCallback(async () => {
    setLoading(true);
    const newToken = `${parentId.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
    await supabase.from("profiles").update({ parent_invite_token: newToken }).eq("id", parentId);
    setToken(newToken);
    setLoading(false);
  }, [supabase, parentId]);

  const copyLink = useCallback(async () => {
    if (!token) return;
    const link = `${window.location.origin}/link-parent?token=${token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  return (
    <div className="bg-emerald-950/20 border border-emerald-700/25 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-xl leading-none">👨‍👩‍👧</span>
        <div>
          <p className="text-sm font-bold text-emerald-300">Invite your child</p>
          <p className="text-xs text-slate-400">Share the link — they sign up and link their account</p>
        </div>
      </div>

      {token ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 bg-[#0a0a14] border border-emerald-800/30 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-300 overflow-hidden">
            <span className="flex-1 truncate">{window?.location?.origin ?? "https://habitaiapp.com"}/link-parent?token={token.slice(0, 12)}…</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void copyLink()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            <button
              onClick={() => void generateToken()}
              disabled={loading}
              className="px-3 py-2.5 border border-emerald-800/40 text-emerald-600 hover:text-emerald-400 hover:border-emerald-700/50 rounded-xl transition-all"
              title="Generate new link"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => void generateToken()}
          disabled={loading}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Generate invite link
        </button>
      )}
    </div>
  );
}

// ─── Encourage modal ──────────────────────────────────────────────────────────

function EncourageModal({ child, onClose }: { child: LinkedChild; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [msg] = useState(() => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-300" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="text-base font-bold text-white">Send encouragement</h3>
          <p className="text-xs text-slate-400 mt-1">to {child.username ? `@${child.username}` : "your child"}</p>
        </div>
        {sent ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-emerald-300 font-semibold">Message noted!</p>
            <p className="text-xs text-slate-400 mt-1">Your child will see this on their next app visit</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-4">
              <p className="text-sm text-white text-center leading-relaxed">&ldquo;{msg}&rdquo;</p>
            </div>
            <button
              onClick={() => setSent(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all"
            >
              Send this message 💚
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Child card ───────────────────────────────────────────────────────────────

function ChildCard({ child, onEncourage }: { child: LinkedChild; onEncourage: () => void }) {
  const cfg = LIGHT_CONFIG[child.light];
  const pct = child.totalHabits > 0 ? Math.round((child.completedToday / child.totalHabits) * 100) : 0;

  return (
    <div className={`border rounded-2xl p-5 ${cfg.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`ring-2 rounded-xl overflow-hidden ${cfg.ring} flex-shrink-0`}>
          <AvatarDisplay avatarId={child.avatar_id ?? "ghost"} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{child.username ? `@${child.username}` : "Your child"}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-base leading-none">{cfg.emoji}</span>
            <span className="text-xs text-slate-400">{cfg.label}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black text-white leading-none">{pct}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{child.completedToday}/{child.totalHabits} habits</p>
        </div>
      </div>

      {/* Progress bar */}
      {child.totalHabits > 0 && (
        <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              child.light === "green" ? "bg-emerald-500" :
              child.light === "yellow" ? "bg-amber-500" :
              "bg-red-600/60"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1">
          <span>🔥</span>
          <span>{child.streak} day streak</span>
        </div>
        <button
          onClick={onEncourage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-xl transition-all"
        >
          <MessageCircle className="w-3 h-3" />
          Encourage
        </button>
      </div>

      {child.light === "red" && (
        <p className="text-xs text-red-400/70 mt-3 text-center">
          No habits completed yet today — a gentle nudge might help 💙
        </p>
      )}
      {child.light === "green" && (
        <p className="text-xs text-emerald-400/70 mt-3 text-center">
          All habits done! Time to celebrate 🎉
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const supabase = createClient();
  const [userId,    setUserId]    = useState<string | null>(null);
  const [children,  setChildren]  = useState<LinkedChild[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [encouraged, setEncouraged] = useState<LinkedChild | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Fetch linked children (accepted)
      const { data: links } = await supabase
        .from("parent_child_links")
        .select("child_id")
        .eq("parent_id", user.id)
        .eq("status", "accepted");

      if (!links || links.length === 0) { setLoading(false); return; }

      const today = new Date().toISOString().split("T")[0];
      const todayAnchor = new Date(`${today}T00:00:00Z`);
      const todayDow = todayAnchor.getUTCDay();

      const childProfiles = await Promise.all(
        links.map(async (link) => {
          const childId = link.child_id as string;

          // Profile
          const { data: profile } = await supabase
            .from("public_profiles")
            .select("username, avatar_id")
            .eq("id", childId)
            .single();

          // Habits (with schedule, so today's due-count can exclude
          // weekly habits not scheduled today)
          const { data: habits } = await supabase
            .from("habits")
            .select("id, frequency, day_of_week")
            .eq("user_id", childId);

          // Today's completions
          const { data: logs } = await supabase
            .from("habit_logs")
            .select("habit_id")
            .eq("user_id", childId)
            .gte("completed_at", `${today}T00:00:00`)
            .lte("completed_at", `${today}T23:59:59`);

          // Only count habits actually scheduled today — a weekly habit
          // isn't "due" on its off days, so it shouldn't count against
          // today's completion percentage on those days.
          const dueTodayHabits = (habits ?? []).filter((h) => h.frequency !== "weekly" || h.day_of_week === todayDow);
          const totalHabits    = dueTodayHabits.length;
          const completedToday = logs?.length ?? 0;

          // Streak, aggregated across the child's whole habit set (any
          // habit counts as "done" that day) — see
          // computeAggregateOccurrenceStreak for why weekly habits need
          // this instead of a plain consecutive-calendar-day walk.
          const { data: allLogs } = await supabase
            .from("habit_logs")
            .select("completed_at")
            .eq("user_id", childId)
            .order("completed_at", { ascending: false })
            .limit(100);

          const dates = new Set((allLogs ?? []).map((l: { completed_at: string }) => l.completed_at.split("T")[0]));
          const streak = computeAggregateOccurrenceStreak(todayAnchor, dates, habits ?? [], 100);

          return {
            id: childId,
            username:       profile?.username ?? null,
            avatar_id:      profile?.avatar_id ?? null,
            totalHabits,
            completedToday,
            streak,
            light: getTrafficLight(completedToday, totalHabits),
          } satisfies LinkedChild;
        })
      );

      setChildren(childProfiles);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const allDone  = children.length > 0 && children.every((c) => c.light === "green");
  const someRed  = children.some((c) => c.light === "red");

  return (
    <div className="bg-[#09090f] min-h-screen">
      <main className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{today}</p>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Your Children 👨‍👩‍👧</h1>
            {!loading && children.length > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                allDone  ? "text-emerald-300 bg-emerald-950/40 border-emerald-700/30" :
                someRed  ? "text-red-300 bg-red-950/30 border-red-700/25" :
                           "text-amber-300 bg-amber-950/40 border-amber-700/30"
              }`}>
                {allDone ? "All on track ✅" : someRed ? "Needs attention ⚠️" : "Making progress 🟡"}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">Monitor your {children.length > 1 ? "children's" : "child's"} habit completions in real-time</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-[#0f0f1a] border border-violet-900/20 animate-pulse" />
            ))}
          </div>
        ) : children.length === 0 ? (
          /* Empty state */
          <div className="space-y-4">
            <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">👨‍👩‍👧</div>
              <h2 className="text-lg font-bold text-white mb-2">No children linked yet</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Generate an invite link below and share it with your child. Once they sign up and accept, you&apos;ll see their habit progress here in real-time.
              </p>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {[
                  { emoji: "🟢", text: "Green when all habits are done" },
                  { emoji: "🟡", text: "Yellow when some are complete" },
                  { emoji: "🔴", text: "Red when none are done yet" },
                ].map(({ emoji, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-slate-400">
                    <span className="text-lg">{emoji}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {userId && <InviteSection parentId={userId} />}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Children cards */}
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onEncourage={() => setEncouraged(child)}
              />
            ))}

            {/* Invite another */}
            {userId && (
              <div className="pt-2">
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors list-none">
                    <Users className="w-4 h-4" />
                    Invite another child
                    <ChevronRight className="w-3.5 h-3.5 ml-auto group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="mt-3">
                    <InviteSection parentId={userId} />
                  </div>
                </details>
              </div>
            )}

            {/* Weekly summary hint */}
            <div className="bg-[#0f0f1a] border border-violet-900/15 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">📊</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">This week</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Children",          value: children.length,                           color: "text-violet-400" },
                  { label: "All done today",    value: children.filter((c) => c.light === "green").length, color: "text-emerald-400" },
                  { label: "Need a nudge",      value: children.filter((c) => c.light === "red").length,   color: "text-red-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {encouraged && (
        <EncourageModal child={encouraged} onClose={() => setEncouraged(null)} />
      )}
    </div>
  );
}
