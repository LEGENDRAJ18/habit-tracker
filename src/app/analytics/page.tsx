"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame, Zap, CheckCircle2, TrendingUp,
  Calendar, BarChart2, Loader2, Lock,
} from "lucide-react";
import PageNav from "@/components/layout/PageNav";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog, Plan } from "@/types";
import BottomNav from "@/components/ui/BottomNav";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number) {
  return toDateStr(new Date(Date.now() - n * 86400000));
}

function getStreak(dates: Set<string>): number {
  let streak = 0;
  const today     = toDateStr(new Date());
  const yesterday = daysAgo(1);
  let cur: string | null = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null;
  if (!cur) return 0;
  while (cur && dates.has(cur)) {
    streak++;
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    cur = toDateStr(prev);
  }
  return streak;
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color = "violet",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: "violet" | "amber" | "emerald" | "blue";
}) {
  const colors = {
    violet:  "text-violet-400  bg-violet-900/20  border-violet-800/30",
    amber:   "text-amber-400   bg-amber-900/20   border-amber-800/30",
    emerald: "text-emerald-400 bg-emerald-900/20 border-emerald-800/30",
    blue:    "text-blue-400    bg-blue-900/20    border-blue-800/30",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3 opacity-80">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

// ─── 7-day heatmap ────────────────────────────────────────────────────────────

function SevenDayHeatmap({ logs, habitCount }: { logs: Pick<HabitLog, "habit_id" | "completed_at">[]; habitCount: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d     = daysAgo(6 - i);
    const count = logs.filter((l) => l.completed_at.startsWith(d)).length;
    const pct   = habitCount > 0 ? count / habitCount : 0;
    const label = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
    return { d, count, pct, label };
  });

  function dayColor(pct: number) {
    if (pct === 0)    return "bg-slate-800/60 border-slate-700/30";
    if (pct < 0.5)   return "bg-yellow-600/50 border-yellow-500/30";
    if (pct < 1)     return "bg-emerald-600/60 border-emerald-500/30";
    return "bg-emerald-400 border-emerald-300/50";
  }

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-violet-400" />
        Last 7 days
      </h3>
      <div className="flex items-end gap-2">
        {days.map(({ d, pct, label, count }) => (
          <div key={d} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-slate-500">{count || ""}</span>
            <div
              title={`${d}: ${count}/${habitCount}`}
              className={`w-full h-12 rounded-lg border ${dayColor(pct)}`}
            />
            <span className="text-[10px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 justify-center text-[10px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-800/60 inline-block" />None</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-600/50 inline-block" />Partial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />All done</span>
      </div>
    </div>
  );
}

// ─── weekly completions bar chart (recharts) ──────────────────────────────────

function WeeklyChart({ logs }: { logs: Pick<HabitLog, "habit_id" | "completed_at">[] }) {
  const data = Array.from({ length: 8 }, (_, i) => {
    const offset    = (7 - i) * 7;
    const days      = Array.from({ length: 7 }, (_, d) => daysAgo(offset + d));
    const count     = logs.filter((l) => days.some((d) => l.completed_at.startsWith(d))).length;
    const labelDate = new Date(daysAgo(offset));
    const label     = labelDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, count };
  });

  const maxVal = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-violet-400" />
        Weekly completions
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,40,217,0.1)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(109,40,217,0.3)", borderRadius: "10px", fontSize: "12px" }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#a78bfa" }}
            cursor={{ fill: "rgba(109,40,217,0.08)" }}
          />
          <Bar dataKey="count" name="Completions" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.count === maxVal ? "#8b5cf6" : "rgba(109,40,217,0.45)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── per-habit streak chart (recharts) ───────────────────────────────────────

