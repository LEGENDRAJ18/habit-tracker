"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  X, Check, Clock, Sparkles, TrendingUp, CalendarDays, Flame,
  Plus, Trash2, Brain,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { useXP } from "@/hooks/useXP";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import BottomNav from "@/components/ui/BottomNav";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function daysAgo(n: number) { return toDateStr(new Date(Date.now() - n * 86400000)); }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(ds: string) {
  return new Date(ds + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}
function fmtShort(ds: string) {
  const today = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));
  if (ds === today)    return "Today";
  if (ds === tomorrow) return "Tomorrow";
  return new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function computeBestStreak(logs: { completed_at: string }[]): number {
  if (!logs.length) return 0;
  const days = [...new Set(logs.map(l => l.completed_at.split("T")[0]))].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

function computeCurrentStreak(logs: { completed_at: string }[]): number {
  if (!logs.length) return 0;
  const days = new Set(logs.map(l => l.completed_at.split("T")[0]));
  const today = toDateStr(new Date());
  let start = days.has(today) ? new Date() : new Date(Date.now() - 86400000);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = toDateStr(new Date(start.getTime() - i * 86400000));
    if (days.has(ds)) streak++;
    else break;
  }
  return streak;
}

// ─── types ────────────────────────────────────────────────────────────────────

interface DayDetail { date: string; completed: Habit[]; missed: Habit[]; }
interface ScheduledHabit { id: string; habitId: string; habitName: string; date: string; }

const SCHED_KEY = "habitai_scheduled_v2";

// ─── heatmap ─────────────────────────────────────────────────────────────────

function ContributionHeatmap({
  logs, habits,
}: { logs: Pick<HabitLog, "habit_id" | "completed_at">[]; habits: Habit[] }) {
  const WEEKS = 16;
  const DAYS  = WEEKS * 7;
  const habitCount = Math.max(1, habits.length);

  const cells = Array.from({ length: DAYS }, (_, i) => {
    const d    = daysAgo(DAYS - 1 - i);
    const count = logs.filter(l => l.completed_at.startsWith(d)).length;
    const pct  = Math.round((count / habitCount) * 100);
    return { date: d, count, pct };
  });

  const today = toDateStr(new Date());
  const DAY_LABELS = ["S","M","T","W","T","F","S"];

  function cellColor(pct: number, isFuture: boolean) {
    if (isFuture) return "bg-slate-900/40";
    if (pct === 0)  return "bg-slate-800/50";
    if (pct < 40)   return "bg-emerald-900/70";
    if (pct < 75)   return "bg-emerald-600/60";
    return "bg-emerald-500";
  }

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-violet-400" />
        Contribution heatmap
        <span className="text-xs text-slate-600 font-normal ml-1">last {WEEKS} weeks</span>
      </h3>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex flex-col gap-1 mr-2">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="w-3.5 h-3.5 flex items-center justify-center text-[8px] text-slate-600 leading-none">{d}</div>
          ))}
        </div>
        {Array.from({ length: WEEKS }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const cell = cells[w * 7 + d];
              const isFuture = cell?.date > today;
              const isToday  = cell?.date === today;
              return (
                <div
                  key={d}
                  title={cell ? `${cell.date}: ${cell.count}/${habitCount} habits` : ""}
                  className={`w-3.5 h-3.5 rounded transition-all ${cell ? cellColor(cell.pct, isFuture) : "bg-transparent"} ${isToday ? "ring-1 ring-violet-400/60" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-slate-600">Less</span>
        {["bg-slate-800/50","bg-emerald-900/70","bg-emerald-600/60","bg-emerald-500"].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded ${c}`} />
        ))}
        <span className="text-[10px] text-slate-600">More</span>
      </div>
    </div>
  );
}

// ─── inline day detail panel ──────────────────────────────────────────────────

