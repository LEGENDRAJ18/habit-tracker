"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft, Calendar as CalendarIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types";
import BottomNav from "@/components/ui/BottomNav";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number) {
  return toDateStr(new Date(Date.now() - n * 86400000));
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── types ────────────────────────────────────────────────────────────────────

interface DayDetail {
  date: string;
  completed: Habit[];
  missed: Habit[];
}

// ─── heatmap ─────────────────────────────────────────────────────────────────

function ContributionHeatmap({
  logs,
  habits,
}: {
  logs: Pick<HabitLog, "habit_id" | "completed_at">[];
  habits: Habit[];
}) {
  const WEEKS = 16;
  const DAYS  = WEEKS * 7;
  const habitCount = Math.max(1, habits.length);

  const cells = Array.from({ length: DAYS }, (_, i) => {
    const d     = daysAgo(DAYS - 1 - i);
    const count = logs.filter((l) => l.completed_at.startsWith(d)).length;
    const pct   = Math.round((count / habitCount) * 100);
    return { date: d, count, pct };
  });

  function cellColor(pct: number, isFuture: boolean) {
    if (isFuture) return "bg-slate-900/40";
    if (pct === 0)   return "bg-slate-800/50";
    if (pct < 40)    return "bg-violet-900/70";
    if (pct < 75)    return "bg-violet-600/60";
    return "bg-violet-500";
  }

  const today = toDateStr(new Date());
  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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
              const cell    = cells[w * 7 + d];
              const isFuture = cell?.date > today;
              const isToday = cell?.date === today;
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
        {(["bg-slate-800/50", "bg-violet-900/70", "bg-violet-600/60", "bg-violet-500"] as const).map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded ${c}`} />
        ))}
        <span className="text-[10px] text-slate-600">More</span>
      </div>
    </div>
  );
}

// ─── day detail panel ─────────────────────────────────────────────────────────

function DayDetailPanel({
  detail,
  logs,
  onClose,
}: {
  detail: DayDetail;
  logs: (Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[];
  onClose: () => void;
}) {
  const dayLogs = logs.filter((l) => l.completed_at.startsWith(detail.date));
  const display = new Date(detail.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-sm bg-[#0f0f1a] border border-violet-800/30 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-900/20">
          <p className="text-sm font-semibold text-white">{display}</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
          {detail.completed.length === 0 && detail.missed.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No habits tracked on this day.</p>
          )}
          {detail.completed.map((h) => {
            const log = dayLogs.find((l) => l.habit_id === h.id);
            return (
              <div key={h.id} className="flex items-center gap-3 py-2.5 px-3 bg-violet-950/30 border border-violet-700/25 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-violet-200 font-medium truncate">{h.name}</p>
                  {log && <p className="text-[10px] text-slate-600 mt-0.5">Completed at {formatTime(log.completed_at)}</p>}
                </div>
              </div>
            );
          })}
          {detail.missed.map((h) => (
            <div key={h.id} className="flex items-center gap-3 py-2.5 px-3 bg-red-950/20 border border-red-900/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-red-500/60 flex-shrink-0" />
              <p className="text-sm text-slate-500 font-medium truncate">{h.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs]     = useState<(Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today   = toDateStr(new Date());
  const [year, setYear]   = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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

  // Build per-day completion set
  const dayCompletionMap = useMemo(() => {
    const map = new Map<string, Set<string>>(); // date → Set<habit_id>
    for (const log of logs) {
      const d = log.completed_at.split("T")[0];
      if (!map.has(d)) map.set(d, new Set());
      map.get(d)!.add(log.habit_id);
    }
    return map;
  }, [logs]);

  // Calendar grid for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDay }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d   = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      const done = dayCompletionMap.get(d);
      const isFuture = d > today;
      const isToday  = d === today;

      // Find which habits existed on this day (created before or on this day)
      const existingHabits = habits.filter((h) => h.created_at.split("T")[0] <= d);
      const completedIds   = done ?? new Set<string>();
      const completed      = existingHabits.filter((h) => completedIds.has(h.id));
      const missed         = isFuture ? [] : existingHabits.filter((h) => !completedIds.has(h.id));

      const totalExisting = existingHabits.length;
      const pct = totalExisting > 0 ? completed.length / totalExisting : null;

      let dotColor = "bg-slate-700";
      if (!isFuture && totalExisting > 0) {
        if (pct === 1)       dotColor = "bg-violet-400";
        else if (pct! > 0)   dotColor = "bg-violet-600/80";
        else                 dotColor = "bg-red-500/60";
      }

      return { d, i: i + 1, isFuture, isToday, completed, missed, pct, dotColor, totalExisting };
    });
    return [...blanks, ...days] as (typeof days[0] | null)[];
  }, [year, month, dayCompletionMap, habits, today]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const canGoNext = new Date(year, month + 1, 1) <= new Date();

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedDetail = useMemo((): DayDetail | null => {
    if (!selectedDay) return null;
    const done = dayCompletionMap.get(selectedDay) ?? new Set<string>();
    const existingHabits = habits.filter((h) => h.created_at.split("T")[0] <= selectedDay);
    return {
      date:      selectedDay,
      completed: existingHabits.filter((h) => done.has(h.id)),
      missed:    selectedDay < today ? existingHabits.filter((h) => !done.has(h.id)) : [],
    };
  }, [selectedDay, dayCompletionMap, habits, today]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      {/* Header */}
      <div className="border-b border-violet-900/20 bg-[#09090f]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-violet-950/40">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CalendarIcon className="w-4 h-4 text-violet-400" />
          <h1 className="text-sm font-semibold text-white">Calendar</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Month navigator */}
        <div className="flex items-center justify-between bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-4 py-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-300 hover:bg-violet-950/60 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-white">{monthLabel}</h2>
          <button onClick={nextMonth} disabled={canGoNext} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-300 hover:bg-violet-950/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-violet-900/15">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`blank-${idx}`} className="aspect-square border-r border-b border-violet-900/10 last:border-r-0" />;
              }
              const isPast = !day.isFuture && day.d !== today;
              return (
                <button
                  key={day.d}
                  onClick={() => !day.isFuture && setSelectedDay(day.d)}
                  disabled={day.isFuture}
                  className={`aspect-square border-r border-b border-violet-900/10 last:border-r-0 flex flex-col items-center justify-center gap-1 transition-all relative ${
                    day.isToday
                      ? "bg-violet-900/30"
                      : isPast && day.totalExisting > 0
                      ? "hover:bg-violet-950/40 cursor-pointer"
                      : "cursor-default"
                  } ${selectedDay === day.d ? "bg-violet-900/40 ring-inset ring-1 ring-violet-500/70" : ""}`}
                >
                  <span className={`text-xs font-medium leading-none ${
                    day.isToday ? "text-violet-200 font-bold" : day.isFuture ? "text-slate-700" : "text-slate-400"
                  }`}>
                    {day.i}
                  </span>
                  {!day.isFuture && day.totalExisting > 0 && (
                    <div className={`w-2 h-2 rounded-full ${day.dotColor}`} />
                  )}
                  {day.isToday && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-600 justify-center flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />All done</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-600/80 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" />Missed all</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-700 inline-block" />No habits yet</span>
        </div>

        {/* Heatmap */}
        <ContributionHeatmap logs={logs} habits={habits} />
      </main>

      {/* Day detail panel */}
      {selectedDetail && (
        <DayDetailPanel
          detail={selectedDetail}
          logs={logs}
          onClose={() => setSelectedDay(null)}
        />
      )}
      <BottomNav />
    </div>
  );
}