function HabitStreakChart({ habits, habitDateSets }: { habits: Habit[]; habitDateSets: Map<string, Set<string>> }) {
  const data = habits
    .map((h) => ({
      name: h.name.length > 14 ? h.name.slice(0, 13) + "…" : h.name,
      streak: getStreak(habitDateSets.get(h.id) ?? new Set()),
    }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 8);

  const maxStreak = Math.max(1, ...data.map((d) => d.streak));

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-400" />
        Current streaks by habit
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,40,217,0.1)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(109,40,217,0.3)", borderRadius: "10px", fontSize: "12px" }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#fb923c" }}
            cursor={{ fill: "rgba(109,40,217,0.08)" }}
          />
          <Bar dataKey="streak" name="Streak (days)" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.streak === maxStreak ? "#f97316" : "rgba(249,115,22,0.45)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── per-habit breakdown row ──────────────────────────────────────────────────

function HabitRow({ habit, dates }: { habit: Habit; dates: Set<string> }) {
  const streak   = getStreak(dates);
  const last30   = Array.from({ length: 30 }, (_, i) => daysAgo(29 - i));
  const rate     = Math.round((last30.filter((d) => dates.has(d)).length / 30) * 100);
  const strength = habit.habit_strength ?? 10;

  function strengthColor(s: number) {
    if (s > 90) return "from-emerald-500 to-green-400";
    if (s > 60) return "from-blue-500 to-cyan-400";
    if (s > 30) return "from-yellow-500 to-amber-400";
    return "from-red-500 to-rose-400";
  }
  function strengthLabel(s: number) {
    if (s > 90) return "Automatic";
    if (s > 60) return "Strong";
    if (s > 30) return "Growing";
    return "Building";
  }

  return (
    <div className="flex items-center gap-4 py-3.5 px-5 border-b border-violet-900/10 last:border-0 hover:bg-violet-950/20 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{habit.name}</p>
        {habit.description && (
          <p className="text-xs text-slate-600 truncate mt-0.5">{habit.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-24 h-1 bg-violet-950/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${strengthColor(strength)}`}
              style={{ width: `${strength}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-600">{strengthLabel(strength)} · {strength}/100</span>
        </div>
      </div>
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-center hidden sm:block">
          <p className="text-sm font-semibold text-slate-200">{rate}%</p>
          <p className="text-[10px] text-slate-600">30-day</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-orange-400 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5" />{streak}
          </p>
          <p className="text-[10px] text-slate-600">streak</p>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-sm font-semibold text-violet-300">{strength}</p>
          <p className="text-[10px] text-slate-600">strength</p>
        </div>
      </div>
    </div>
  );
}

// ─── blur gate for free users ─────────────────────────────────────────────────

function BlurGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.45 }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090f]/60 backdrop-blur-sm rounded-2xl">
        <div className="flex flex-col items-center gap-3 p-6 text-center max-w-xs">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-white">Unlock with Plus</p>
          <p className="text-xs text-slate-400">Get full analytics, streak charts, and weekly trends.</p>
          <Link
            href="/dashboard"
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all"
            onClick={() => {
              const url = new URL(window.location.href);
              url.pathname = "/dashboard";
              url.searchParams.set("checkout", "plus");
              window.location.href = url.toString();
            }}
          >
            Upgrade to Plus — $7/mo
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const [habits, setHabits]   = useState<Habit[]>([]);
  const [logs, setLogs]       = useState<Pick<HabitLog, "habit_id" | "completed_at">[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier]       = useState<Plan>("free");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: h }, { data: l }, { data: p }] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_logs")
          .select("habit_id, completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", daysAgo(90))
          .order("completed_at", { ascending: false }),
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
      ]);
      setHabits(h ?? []);
      setLogs(l ?? []);
      setTier((p?.subscription_tier as Plan) ?? "free");
      setLoading(false);
    })();
  }, []);

  const habitDateSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs) {
      const d = log.completed_at.split("T")[0];
      if (!map.has(log.habit_id)) map.set(log.habit_id, new Set());
      map.get(log.habit_id)!.add(d);
    }
    return map;
  }, [logs]);

  const today            = toDateStr(new Date());
  const totalCompletions = logs.length;
  const bestStreak       = Math.max(0, ...habits.map((h) => getStreak(habitDateSets.get(h.id) ?? new Set())));
  const completedToday   = new Set(
    logs.filter((l) => l.completed_at.startsWith(today)).map((l) => l.habit_id),
  ).size;
  const activeDaysSet    = new Set(
    logs.filter((l) => l.completed_at.split("T")[0] >= daysAgo(29)).map((l) => l.completed_at.split("T")[0]),
  );

  const mostConsistentHabit = useMemo(() => {
    if (!habits.length) return null;
    return habits.reduce((best, h) => {
      const dates = habitDateSets.get(h.id) ?? new Set<string>();
      const bestDates = habitDateSets.get(best.id) ?? new Set<string>();
      return dates.size > bestDates.size ? h : best;
    });
  }, [habits, habitDateSets]);

  const isPaid = tier === "plus" || tier === "pro";

  useEffect(() => {
    if (!loading && habits.length === 0) {
      router.replace("/dashboard");
    }
  }, [loading, habits.length, router]);

  if (loading || (!loading && habits.length === 0)) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      <PageNav
        emoji="📊"
        title="Analytics"
        subtitle="Track your progress and build better habits over time"
        maxWidth="max-w-7xl"
        action={!isPaid ? (
          <Link
            href="/dashboard?checkout=plus"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold rounded-xl hover:bg-violet-600/30 transition-all"
          >
            <Lock className="w-3 h-3" />
            Unlock full analytics
          </Link>
        ) : undefined}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6 page-fade">
        {habits.length > 0 && (
          <>
            {/* Stat cards — always visible */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Today"
                value={`${completedToday} / ${habits.length}`}
                sub="habits completed"
                color="violet"
              />
              <StatCard
                icon={<Flame className="w-4 h-4" />}
                label="Best streak"
                value={bestStreak}
                sub="days in a row"
                color="amber"
              />
              <StatCard
                icon={<Zap className="w-4 h-4" />}
                label="All-time"
                value={totalCompletions}
                sub="completions"
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Active days"
                value={activeDaysSet.size}
                sub="of last 30 days"
                color="emerald"
              />
            </div>

            {/* Most consistent habit — always visible */}
            {mostConsistentHabit && (
              <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Most consistent habit</p>
                  <p className="text-base font-semibold text-white">{mostConsistentHabit.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(habitDateSets.get(mostConsistentHabit.id) ?? new Set()).size} total completions
                  </p>
                </div>
              </div>
            )}

            {/* 7-day heatmap — always visible */}
            <SevenDayHeatmap logs={logs} habitCount={habits.length} />

            {/* Paid-only charts */}
            {isPaid ? (
              <>
                <div className="grid lg:grid-cols-2 gap-4">
                  <WeeklyChart logs={logs} />
                  <HabitStreakChart habits={habits} habitDateSets={habitDateSets} />
                </div>

                <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-violet-900/15 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                      Habit breakdown
                    </h3>
                    <span className="text-xs text-slate-600">30-day completion rate</span>
                  </div>
                  {habits.map((h) => (
                    <HabitRow key={h.id} habit={h} dates={habitDateSets.get(h.id) ?? new Set()} />
                  ))}
                </div>
              </>
            ) : (
              <BlurGate>
                <div className="grid lg:grid-cols-2 gap-4">
                  <WeeklyChart logs={logs} />
                  <HabitStreakChart habits={habits} habitDateSets={habitDateSets} />
                </div>
                <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-violet-900/15">
                    <h3 className="text-sm font-semibold text-white">Habit breakdown</h3>
                  </div>
                  {habits.slice(0, 3).map((h) => (
                    <HabitRow key={h.id} habit={h} dates={habitDateSets.get(h.id) ?? new Set()} />
                  ))}
                </div>
              </BlurGate>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