function DayDetailPanel({
  detail, logs, onClose,
}: {
  detail: DayDetail;
  logs: (Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[];
  onClose: () => void;
}) {
  const dayLogs = logs.filter(l => l.completed_at.startsWith(detail.date));
  const allDone = detail.missed.length === 0 && detail.completed.length > 0;
  const noneDone = detail.completed.length === 0 && detail.missed.length > 0;

  return (
    <div className="bg-[#0c0c18] border border-violet-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-900/20">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allDone ? "bg-emerald-400" : noneDone ? "bg-red-500" : "bg-amber-400"}`} />
          <p className="text-sm font-semibold text-white">{fmtDate(detail.date)}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50">
          <X className="w-4 h-4" />
        </button>
      </div>

      {detail.completed.length === 0 && detail.missed.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6 px-5">No habits tracked on this day.</p>
      ) : (
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {detail.completed.map(h => {
            const log = dayLogs.find(l => l.habit_id === h.id);
            return (
              <div key={h.id} className="flex items-center gap-3 py-2.5 px-3 bg-emerald-950/25 border border-emerald-800/25 rounded-xl">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-200 font-medium truncate">{h.name}</p>
                  {log && (
                    <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(log.completed_at)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {detail.missed.map(h => (
            <div key={h.id} className="flex items-center gap-3 py-2.5 px-3 bg-red-950/15 border border-red-900/20 rounded-xl">
              <div className="w-3.5 h-3.5 rounded-full border border-red-500/40 flex-shrink-0" />
              <p className="text-sm text-slate-500 font-medium truncate">{h.name}</p>
            </div>
          ))}
        </div>
      )}

      {detail.completed.length > 0 && (
        <div className="px-5 py-2.5 border-t border-violet-900/15 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {detail.completed.length} / {detail.completed.length + detail.missed.length} completed
          </span>
          <span className="text-xs font-semibold text-emerald-400">
            {Math.round((detail.completed.length / (detail.completed.length + detail.missed.length)) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Plan Ahead ───────────────────────────────────────────────────────────────

function PlanAheadSection({
  habits, scheduled, onAdd, onRemove,
}: {
  habits: Habit[];
  scheduled: ScheduledHabit[];
  onAdd: (s: ScheduledHabit) => void;
  onRemove: (id: string) => void;
}) {
  const [selectedHabit, setSelectedHabit] = useState("");
  const [selectedDate,  setSelectedDate]  = useState("");
  const today = toDateStr(new Date());

  // Next 7 days upcoming
  const upcoming = useMemo(() => {
    const next7 = Array.from({ length: 7 }, (_, i) =>
      toDateStr(new Date(Date.now() + (i + 0) * 86400000))
    );
    return scheduled
      .filter(s => next7.includes(s.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [scheduled]);

  const handleSchedule = () => {
    if (!selectedHabit || !selectedDate || selectedDate <= today) return;
    const habit = habits.find(h => h.id === selectedHabit);
    if (!habit) return;
    onAdd({
      id:        crypto.randomUUID(),
      habitId:   habit.id,
      habitName: habit.name,
      date:      selectedDate,
    });
    setSelectedHabit("");
    setSelectedDate("");
  };

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-violet-400" />
        <p className="text-sm font-semibold text-white">Plan Ahead 📅</p>
      </div>

      {habits.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-3">Add habits first to plan ahead.</p>
      ) : (
        <div className="space-y-2.5 mb-4">
          <select
            value={selectedHabit}
            onChange={e => setSelectedHabit(e.target.value)}
            className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-3 py-2 text-sm text-white appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#0f0f1a] text-slate-400">Select a habit…</option>
            {habits.map(h => (
              <option key={h.id} value={h.id} className="bg-[#0f0f1a] text-white">{h.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            min={toDateStr(new Date(Date.now() + 86400000))}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark]"
          />
          <button
            onClick={handleSchedule}
            disabled={!selectedHabit || !selectedDate || selectedDate <= today}
            className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed border border-violet-600/30 text-violet-300 text-sm font-medium rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2">Next 7 days</p>
          {upcoming.map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-violet-950/20 border border-violet-900/15 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-slate-200 truncate">{s.habitName}</p>
                <p className="text-[10px] text-violet-400 mt-0.5">{fmtShort(s.date)}</p>
              </div>
              <button
                onClick={() => onRemove(s.id)}
                className="text-slate-700 hover:text-red-400 transition-colors p-0.5 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 && habits.length > 0 && (
        <p className="text-xs text-slate-700 text-center pb-1">No scheduled habits in the next 7 days.</p>
      )}
    </div>
  );
}

// ─── This Month stats ─────────────────────────────────────────────────────────

function ThisMonthStats({
  logs, habits, year, month,
}: {
  logs: (Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[];
  habits: Habit[];
  year: number;
  month: number;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" });

  const stats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthLogs = logs.filter(l => l.completed_at.startsWith(prefix));
    const total = monthLogs.length;

    // Days in month up to today
    const today = toDateStr(new Date());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = `${prefix}-${String(daysInMonth).padStart(2, "0")}`;
    const endDay = lastDay > today ? today : lastDay;
    const startDay = `${prefix}-01`;

    // Count effective days (days that existed and had habits)
    const dayMap = new Map<string, number>();
    for (const l of monthLogs) {
      const d = l.completed_at.split("T")[0];
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    }

    // Possible completions: habits that existed * days in range
    let possible = 0;
    const dayCount = Math.max(1,
      Math.round((new Date(endDay).getTime() - new Date(startDay).getTime()) / 86400000) + 1
    );
    for (let i = 0; i < dayCount; i++) {
      const d = toDateStr(new Date(new Date(startDay + "T12:00:00").getTime() + i * 86400000));
      const existingOnDay = habits.filter(h => h.created_at.split("T")[0] <= d).length;
      possible += existingOnDay;
    }

    const completionRate = possible > 0 ? Math.round((total / possible) * 100) : 0;

    // Best day this month
    let bestDay = "";
    let bestDayCount = 0;
    for (const [d, c] of dayMap) {
      if (c > bestDayCount) { bestDayCount = c; bestDay = d; }
    }
    const bestDayLabel = bestDay
      ? new Date(bestDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
      : "—";

    const currentStreak = computeCurrentStreak(logs);

    return { total, completionRate, bestDayLabel, bestDayCount, currentStreak };
  }, [logs, habits, year, month]);

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-violet-400" />
        <p className="text-sm font-semibold text-white">{monthLabel}</p>
      </div>

      <div className="space-y-3">
        {[
          {
            label: "Completion rate",
            value: `${stats.completionRate}%`,
            color: stats.completionRate >= 70 ? "text-emerald-400" : stats.completionRate >= 40 ? "text-amber-400" : "text-red-400",
          },
          {
            label: "Best day",
            value: stats.bestDayLabel,
            color: "text-violet-300",
          },
          {
            label: "Total completions",
            value: stats.total.toLocaleString(),
            color: "text-violet-300",
          },
          {
            label: "Current streak",
            value: `${stats.currentStreak}d 🔥`,
            color: stats.currentStreak >= 7 ? "text-orange-300" : "text-slate-300",
          },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{s.label}</span>
            <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Insights card ────────────────────────────────────────────────────────────

function InsightsCard({
  logs,
}: { logs: (Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[] }) {
  const insights = useMemo(() => {
    if (logs.length < 3) return null;

    // Best day of week
    const dowCount = Array(7).fill(0);
    for (const l of logs) dowCount[new Date(l.completed_at).getDay()]++;
    const bestDow = dowCount.indexOf(Math.max(...dowCount));
    const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    // Time of day
    let morning = 0, afternoon = 0, evening = 0;
    for (const l of logs) {
      const h = new Date(l.completed_at).getHours();
      if (h >= 5  && h < 12) morning++;
      else if (h >= 12 && h < 17) afternoon++;
      else evening++;
    }
    const bestTime = morning >= afternoon && morning >= evening ? "morning"
      : afternoon >= evening ? "afternoon" : "evening";

    // Consistent weeks in last 12 weeks
    let consistentWeeks = 0;
    for (let w = 0; w < 12; w++) {
      const wEnd   = new Date(Date.now() - w * 7 * 86400000);
      const wStart = new Date(Date.now() - (w + 1) * 7 * 86400000);
      if (logs.some(l => {
        const d = new Date(l.completed_at);
        return d >= wStart && d <= wEnd;
      })) consistentWeeks++;
    }

    // Most completed habit
    const habitCount = new Map<string, number>();
    for (const l of logs) habitCount.set(l.habit_id, (habitCount.get(l.habit_id) ?? 0) + 1);

    return { bestDow: DOW[bestDow], bestTime, consistentWeeks };
  }, [logs]);

  if (!insights) {
    return (
      <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-semibold text-white">Insights</p>
        </div>
        <p className="text-xs text-slate-600 text-center py-2">
          Complete a few more habits to unlock pattern insights.
        </p>
      </div>
    );
  }

  const lines = [
    { emoji: "📅", text: `Your best day is ${insights.bestDow}` },
    { emoji: "⏰", text: `You complete most habits in the ${insights.bestTime}` },
    { emoji: "🗓️", text: `Active in ${insights.consistentWeeks} of the last 12 weeks` },
  ];

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-violet-400" />
        <p className="text-sm font-semibold text-white">Insights</p>
      </div>
      <div className="space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-base leading-none flex-shrink-0 mt-0.5">{l.emoji}</span>
            <p className="text-xs text-slate-400 leading-relaxed">{l.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const router = useRouter();
  const { tier } = useProfile();
  const { xp, level } = useXP();

  const [habits,      setHabits]      = useState<Habit[]>([]);
  const [logs,        setLogs]        = useState<(Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [scheduled,   setScheduled]   = useState<ScheduledHabit[]>([]);

  const today  = toDateStr(new Date());
  const [year,  setYear]  = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch habits + logs + user name
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Display name
      const raw = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
      const name = raw.split(/[\s_\-+@]/)[0]?.trim();
      if (name) setDisplayName(name);

      const [{ data: h }, { data: l }] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_logs")
          .select("id, habit_id, completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", daysAgo(365))
          .order("completed_at", { ascending: true }),
      ]);
      setHabits(h ?? []);
      setLogs(l ?? []);
      setLoading(false);
    })();
  }, []);

  // Load scheduled habits from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCHED_KEY);
      if (raw) setScheduled(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveScheduled = useCallback((items: ScheduledHabit[]) => {
    setScheduled(items);
    localStorage.setItem(SCHED_KEY, JSON.stringify(items));
  }, []);

  const addScheduled = useCallback((s: ScheduledHabit) => {
    setScheduled(prev => {
      const updated = [...prev, s];
      localStorage.setItem(SCHED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeScheduled = useCallback((id: string) => {
    setScheduled(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem(SCHED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [saveScheduled]);

  // Per-day completion map
  const dayCompletionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs) {
      const d = log.completed_at.split("T")[0];
      if (!map.has(d)) map.set(d, new Set());
      map.get(d)!.add(log.habit_id);
    }
    return map;
  }, [logs]);

  // Scheduled dates set for calendar indicators
  const scheduledDates = useMemo(() => new Set(scheduled.map(s => s.date)), [scheduled]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks      = Array.from({ length: firstDay }, () => null);

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d   = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      const done = dayCompletionMap.get(d);
      const isFuture  = d > today;
      const isToday   = d === today;
      const isSelected = d === selectedDay;

      const existingHabits = habits.filter(h => h.created_at.split("T")[0] <= d);
      const completedIds   = done ?? new Set<string>();
      const completed      = existingHabits.filter(h => completedIds.has(h.id));
      const missed         = isFuture ? [] : existingHabits.filter(h => !completedIds.has(h.id));
      const totalExisting  = existingHabits.length;
      const pct = totalExisting > 0 ? completed.length / totalExisting : null;

      let dotColor = "bg-slate-700/60";
      if (!isFuture && totalExisting > 0) {
        if (pct === 1)      dotColor = "bg-emerald-400";
        else if (pct! > 0)  dotColor = "bg-amber-400";
        else                dotColor = "bg-red-500/80";
      }

      return {
        d, i: i + 1, isFuture, isToday, isSelected,
        completed, missed, pct, dotColor, totalExisting,
        hasScheduled: isFuture && scheduledDates.has(d),
      };
    });

    return [...blanks, ...days] as (typeof days[0] | null)[];
  }, [year, month, dayCompletionMap, habits, today, selectedDay, scheduledDates]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };
  const canGoNext = new Date(year, month + 1, 1) <= new Date();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedDetail = useMemo((): DayDetail | null => {
    if (!selectedDay) return null;
    const done = dayCompletionMap.get(selectedDay) ?? new Set<string>();
    const existingHabits = habits.filter(h => h.created_at.split("T")[0] <= selectedDay);
    return {
      date:      selectedDay,
      completed: existingHabits.filter(h => done.has(h.id)),
      missed:    selectedDay < today ? existingHabits.filter(h => !done.has(h.id)) : [],
    };
  }, [selectedDay, dayCompletionMap, habits, today]);

  const bestStreak = useMemo(() => computeBestStreak(logs), [logs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
        <div className="border-b border-violet-900/20 bg-[#09090f]/90 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-1 text-slate-500 hover:text-white text-xs transition-colors py-1.5 px-2 -ml-2 rounded-lg hover:bg-violet-950/40">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Dashboard</span>
            </Link>
            <span className="text-slate-700 text-sm">/</span>
            <span className="text-sm font-semibold text-white">📅 Calendar</span>
          </div>
        </div>
        <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-900/20 border border-violet-800/25 flex items-center justify-center mx-auto mb-5">
              <CalendarIcon className="w-8 h-8 text-violet-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No habits to track yet</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
              Add your first habit and start building consistency. Your calendar will fill up as you complete habits each day.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/40 hover:-translate-y-0.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add your first habit
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      {/* Sticky header */}
      <div className="border-b border-violet-900/20 bg-[#09090f]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-slate-500 hover:text-white text-xs transition-colors py-1.5 px-2 -ml-2 rounded-lg hover:bg-violet-950/40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Dashboard</span>
          </Link>
          <span className="text-slate-700 text-sm">/</span>
          <span className="text-sm font-semibold text-white">📅 Calendar</span>
        </div>
      </div>

      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8 page-fade">
        <div className="lg:grid lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_300px] lg:gap-6 lg:items-start">

          {/* ── Left sidebar ──────────────────────────────────────────────── */}
          <LeftSidebar
            xp={xp}
            level={level}
            bestStreak={bestStreak}
            tier={tier}
            onUpgradeClick={() => router.push("/billing")}
          />

          {/* ── Center column ─────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-6">

            {/* Greeting */}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h1 className="text-xl font-bold text-white">
                  Your habit history{displayName ? `, ${displayName}` : ""}
                </h1>
              </div>
              <p className="text-sm text-slate-500">Click any day to see what you completed</p>
            </div>

            {/* Month navigator */}
            <div className="flex items-center justify-between bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-4 py-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-300 hover:bg-violet-950/60 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-white">{monthLabel}</h2>
              <button
                onClick={nextMonth}
                disabled={canGoNext}
                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-300 hover:bg-violet-950/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-violet-900/15">
                {WEEK_DAYS.map(d => (
                  <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (!day) return (
                    <div key={`blank-${idx}`} className="aspect-square border-r border-b border-violet-900/10 last:border-r-0" />
                  );
                  const clickable = !day.isFuture && day.totalExisting > 0;
                  return (
                    <button
                      key={day.d}
                      onClick={() => clickable && setSelectedDay(day.d === selectedDay ? null : day.d)}
                      disabled={!clickable}
                      className={`aspect-square border-r border-b border-violet-900/10 last:border-r-0 flex flex-col items-center justify-center gap-1 transition-all relative group ${
                        day.isSelected
                          ? "bg-violet-900/40"
                          : day.isToday
                          ? "bg-violet-950/50"
                          : clickable
                          ? "hover:bg-violet-950/30 cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      {/* Date number — today gets a filled purple circle */}
                      {day.isToday ? (
                        <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white leading-none shadow-lg shadow-violet-900/50">
                          {day.i}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium leading-none ${
                          day.isSelected
                            ? "text-violet-200 font-bold"
                            : day.isFuture
                            ? "text-slate-700"
                            : "text-slate-400 group-hover:text-slate-200"
                        }`}>
                          {day.i}
                        </span>
                      )}

                      {/* Status dot */}
                      {!day.isFuture && day.totalExisting > 0 && (
                        <div className={`w-1.5 h-1.5 rounded-full ${day.dotColor}`} />
                      )}

                      {/* Scheduled indicator for future days */}
                      {day.hasScheduled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color legend */}
            <div className="flex items-center gap-4 text-xs text-slate-600 justify-center flex-wrap">
              {[
                { color: "bg-emerald-400",    label: "All done" },
                { color: "bg-amber-400",      label: "Partial"  },
                { color: "bg-red-500/80",     label: "Missed all" },
                { color: "bg-slate-700/60",   label: "No habits" },
                { color: "bg-violet-500/70",  label: "Scheduled" },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${l.color} inline-block`} />
                  {l.label}
                </span>
              ))}
            </div>

            {/* Selected day detail (inline) */}
            {selectedDetail && (
              <DayDetailPanel
                detail={selectedDetail}
                logs={logs}
                onClose={() => setSelectedDay(null)}
              />
            )}

            {/* Heatmap */}
            <ContributionHeatmap logs={logs} habits={habits} />

            {/* Mobile-only: right sidebar content */}
            <div className="xl:hidden space-y-4">
              <PlanAheadSection
                habits={habits}
                scheduled={scheduled}
                onAdd={addScheduled}
                onRemove={removeScheduled}
              />
              <ThisMonthStats logs={logs} habits={habits} year={year} month={month} />
              <InsightsCard logs={logs} />
            </div>
          </div>

          {/* ── Right sidebar (xl+) ───────────────────────────────────────── */}
          <div className="hidden xl:flex xl:flex-col gap-4 sticky top-20">
            <PlanAheadSection
              habits={habits}
              scheduled={scheduled}
              onAdd={addScheduled}
              onRemove={removeScheduled}
            />
            <ThisMonthStats logs={logs} habits={habits} year={year} month={month} />
            <InsightsCard logs={logs} />
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
