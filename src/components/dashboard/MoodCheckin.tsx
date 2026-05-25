"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Amazing" },
];

interface Correlation {
  habitName: string;
  direction: "positive" | "negative";
  delta: number;
}

export default function MoodCheckin() {
  const supabase = createClient();
  const [todayMood,    setTodayMood]    = useState<number | null>(null);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [daysLogged,   setDaysLogged]   = useState(0);
  const [loaded,       setLoaded]       = useState(false);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoaded(true); return; }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: todayLog }, { data: allLogs }] = await Promise.all([
      supabase.from("mood_logs").select("mood").eq("user_id", user.id).gte("logged_at", todayStart.toISOString()).order("logged_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("mood_logs").select("mood, logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(90),
    ]);

    if (todayLog) { setTodayMood(todayLog.mood); setSelected(todayLog.mood); }

    const logs = allLogs ?? [];
    setDaysLogged(logs.length);

    // Compute correlations after 14 days
    if (logs.length >= 14) {
      const { data: habitLogs } = await supabase
        .from("habit_logs")
        .select("habit_id, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(500);

      const { data: habits } = await supabase
        .from("habits")
        .select("id, name")
        .eq("user_id", user.id);

      if (habitLogs && habits && habitLogs.length > 0) {
        const habitMap = new Map(habits.map((h) => [h.id, h.name]));
        const corrs: Correlation[] = [];

        for (const habit of habits.slice(0, 5)) {
          const logsOnDays   = new Set(habitLogs.filter((l) => l.habit_id === habit.id).map((l) => l.completed_at.split("T")[0]));
          const withHabit    = logs.filter((l) => logsOnDays.has(l.logged_at.split("T")[0]));
          const withoutHabit = logs.filter((l) => !logsOnDays.has(l.logged_at.split("T")[0]));
          if (withHabit.length < 3 || withoutHabit.length < 3) continue;

          const avgWith    = withHabit.reduce((s, l) => s + l.mood, 0) / withHabit.length;
          const avgWithout = withoutHabit.reduce((s, l) => s + l.mood, 0) / withoutHabit.length;
          const delta = Math.round(Math.abs(avgWith - avgWithout) * 20);
          if (delta < 10) continue;

          corrs.push({
            habitName: habitMap.get(habit.id) ?? habit.id,
            direction: avgWith >= avgWithout ? "positive" : "negative",
            delta,
          });
        }
        setCorrelations(corrs.slice(0, 2));
      }
    }

    setLoaded(true);
    } catch { setLoaded(true); }
  }

  async function saveMood(value: number) {
    if (saving) return;
    setSelected(value);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("mood_logs").insert({ user_id: user.id, mood: value });
      setTodayMood(value);
    } finally { setSaving(false); }
  }

  if (!loaded) return (
    <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl px-4 py-4 mb-4 animate-pulse">
      <div className="h-4 w-32 bg-violet-900/30 rounded mb-3" />
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map((i) => <div key={i} className="flex-1 h-12 bg-violet-900/20 rounded-xl" />)}
      </div>
    </div>
  );

  const todayLabel = todayMood ? MOODS.find((m) => m.value === todayMood)?.label : null;

  return (
    <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl px-4 py-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">How are you feeling?</p>
          {todayLabel && (
            <p className="text-xs text-slate-500 mt-0.5">Today: <span className="text-violet-300">{todayLabel}</span></p>
          )}
        </div>
        {daysLogged > 0 && (
          <span className="text-[10px] text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">{daysLogged} days tracked</span>
        )}
      </div>

      {/* Emoji row */}
      <div className="flex items-center justify-between gap-1 mb-3">
        {MOODS.map(({ value, emoji, label }) => (
          <button
            key={value}
            onClick={() => { if (!todayMood) void saveMood(value); }}
            disabled={!!todayMood || saving}
            title={label}
            className={`flex-1 flex flex-col items-center gap-1 py-2 min-h-[44px] rounded-xl transition-all duration-200 ${
              selected === value
                ? "bg-violet-600/25 border border-violet-500/40 scale-110"
                : todayMood
                ? "opacity-30 cursor-default"
                : "hover:bg-violet-950/40 border border-transparent hover:border-violet-900/30 active:scale-95"
            }`}
          >
            <span className="text-2xl leading-none">{emoji}</span>
            <span className={`text-[9px] font-medium leading-none ${selected === value ? "text-violet-300" : "text-slate-600"}`}>{label}</span>
          </button>
        ))}
      </div>

      {todayMood && (
        <p className="text-[11px] text-slate-600 text-center">Mood logged for today ✓</p>
      )}

      {/* Correlations */}
      {correlations.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-violet-900/20 pt-3">
          <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-wider mb-2">AI Mood Insights</p>
          {correlations.map((c) => (
            <div key={c.habitName} className="flex items-center gap-2 text-xs">
              <span className="text-base leading-none">{c.direction === "positive" ? "😊" : "😔"}</span>
              <span className="text-slate-400 leading-snug">
                You{"'"}re <span className="font-semibold text-white">{c.delta}% {c.direction === "positive" ? "happier" : "lower mood"}</span> on days you do{" "}
                <span className="text-violet-300">{c.habitName}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {daysLogged > 0 && daysLogged < 14 && (
        <p className="text-[10px] text-slate-500 text-center mt-2">
          {14 - daysLogged} more days until AI mood insights unlock
        </p>
      )}
    </div>
  );
}
