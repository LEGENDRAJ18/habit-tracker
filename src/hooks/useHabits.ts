"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types";

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
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

    const [{ data: habitsData, error: hErr }, { data: logsData, error: lErr }] =
      await Promise.all([
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
      ]);

    if (hErr) setError(hErr.message);
    if (lErr) setError(lErr.message);
    setHabits(habitsData || []);
    setTodayLogs(logsData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addHabit = async (
    name: string,
    description: string,
    frequency: "daily" | "weekly"
  ): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name, description: description || null, frequency })
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
    refetch: fetchData,
  };
}
