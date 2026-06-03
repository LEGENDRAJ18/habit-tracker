"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check, Clock,
  Sparkles, CalendarDays, Flame, Brain, Plus, Trash2,
  Trophy, Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog, Plan } from "@/types";
import AddHabitModal from "@/components/dashboard/AddHabitModal";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function daysAgo(n: number) { return toDateStr(new Date(Date.now() - n * 86400000)); }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(ds: string) {
  return new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function fmtShort(ds: string) {
  const today = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));
  if (ds === today)    return "Today";
  if (ds === tomorrow) return "Tomorrow";
  return new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function computeBestStreak(logs: { completed_at: string }[]): number {
  if (!logs.length) return 0;
  const days = [...new Set(logs.map(l => l.completed_at.split("T")[0]))].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
  }
  return best;
}
function computeCurrentStreak(logs: { completed_at: string }[]): number {
  if (!logs.length) return 0;
  const days = new Set(logs.map(l => l.completed_at.split("T")[0]));
  const today = toDateStr(new Date());
  const start = days.has(today) ? new Date() : new Date(Date.now() - 86400000);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = toDateStr(new Date(start.getTime() - i * 86400000));
    if (days.has(ds)) streak++; else break;
  }
  return streak;
}

// ─── category + color ─────────────────────────────────────────────────────────

type Category = "fitness" | "wellness" | "sleep" | "learning" | "productivity" | "general";

function detectCategory(name: string): Category {
  const n = name.toLowerCase();
  if (/(run|walk|gym|exercise|workout|pushup|squat|bike|swim|yoga|stretch|steps|cardio|hiit|lift|weight|sport|training)/i.test(n)) return "fitness";
  if (/(meditat|breath|gratitude|journal|mindful|calm|stress|anxiet|relax|mental|wellness|therapy)/i.test(n)) return "wellness";
  if (/(sleep|bed|wake|nap|rest|bedtime|insomnia)/i.test(n)) return "sleep";
  if (/(read|study|learn|course|book|cod|program|skill|practice|write|educat|language)/i.test(n)) return "learning";
  if (/(plan|task|work|focus|productiv|review|goal|inbox|meeting|project|organiz|schedule|priorit)/i.test(n)) return "productivity";
  return "general";
}

const CAT_STYLE: Record<Category, { bg: string; border: string; text: string; emoji: string }> = {
  fitness:      { bg: "bg-blue-900/30",   border: "border-blue-700/30",   text: "text-blue-300",    emoji: "💪" },
  wellness:     { bg: "bg-emerald-900/30", border: "border-emerald-700/30", text: "text-emerald-300", emoji: "🧘" },
  sleep:        { bg: "bg-indigo-900/30",  border: "border-indigo-700/30",  text: "text-indigo-300",  emoji: "😴" },
  learning:     { bg: "bg-amber-900/25",   border: "border-amber-700/25",   text: "text-amber-300",   emoji: "📚" },
  productivity: { bg: "bg-orange-900/25",  border: "border-orange-700/25",  text: "text-orange-300",  emoji: "⚡" },
  general:      { bg: "bg-violet-950/30",  border: "border-violet-800/25",  text: "text-violet-300",  emoji: "✅" },
};

function getTimeGroup(whenTime: string | null, completedAt?: string): "morning" | "afternoon" | "evening" | "anytime" {
  const t = completedAt
    ? `${String(new Date(completedAt).getHours()).padStart(2, "0")}:00`
    : whenTime;
  if (!t) return "anytime";
  const h = parseInt(t.split(":")[0], 10);
  if (h >= 5  && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17) return "evening";
  return "anytime";
}

// ─── types ────────────────────────────────────────────────────────────────────

interface DayDetail { date: string; completed: Habit[]; missed: Habit[]; }

interface ScheduledHabit {
  id: string;
  habitId: string | null;
  habitName: string;
  date: string;
  description?: string;
  frequency?: "daily" | "weekly";
  whenTime?: string | null;
  whereLocation?: string | null;
  howLong?: string | null;
  validityScore?: "valid" | "partial" | "invalid";
}

