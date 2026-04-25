"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Zap, CheckCircle2, TrendingUp, Calendar, BarChart2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types";

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

// ─── sub-components ───────────────────────────────────────────────────────────

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
      <div className="flex items-center gap-2 mb-3 opacity-80">{icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function CompletionHeatmap({ logs }: { logs: Pick<HabitLog, "habit_id" | "completed_at">[] }) {
  const WEEKS = 10;
  const DAYS  = WEEKS * 7;
  const cells = Array.from({ length: DAYS }, (_, i) => {
    const d     = daysAgo(DAYS - 1 - i);
    const count = logs.filter((l) => l.completed_at.startsWith(d)).length;
    return { date: d, count };
  });
  const max = Math.max(1, ...cells.map((c) => c.count));

  function cellColor(count: number) {
    if (count === 0) return "bg-violet-950/40";
    const p = count / max;
    if (p > 0.75) return "bg-violet-500";
    if (p > 0.5)  return "bg-violet-600/70";
    if (p > 0.25) return "bg-violet-700/50";
    return "bg-violet-800/40";
  }

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-violet-400" />
        Activity heatmap
        <span className="text-xs text-slate-600 font-normal ml-1">last {WEEKS} weeks</span>
      </h3>
      <div className="flex gap-0.5 overflow-x-auto">
        <div className="flex flex-col gap-0.5 mr-1.5 pt-0.5">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-slate-700 leading-none">{d}</div>
          ))}
        </div>
        {Array.from({ length: WEEKS }, (_, w) => (
          <div key={w} className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }, (_, d) => {
              const cell = cells[w * 7 + d];
              return (
                <div
                  key={d}
                  title={cell ? `${cell.date}: ${cell.count} completion${cell.count !== 1 ? "s" : ""}` : ""}
                  className={`w-3 h-3 rounded-sm ${cell ? cellColor(cell.count) : "bg-transparent"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-slate-700">Less</span>
        {(["bg-violet-950/40", "bg-violet-800/40", "bg-violet-700/50", "bg-violet-600/70", "bg-violet-500"] as const).map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-slate-700">More</span>
      </div>
    </div>
  );
}

function WeeklyBars({ logs }: { logs: Pick<HabitLog, "habit_id" | "completed_at">[] }) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const offset    = (7 - i) * 7;
    const days      = Array.from({ length: 7 }, (_, d) => daysAgo(offset - d));
    const count     = logs.filter((l) => days.some((d) => l.completed_at.startsWith(d))).length;
    const labelDate = new Date(daysAgo(offset));
    const label     = labelDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, count };
  }).reverse();

  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-violet-400" />
        Weekly completions
      </h3>
      <div className="flex items-end gap-2 h-32">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] text-slate-500">{w.count || ""}</span>
            <div className="w-full rounded-t-md bg-violet-950/60" style={{ height: "88px" }}>
              <div
                className="w-full bg-gradient-to-t from-violet-600 to-violet-500 rounded-t-md transition-all duration-700"
                style={{ height: `${(w.count / max) * 100}%`, marginTop: `${(1 - w.count / max) * 88}px` }}
              />
            </div>
            <span className="text-[9px] text-slate-600 truncate w-full text-center">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="flex items-center gap-4 py-3.5 px-5 border-b border-violet-900/10 last:border-0 hover:bg-violet-950/20 transition-colors group">
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
          <p className="text-sm font-semibold text-violet-300">{habit.habit_strength ?? 10}</p>
          <p className="text-[10px] text-slate-600">strength</p>
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [habits, setHabits]   = useState<Habit[]>([]);
  const [logs, setLogs]       = useState<Pick<HabitLog, "habit_id" | "completed_at">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: h }, { data: l }] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_logs")
          .select("habit_id, completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", daysAgo(90))
          .order("completed_at", { ascending: false }),
      ]);
      setHabits(h ?? []);
      setLogs(l ?? []);
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
  const activeDaysSet = new Set(
    logs
      .filter((l) => {
        const d = l.completed_at.split("T")[0];
        return d >= daysAgo(29);
      })
      .map((l) => l.completed_at.split("T")[0]),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f]">
      <div className="border-b border-violet-900/20 bg-[#09090f]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-violet-950/40">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-400" />
            <h1 className="text-sm font-semibold text-white">Analytics</h1>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {habits.length === 0 ? (
          <div className="text-center py-24">
            <BarChart2 className="w-12 h-12 text-violet-800/50 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300 mb-2">No data yet</h2>
            <p className="text-slate-500 text-sm mb-6">
              Add habits and complete them to see your analytics here.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all text-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
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

            <div className="grid lg:grid-cols-2 gap-4">
              <CompletionHeatmap logs={logs} />
              <WeeklyBars logs={logs} />
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
        )}
      </main>
    </div>
  );
}
