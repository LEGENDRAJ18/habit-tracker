"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types";

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<Pick<HabitLog, "habit_id" | "completed_at">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient()).current;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86400000).toISOString().split("T")[0];

    const [
      { data: habitsData, error: hErr },
      { data: logsData,   error: lErr },
      { data: histData },
    ] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_at", today)
        .lt("completed_at", tomorrow),
      supabase
        .from("habit_logs")
        .select("habit_id, completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", thirtyOneDaysAgo)
        .order("completed_at", { ascending: false }),
    ]);

    if (hErr) setError(hErr.message);
    if (lErr) setError(lErr.message);
    setHabits(habitsData || []);
    setTodayLogs(logsData || []);
    setHistoricalLogs(histData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addHabit = async (
    name: string,
    description: string,
    frequency: "daily" | "weekly",
    stackAfterId?: string | null,
  ): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        frequency,
        stack_after_id: stackAfterId ?? null,
      })
      .select()
      .single();

    if (error) return { error: error.message };
    if (data) setHabits((prev) => [...prev, data]);
    return { error: null };
  };

  const toggleHabit = async (habitId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const existing = todayLogs.find((l) => l.habit_id === habitId);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
      setTodayLogs((prev) => prev.filter((l) => l.id !== existing.id));
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habitId, user_id: user.id })
        .select()
        .single();
      if (data) setTodayLogs((prev) => [...prev, data]);
    }
  };

  const deleteHabit = async (habitId: string) => {
    await supabase.from("habits").delete().eq("id", habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setTodayLogs((prev) => prev.filter((l) => l.habit_id !== habitId));
  };

  const isCompletedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId);

  const completedCount = habits.filter((h) => isCompletedToday(h.id)).length;

  // Build per-habit date sets once so getStreak stays O(1) per call
  const habitDateSets = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of historicalLogs) {
      const dateStr = log.completed_at.split("T")[0];
      const arr = map.get(log.habit_id) ?? [];
      if (!arr.includes(dateStr)) arr.push(dateStr);
      map.set(log.habit_id, arr);
    }
    // Sort each array newest-first
    map.forEach((arr) => arr.sort().reverse());
    return map;
  }, [historicalLogs]);

  const getStreak = useCallback((habitId: string): number => {
    const dates = habitDateSets.get(habitId) ?? [];
    if (dates.length === 0) return 0;

    const today     = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  }, [habitDateSets]);

  // Streak calculation that accounts for a single weekly freeze.
  // A fresh freeze bridges a 2-day gap at the active edge (last log = 2 days ago).
  // A previously applied freeze bridges the specific protected date mid-streak.
  const getStreakInfo = useCallback((
    habitId: string,
    isPaid: boolean,
    freezeAvailable: boolean,
    freezeProtectedDate: string | null
  ): { streak: number; freezeApplied: boolean; newFreezeUsed: boolean } => {
    const dates = habitDateSets.get(habitId) ?? [];
    if (dates.length === 0) return { streak: 0, freezeApplied: false, newFreezeUsed: false };

    const today      = new Date().toISOString().split("T")[0];
    const yesterday  = new Date(Date.now() -     86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

    let freezeApplied = false;
    let newFreezeUsed = false;

    const firstDate = dates[0];
    if (firstDate !== today && firstDate !== yesterday) {
      if (firstDate === twoDaysAgo) {
        if (isPaid && freezeAvailable) {
          // Fresh freeze bridges the missed yesterday
          freezeApplied = true;
          newFreezeUsed = true;
        } else if (freezeProtectedDate === yesterday) {
          // Previously applied freeze still bridges this specific gap
          freezeApplied = true;
        } else {
          return { streak: 0, freezeApplied: false, newFreezeUsed: false };
        }
      } else {
        return { streak: 0, freezeApplied: false, newFreezeUsed: false };
      }
    }

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {
        streak++;
      } else if (diffDays === 2) {
        // Missing date is curr + 1 day (dates are newest-first)
        const missingDate = new Date(curr.getTime() + 86400000).toISOString().split("T")[0];
        if (freezeProtectedDate === missingDate) {
          streak++;
          freezeApplied = true;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return { streak, freezeApplied, newFreezeUsed };
  }, [habitDateSets]);

  // Habit Strength 0-100: measures how automatic a habit is becoming.
  // Formula: base 10 + 2.5 per unique completion day (last 30) + 1.5 per streak day, capped at 100.
  // Missing days reduce the streak component but completions are never lost.
  const getHabitStrength = useCallback((habitId: string): number => {
    const dates = habitDateSets.get(habitId) ?? [];
    if (dates.length === 0) return 10;
    const streak = getStreak(habitId);
    return Math.min(100, Math.round(10 + dates.length * 2.5 + streak * 1.5));
  }, [habitDateSets, getStreak]);

  // True if a habit has recent historical logs (within 7 days) but the streak is currently 0.
  // Used to detect a freshly broken streak for free-user upsell.
  const hasBrokenStreak = useCallback((habitId: string): boolean => {
    const dates = habitDateSets.get(habitId) ?? [];
    if (dates.length === 0) return false;
    const today      = new Date().toISOString().split("T")[0];
    const yesterday  = new Date(Date.now() -     86400000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    return dates[0] !== today && dates[0] !== yesterday && dates[0] >= sevenDaysAgo;
  }, [habitDateSets]);

  return {
    habits,
    todayLogs,
    loading,
    error,
    completedCount,
    addHabit,
    toggleHabit,
    deleteHabit,
    isCompletedToday,
    getStreak,
    getStreakInfo,
    getHabitStrength,
    hasBrokenStreak,
    refetch: fetchData,
  };
}