const SCHED_KEY = "habitai_scheduled_v3";
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── HeroStats ────────────────────────────────────────────────────────────────

function HeroStats({ currentStreak, thisMonthTotal, bestStreak }: {
  currentStreak: number; thisMonthTotal: number; bestStreak: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/20 border border-orange-700/25 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Flame className="w-4 h-4 text-orange-400" />
        </div>
        <p className="text-4xl font-black text-orange-300 leading-none">{currentStreak}</p>
        <p className="text-[10px] text-orange-500/80 font-semibold mt-2 uppercase tracking-wider">day streak</p>
      </div>
      <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/20 border border-violet-700/25 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Target className="w-4 h-4 text-violet-400" />
        </div>
        <p className="text-4xl font-black text-violet-300 leading-none">{thisMonthTotal}</p>
        <p className="text-[10px] text-violet-500/80 font-semibold mt-2 uppercase tracking-wider">this month</p>
      </div>
      <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border border-emerald-700/25 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Trophy className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-4xl font-black text-emerald-300 leading-none">{bestStreak}</p>
        <p className="text-[10px] text-emerald-500/80 font-semibold mt-2 uppercase tracking-wider">best streak</p>
      </div>
    </div>
  );
}

// ─── WeeklyProgress ───────────────────────────────────────────────────────────

