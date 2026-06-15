"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/types";

// ─── Exported types ───────────────────────────────────────────────────────────

export interface StreakRow {
  habitId: string;
  name: string;
  current: number;
  best: number;
  last30Rate: number; // 0-1
}

export interface HeatmapDay {
  date: string;      // YYYY-MM-DD
  label: string;     // "Mon", "Tue" …
  completed: number; // unique habits logged
  total: number;     // total habits
}

export interface AnalyticsData {
  loading: boolean;
  habits: Habit[];
  weeklyRate: number;   // 0-100
  heatmapDays: HeatmapDay[];
  streakRows: StreakRow[];
  totalCompletions: number;
  mostConsistent: { name: string; rate: number } | null;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function datesDesc(logs: { habit_id: string; completed_at: string }[], habitId: string): string[] {
  const set = new Set<string>();
  for (const l of logs) {
    if (l.habit_id === habitId) set.add(l.completed_at.split("T")[0]);
  }
  return [...set].sort().reverse();
}

function currentStreak(desc: string[]): number {
  if (!desc.length) return 0;
  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (desc[0] !== today && desc[0] !== yesterday) return 0;
  let s = 1;
  for (let i = 1; i < desc.length; i++) {
    const diff = Math.round(
      (new Date(desc[i - 1]).getTime() - new Date(desc[i]).getTime()) / 86400000
    );
    if (diff === 1) s++;
    else break;
  }
  return s;
}

function bestStreak(desc: string[]): number {
  if (!desc.length) return 0;
  const asc  = [...desc].reverse();
  let best = 1, cur = 1;
  for (let i = 1; i < asc.length; i++) {
    const diff = Math.round(
      (new Date(asc[i]).getTime() - new Date(asc[i - 1]).getTime()) / 86400000
    );
    if (diff === 1) { cur++; if (cur > best) best = cur; }
    else cur = 1;
  }
  return best;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY: AnalyticsData = {
  loading: true, habits: [], weeklyRate: 0,
  heatmapDays: [], streakRows: [], totalCompletions: 0, mostConsistent: null,
};

export function useAnalytics(): AnalyticsData {
  const [supabase] = useState(() => createClient());
  const [data, setData] = useState<AnalyticsData>(EMPTY);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setData({ ...EMPTY, loading: false }); return; }

      const yearAgo   = new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0];
      const thirtyAgo = new Date(Date.now() - 30  * 86400000).toISOString().split("T")[0];

      const [
        { data: habitsRaw },
        { data: logsRaw },
        { count: total },
      ] = await Promise.all([
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("habit_logs")
          .select("habit_id, completed_at")
          .eq("user_id", user.id)
          .gte("completed_at", yearAgo)
          .order("completed_at", { ascending: false }),
        supabase
          .from("habit_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const habits: Habit[] = habitsRaw ?? [];
      const logs = logsRaw ?? [];

      // ── Streak rows ─────────────────────────────────────────────────────────
      const streakRows: StreakRow[] = habits.map((h) => {
        const desc   = datesDesc(logs, h.id);
        const last30 = desc.filter((d) => d >= thirtyAgo);
        return {
          habitId:     h.id,
          name:        h.name,
          current:     currentStreak(desc),
          best:        bestStreak(desc),
          last30Rate:  last30.length / 30,
        };
      });

      // ── Most consistent ──────────────────────────────────────────────────────
      const topRow = streakRows.length
        ? streakRows.reduce((a, b) => (a.last30Rate > b.last30Rate ? a : b))
        : null;
      const mostConsistent = topRow
        ? { name: topRow.name, rate: Math.round(topRow.last30Rate * 100) }
        : null;

      // ── 7-day heatmap ────────────────────────────────────────────────────────
      const heatmapDays: HeatmapDay[] = Array.from({ length: 7 }, (_, i) => {
        const d       = new Date(Date.now() - (6 - i) * 86400000);
        const dateStr = d.toISOString().split("T")[0];
        const label   = d.toLocaleDateString("en-US", { weekday: "narrow" });
        const done    = new Set(
          logs.filter((l) => l.completed_at.split("T")[0] === dateStr).map((l) => l.habit_id)
        ).size;
        return { date: dateStr, label, completed: done, total: habits.length };
      });

      // ── Weekly completion rate ───────────────────────────────────────────────
      const possible   = habits.length * 7;
      const done       = heatmapDays.reduce((s, d) => s + d.completed, 0);
      const weeklyRate = possible > 0 ? Math.round((done / possible) * 100) : 0;

      setData({
        loading: false, habits, weeklyRate,
        heatmapDays, streakRows,
        totalCompletions: total ?? 0,
        mostConsistent,
      });
    })();
  }, [supabase]);

  return data;
}