function WeeklyProgress({ habits, dayCompletionMap }: {
  habits: Habit[];
  dayCompletionMap: Map<string, Set<string>>;
}) {
  const today = toDateStr(new Date());

  // Build Sun–Sat week containing today
  const now = new Date();
  const weekStart = new Date(now.getTime() - now.getDay() * 86400000);

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = toDateStr(new Date(weekStart.getTime() + i * 86400000));
    const isFuture = d > today;
    const isToday  = d === today;
    const done = dayCompletionMap.get(d);
    const existing = habits.filter(h => h.created_at.split("T")[0] <= d);
    const completedCount = done ? existing.filter(h => done.has(h.id)).length : 0;
    const total = existing.length;
    const pct = (!isFuture && total > 0) ? Math.round((completedCount / total) * 100) : null;
    return { d, label: DAY_LABELS[i], isFuture, isToday, pct, completedCount, total };
  });

  // Overall week %
  const pastDays = days.filter(d => !d.isFuture && d.total > 0);
  const totalCompleted = pastDays.reduce((s, d) => s + d.completedCount, 0);
  const totalPossible  = pastDays.reduce((s, d) => s + d.total, 0);
  const weekPct = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : null;

  function getColorClass(pct: number | null): { text: string; border: string; bg: string; barBg: string } {
    if (pct === null) return { text: "text-slate-600", border: "border-slate-700/30", bg: "bg-slate-900/30", barBg: "bg-slate-700/30" };
    if (pct >= 70) return { text: "text-emerald-400", border: "border-emerald-700/40", bg: "bg-emerald-950/40", barBg: "bg-emerald-500" };
    if (pct >= 40) return { text: "text-amber-400",   border: "border-amber-700/40",   bg: "bg-amber-950/40",   barBg: "bg-amber-500"   };
    return            { text: "text-red-400",     border: "border-red-700/40",     bg: "bg-red-950/40",     barBg: "bg-red-500"     };
  }

  const weekColor = getColorClass(weekPct);

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
          <span>📊</span> This Week
        </span>
        {weekPct !== null ? (
          <span className={`text-2xl font-black leading-none ${weekColor.text}`}>{weekPct}%</span>
        ) : (
          <span className="text-slate-600 text-sm">—</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const color = getColorClass(day.pct);
          const fillPct = day.pct ?? 0;
          return (
            <div key={day.d} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${day.isToday ? "text-violet-400" : "text-slate-600"}`}>
                {day.label}
              </span>
              <div className="w-full h-14 bg-slate-800/40 rounded-full relative overflow-hidden">
                {!day.isFuture && day.pct !== null && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-full transition-all ${color.barBg}`}
                    style={{ height: `${Math.max(8, fillPct)}%` }}
                  />
                )}
              </div>
              <span className={`text-[10px] font-bold leading-none ${day.isFuture ? "text-slate-700" : color.text}`}>
                {day.isFuture ? "--" : day.pct !== null ? `${day.pct}%` : "--"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────

function WeekStrip({ selectedDay, onSelectDay, dayCompletionMap, habits }: {
  selectedDay: string | null;
  onSelectDay: (d: string) => void;
  dayCompletionMap: Map<string, Set<string>>;
  habits: Habit[];
}) {
  const today = toDateStr(new Date());
  const now   = new Date();
  const weekStart = new Date(now.getTime() - now.getDay() * 86400000);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d    = toDateStr(new Date(weekStart.getTime() + i * 86400000));
    const done = dayCompletionMap.get(d);
    const existing = habits.filter(h => h.created_at.split("T")[0] <= d);
    const completed = done ? existing.filter(h => done.has(h.id)).length : 0;
    const total     = existing.length;
    const isFuture  = d > today;
    const isToday   = d === today;
    const pct       = total > 0 ? completed / total : null;
    let dotColor: string | null = null;
    if (!isFuture && total > 0) {
      dotColor = pct === 1 ? "bg-emerald-400" : pct! > 0 ? "bg-amber-400" : "bg-red-400/80";
    }
    return { d, dayNum: parseInt(d.split("-")[2], 10), isToday, isFuture, isSelected: d === selectedDay, dotColor };
  });

  return (
    <div className="flex justify-between bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-2 py-3 mb-4">
      {days.map((day, i) => (
        <button
          key={day.d}
          onClick={() => !day.isFuture && onSelectDay(day.d === selectedDay ? "" : day.d)}
          disabled={day.isFuture}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${
            day.isSelected
              ? "bg-violet-700/40"
              : !day.isFuture
              ? "hover:bg-violet-950/40 cursor-pointer"
              : "cursor-default"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wide ${day.isToday ? "text-violet-400" : "text-slate-600"}`}>
            {WEEK_DAYS[i].slice(0, 1)}
          </span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            day.isToday ? "bg-violet-600 shadow-lg shadow-violet-900/50" :
            day.isSelected ? "bg-violet-800/60" : ""
          }`}>
            <span className={`text-sm font-bold ${
              day.isToday ? "text-white" :
              day.isFuture ? "text-slate-700" :
              day.isSelected ? "text-violet-200" : "text-slate-300"
            }`}>{day.dayNum}</span>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${day.dotColor ?? "bg-transparent"}`} />
        </button>
      ))}
    </div>
  );
}

// ─── DayDetailPanel ───────────────────────────────────────────────────────────

const TIME_GROUP_META = {
  morning:   { label: "Morning",   emoji: "🌅", range: "5am – 12pm" },
  afternoon: { label: "Afternoon", emoji: "☀️",  range: "12pm – 5pm" },
  evening:   { label: "Evening",   emoji: "🌆", range: "5pm – 11pm" },
  anytime:   { label: "Anytime",   emoji: "📌", range: "no time set" },
} as const;

function DayDetailPanel({ detail, logs, onClose }: {
  detail: DayDetail;
  logs: (Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[];
  onClose: () => void;
}) {
  const dayLogs = logs.filter(l => l.completed_at.startsWith(detail.date));
  const allDone  = detail.missed.length === 0 && detail.completed.length > 0;
  const noneDone = detail.completed.length === 0 && detail.missed.length > 0;

  // Group completed by time of day
  const groups: Record<string, { habit: Habit; log?: typeof dayLogs[0] }[]> = {
    morning: [], afternoon: [], evening: [], anytime: [],
  };
  for (const h of detail.completed) {
    const log  = dayLogs.find(l => l.habit_id === h.id);
    const grp  = getTimeGroup(h.when_time, log?.completed_at);
    groups[grp].push({ habit: h, log });
  }

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
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
          {/* Completed — grouped by time */}
          {(["morning", "afternoon", "evening", "anytime"] as const).map(grp => {
            const items = groups[grp];
            if (!items.length) return null;
            const meta = TIME_GROUP_META[grp];
            return (
              <div key={grp}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm leading-none">{meta.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{meta.label}</span>
                  <span className="text-[9px] text-slate-700">· {meta.range}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map(({ habit, log }) => {
                    const cat = detectCategory(habit.name);
                    const cs  = CAT_STYLE[cat];
                    return (
                      <div key={habit.id} className={`flex items-center gap-3 py-2.5 px-3 ${cs.bg} border ${cs.border} rounded-xl`}>
                        <span className="text-sm leading-none flex-shrink-0">{cs.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${cs.text}`}>{habit.name}</p>
                          {log && (
                            <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(log.completed_at)}
                            </p>
                          )}
                        </div>
                        <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Missed */}
          {detail.missed.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm leading-none">❌</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Missed</span>
              </div>
              <div className="space-y-1.5">
                {detail.missed.map(h => (
                  <div key={h.id} className="flex items-center gap-3 py-2.5 px-3 bg-red-950/15 border border-red-900/20 rounded-xl">
                    <div className="w-3.5 h-3.5 rounded-full border border-red-500/40 flex-shrink-0" />
                    <p className="text-sm text-slate-500 truncate">{h.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {detail.completed.length > 0 && (
        <div className="px-5 py-2.5 border-t border-violet-900/15 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {detail.completed.length} / {detail.completed.length + detail.missed.length} completed
          </span>
          <span className="text-xs font-bold text-emerald-400">
            {Math.round((detail.completed.length / (detail.completed.length + detail.missed.length)) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── PlanAheadSection ─────────────────────────────────────────────────────────

function PlanAheadSection({ habits, goals, tier, scheduled, onAdd, onRemove, onComplete }: {
  habits: Habit[]; goals: string[]; tier: Plan;
  scheduled: ScheduledHabit[];
  onAdd: (s: ScheduledHabit) => void;
  onRemove: (id: string) => void;
  onComplete: (s: ScheduledHabit) => void;
}) {
  const [showModal, setShowModal] = useState(false);

  const upcoming = useMemo(() => {
    const next7 = Array.from({ length: 7 }, (_, i) => toDateStr(new Date(Date.now() + i * 86400000)));
    return scheduled.filter(s => next7.includes(s.date)).sort((a, b) => a.date.localeCompare(b.date));
  }, [scheduled]);

  const handleSchedule = useCallback((
    name: string, description: string, frequency: "daily" | "weekly",
    whenTime: string | null, whereLocation: string | null,
    howLong: string | null, validityScore: "valid" | "partial" | "invalid",
    dates: string[],
  ) => {
    dates.forEach(date => onAdd({
      id: crypto.randomUUID(),
      habitId: null,
      habitName: name,
      date,
      description,
      frequency,
      whenTime,
      whereLocation,
      howLong,
      validityScore,
    }));
  }, [onAdd]);

  return (
    <>
      {showModal && (
        <AddHabitModal
          onClose={() => setShowModal(false)}
          existingHabits={habits}
          goals={goals}
          tier={tier}
          withScheduling={true}
          onAdd={async () => ({ error: null })}
          onSchedule={handleSchedule}
          onUpgradePro={() => {}}
        />
      )}

      <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-semibold text-white">Plan Ahead 📅</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 text-sm font-semibold rounded-xl transition-all mb-4"
        >
          <Plus className="w-3.5 h-3.5" />
          Plan a new habit
        </button>

        {upcoming.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2">Next 7 days</p>
            {upcoming.map(s => {
              const cat = detectCategory(s.habitName);
              const cs  = CAT_STYLE[cat];
              return (
                <div key={s.id} className={`flex items-center gap-2.5 ${cs.bg} border ${cs.border} rounded-xl px-3 py-2.5`}>
                  <span className="text-sm leading-none flex-shrink-0">{cs.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">{fmtShort(s.date)}</p>
                    <p className={`text-xs font-semibold truncate mt-0.5 ${cs.text}`}>{s.habitName}</p>
                    {s.whenTime && (
                      <p className="text-[9px] text-slate-600 mt-0.5">{s.whenTime.replace(/^0/, "")} · {s.howLong ?? ""}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onComplete(s)}
                      title="Mark as done"
                      className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/40 transition-all flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemove(s.id)}
                      className="text-slate-700 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-700 text-center py-1">No habits planned for the next 7 days.</p>
        )}
      </div>
    </>
  );
}

// ─── MonthInsights ────────────────────────────────────────────────────────────

function MonthInsights({ logs, habits, year, month }: {
  logs: (Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[];
  habits: Habit[];
  year: number; month: number;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" });

  const stats = useMemo(() => {
    const prefix    = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthLogs = logs.filter(l => l.completed_at.startsWith(prefix));
    const total     = monthLogs.length;
    const today     = toDateStr(new Date());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay   = `${prefix}-${String(daysInMonth).padStart(2, "0")}`;
    const endDay    = lastDay > today ? today : lastDay;
    const startDay  = `${prefix}-01`;
    const dayCount  = Math.max(1, Math.round((new Date(endDay).getTime() - new Date(startDay).getTime()) / 86400000) + 1);
    let possible    = 0;
    for (let i = 0; i < dayCount; i++) {
      const d = toDateStr(new Date(new Date(startDay + "T12:00:00").getTime() + i * 86400000));
      possible += habits.filter(h => h.created_at.split("T")[0] <= d).length;
    }
    const completionRate = possible > 0 ? Math.round((total / possible) * 100) : 0;

    const dayMap = new Map<string, number>();
    for (const l of monthLogs) {
      const d = l.completed_at.split("T")[0];
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    }
    let bestDay = "", bestDayCount = 0;
    for (const [d, c] of dayMap) {
      if (c > bestDayCount) { bestDayCount = c; bestDay = d; }
    }
    const bestDayLabel = bestDay
      ? new Date(bestDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", day: "numeric" })
      : "—";

    return { total, completionRate, bestDayLabel };
  }, [logs, habits, year, month]);

  const insights = useMemo(() => {
    if (logs.length < 3) return null;
    const dowCount = Array(7).fill(0);
    for (const l of logs) dowCount[new Date(l.completed_at).getDay()]++;
    const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const bestDow = DOW[dowCount.indexOf(Math.max(...dowCount))];

    let morning = 0, afternoon = 0, evening = 0;
    for (const l of logs) {
      const h = new Date(l.completed_at).getHours();
      if (h >= 5 && h < 12) morning++;
      else if (h >= 12 && h < 17) afternoon++;
      else evening++;
    }
    const bestTime = morning >= afternoon && morning >= evening ? "morning"
      : afternoon >= evening ? "afternoon" : "evening";

    let consistentWeeks = 0;
    for (let w = 0; w < 12; w++) {
      const wEnd   = new Date(Date.now() - w * 7 * 86400000);
      const wStart = new Date(Date.now() - (w + 1) * 7 * 86400000);
      if (logs.some(l => { const d = new Date(l.completed_at); return d >= wStart && d <= wEnd; })) consistentWeeks++;
    }
    return { bestDow, bestTime, consistentWeeks };
  }, [logs]);

  return (
    <div className="space-y-3">
      {/* Month stats with big numbers */}
      <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3">
          {monthLabel}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-violet-950/40 border border-violet-800/20 rounded-xl p-3">
            <p className="text-3xl font-black text-violet-300 leading-none">{stats.total}</p>
            <p className="text-[10px] text-slate-500 mt-1.5">completions</p>
          </div>
          <div className={`border rounded-xl p-3 ${
            stats.completionRate >= 70 ? "bg-emerald-950/30 border-emerald-800/20"
            : stats.completionRate >= 40 ? "bg-amber-950/25 border-amber-800/20"
            : "bg-red-950/20 border-red-900/20"
          }`}>
            <p className={`text-3xl font-black leading-none ${
              stats.completionRate >= 70 ? "text-emerald-300"
              : stats.completionRate >= 40 ? "text-amber-300"
              : "text-red-400"
            }`}>{stats.completionRate}%</p>
            <p className="text-[10px] text-slate-500 mt-1.5">completion rate</p>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-violet-900/15">
          <span className="text-[11px] text-slate-500">Best day</span>
          <span className="text-[11px] font-bold text-violet-300">{stats.bestDayLabel}</span>
        </div>
      </div>

      {/* Insights with big numbers */}
      <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-3.5 h-3.5 text-violet-400" />
          <p className="text-sm font-semibold text-white">Patterns</p>
        </div>
        {insights ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-950/25 border border-amber-800/20 rounded-xl p-3">
                <p className="text-sm font-black text-amber-300 leading-none">{insights.bestDow}</p>
                <p className="text-[9px] text-slate-500 mt-1.5 uppercase tracking-wider">best day</p>
              </div>
              <div className="bg-blue-950/25 border border-blue-800/20 rounded-xl p-3">
                <p className="text-sm font-black text-blue-300 leading-none capitalize">{insights.bestTime}</p>
                <p className="text-[9px] text-slate-500 mt-1.5 uppercase tracking-wider">peak time</p>
              </div>
            </div>
            <div className="bg-emerald-950/25 border border-emerald-800/20 rounded-xl p-3">
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-emerald-300 leading-none">{insights.consistentWeeks}</p>
                <p className="text-sm text-slate-500 font-medium">/ 12 weeks active</p>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.round((insights.consistentWeeks / 12) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 text-center py-2">Complete more habits to unlock insights.</p>
        )}
      </div>
    </div>
  );
}

// ─── ContributionHeatmap ──────────────────────────────────────────────────────

function ContributionHeatmap({ logs, habits }: {
  logs: Pick<HabitLog, "habit_id" | "completed_at">[];
  habits: Habit[];
}) {
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
          {["S","M","T","W","T","F","S"].map((d, i) => (
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const supabase  = useRef(createClient()).current;

  const [habits,      setHabits]      = useState<Habit[]>([]);
  const [logs,        setLogs]        = useState<(Pick<HabitLog, "habit_id" | "completed_at"> & { id: string })[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [goals,       setGoals]       = useState<string[]>([]);
  const [tier,        setTier]        = useState<Plan>("free");
  const [scheduled,   setScheduled]   = useState<ScheduledHabit[]>([]);

  const today = toDateStr(new Date());
  const [year,  setYear]  = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Fetch habits + logs + profile
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: h }, { data: l }, { data: p }] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_logs").select("id, habit_id, completed_at").eq("user_id", user.id)
          .gte("completed_at", daysAgo(365)).order("completed_at", { ascending: true }),
        supabase.from("profiles").select("goals, subscription_tier, username").eq("id", user.id).single(),
      ]);
      setHabits(h ?? []);
      setLogs(l ?? []);
      if (p) {
        setGoals(Array.isArray(p.goals) && p.goals.length > 0 ? p.goals : []);
        if (p.subscription_tier) setTier(p.subscription_tier as Plan);
        if (p.username) setDisplayName(p.username);
        else {
          const raw = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";
          const name = raw.split(/[\s_\-+@]/)[0]?.trim();
          if (name) setDisplayName(name);
        }
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Load scheduled from localStorage
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

  const handleCalendarSchedule = useCallback((
    name: string, description: string, frequency: "daily" | "weekly",
    whenTime: string | null, whereLocation: string | null,
    howLong: string | null, validityScore: "valid" | "partial" | "invalid",
    dates: string[],
  ) => {
    dates.forEach(date => addScheduled({
      id: crypto.randomUUID(),
      habitId: null,
      habitName: name,
      date,
      description,
      frequency,
      whenTime,
      whereLocation,
      howLong,
      validityScore,
    }));
    setShowPlanModal(false);
  }, [addScheduled]);

  const removeScheduled = useCallback((id: string) => {
    setScheduled(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem(SCHED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [saveScheduled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Complete a scheduled habit early — create in DB + log
  const handleCompleteScheduled = useCallback(async (s: ScheduledHabit) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let habitId = s.habitId;
    if (!habitId) {
      const { data: newHabit } = await supabase.from("habits").insert({
        user_id:        user.id,
        name:           s.habitName,
        description:    s.description   ?? null,
        frequency:      s.frequency     ?? "daily",
        when_time:      s.whenTime      ?? null,
        where_location: s.whereLocation ?? null,
        how_long:       s.howLong       ?? null,
        validity_score: s.validityScore ?? "valid",
        habit_strength: 10,
      }).select().single();
      if (!newHabit) return;
      habitId = newHabit.id;
      setHabits(prev => [...prev, newHabit]);
    }

    const completedAt = new Date().toISOString();
    const { data: log } = await supabase.from("habit_logs").insert({
      habit_id: habitId, user_id: user.id, completed_at: completedAt,
    }).select("id, habit_id, completed_at").single();

    if (log) setLogs(prev => [...prev, log]);
    removeScheduled(s.id);
  }, [supabase, removeScheduled]);

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

  // Scheduled dates set
  const scheduledDates = useMemo(() => new Set(scheduled.map(s => s.date)), [scheduled]);

  // This month totals for HeroStats
  const thisMonthTotal = useMemo(() => {
    const prefix = `${today.slice(0, 7)}`;
    return logs.filter(l => l.completed_at.startsWith(prefix)).length;
  }, [logs, today]);

  const currentStreak = useMemo(() => computeCurrentStreak(logs), [logs]);
  const bestStreak    = useMemo(() => computeBestStreak(logs), [logs]);

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
      const existing  = habits.filter(h => h.created_at.split("T")[0] <= d);
      const completed = existing.filter(h => (done ?? new Set()).has(h.id));
      const missed    = isFuture ? [] : existing.filter(h => !(done ?? new Set()).has(h.id));
      const pct       = existing.length > 0 ? completed.length / existing.length : null;

      let dotColor = "bg-slate-700/60";
      if (!isFuture && existing.length > 0) {
        if (pct === 1)     dotColor = "bg-emerald-400";
        else if (pct! > 0) dotColor = "bg-amber-400";
        else               dotColor = "bg-red-500/80";
      }

      return {
        d, i: i + 1, isFuture, isToday, isSelected,
        completed, missed, pct, dotColor,
        totalExisting: existing.length,
        hasScheduled:  scheduledDates.has(d),
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
  // Allow up to 2 months ahead for planning
  const canGoNext = new Date(year, month + 1, 1) > new Date(Date.now() + 62 * 86400000);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedDetail = useMemo((): DayDetail | null => {
    if (!selectedDay) return null;
    const done = dayCompletionMap.get(selectedDay) ?? new Set<string>();
    const existing = habits.filter(h => h.created_at.split("T")[0] <= selectedDay);
    return {
      date:      selectedDay,
      completed: existing.filter(h => done.has(h.id)),
      missed:    selectedDay < today ? existing.filter(h => !done.has(h.id)) : [],
    };
  }, [selectedDay, dayCompletionMap, habits, today]);

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
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/40 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add your first habit
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      {showPlanModal && (
        <AddHabitModal
          onClose={() => setShowPlanModal(false)}
          existingHabits={habits}
          goals={goals}
          tier={tier}
          withScheduling={true}
          singleDateMode={true}
          onAdd={async () => ({ error: null })}
          onSchedule={handleCalendarSchedule}
          onUpgradePro={() => {}}
        />
      )}
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8 page-fade">
        <div className="xl:grid xl:grid-cols-[1fr_300px] xl:gap-6 xl:items-start">

          {/* ── Center column ─────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-5">

            {/* Plan a new habit — top CTA */}
            <button
              onClick={() => setShowPlanModal(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl px-5 py-3.5 w-full flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-900/40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Plan a new habit
            </button>

            {/* Greeting + hero stats */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h1 className="text-lg font-bold text-white">
                  Habit history{displayName ? `, ${displayName}` : ""}
                </h1>
              </div>
              <p className="text-sm text-slate-500 mb-5">Click any day to see what you completed · plan ahead on the right</p>
              <HeroStats currentStreak={currentStreak} thisMonthTotal={thisMonthTotal} bestStreak={bestStreak} />
            </div>

            {/* Weekly completion rate */}
            <WeeklyProgress habits={habits} dayCompletionMap={dayCompletionMap} />

            {/* Week strip */}
            <WeekStrip
              selectedDay={selectedDay}
              onSelectDay={(d) => setSelectedDay(d === "" ? null : d)}
              dayCompletionMap={dayCompletionMap}
              habits={habits}
            />

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
              <div className="grid grid-cols-7 border-b border-violet-900/15">
                {WEEK_DAYS.map(d => (
                  <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`blank-${idx}`} className="aspect-square border-r border-b border-violet-900/10 last:border-r-0" />;
                  const clickable = !day.isFuture && day.totalExisting > 0;
                  return (
                    <button
                      key={day.d}
                      onClick={() => clickable && setSelectedDay(day.d === selectedDay ? null : day.d)}
                      disabled={!clickable}
                      className={`aspect-square border-r border-b border-violet-900/10 last:border-r-0 flex flex-col items-center justify-center gap-1 transition-all group relative ${
                        day.isSelected ? "bg-violet-900/40" :
                        day.isToday   ? "bg-violet-950/50" :
                        clickable     ? "hover:bg-violet-950/30 cursor-pointer" : "cursor-default"
                      }`}
                    >
                      {day.isToday ? (
                        <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white leading-none shadow-lg shadow-violet-900/50">
                          {day.i}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium leading-none ${
                          day.isSelected ? "text-violet-200 font-bold" :
                          day.isFuture   ? "text-slate-700" :
                          "text-slate-400 group-hover:text-slate-200"
                        }`}>{day.i}</span>
                      )}
                      {!day.isFuture && day.totalExisting > 0 && (
                        <div className={`w-1.5 h-1.5 rounded-full ${day.dotColor}`} />
                      )}
                      {day.hasScheduled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-600 justify-center flex-wrap">
              {[
                { color: "bg-emerald-400",   label: "All done"   },
                { color: "bg-amber-400",     label: "Partial"    },
                { color: "bg-red-500/80",    label: "Missed all" },
                { color: "bg-slate-700/60",  label: "No habits"  },
                { color: "bg-violet-500/70", label: "Planned"    },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${l.color} inline-block`} />
                  {l.label}
                </span>
              ))}
            </div>

            {/* Category legend */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {(Object.entries(CAT_STYLE) as [Category, typeof CAT_STYLE[Category]][]).filter(([k]) => k !== "general").map(([key, cs]) => (
                <span key={key} className="flex items-center gap-1 text-[10px] text-slate-600">
                  <span>{cs.emoji}</span>
                  <span className={cs.text + " font-medium capitalize"}>{key}</span>
                </span>
              ))}
            </div>

            {/* Selected day detail (inline) */}
            {selectedDetail && (
              <DayDetailPanel detail={selectedDetail} logs={logs} onClose={() => setSelectedDay(null)} />
            )}

            {/* Heatmap */}
            <ContributionHeatmap logs={logs} habits={habits} />

            {/* Mobile-only: right sidebar content */}
            <div className="xl:hidden space-y-4">
              <PlanAheadSection
                habits={habits} goals={goals} tier={tier}
                scheduled={scheduled}
                onAdd={addScheduled}
                onRemove={removeScheduled}
                onComplete={handleCompleteScheduled}
              />
              <MonthInsights logs={logs} habits={habits} year={year} month={month} />
            </div>
          </div>

          {/* ── Right sidebar (xl+) ────────────────────────────────────────── */}
          <div className="hidden xl:flex xl:flex-col gap-4 sticky top-20 overflow-hidden pb-4">
            <PlanAheadSection
              habits={habits} goals={goals} tier={tier}
              scheduled={scheduled}
              onAdd={addScheduled}
              onRemove={removeScheduled}
              onComplete={handleCompleteScheduled}
            />
            <MonthInsights logs={logs} habits={habits} year={year} month={month} />
          </div>

        </div>
      </main>
    </div>
  );
}
