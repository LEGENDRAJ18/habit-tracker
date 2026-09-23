"use client";

// Thin composition barrel over src/hooks/habits/* — state lives in
// useHabitsCore and is threaded into the other four hooks as arguments so
// completion/verification/streak logic all read and write the SAME
// habits/todayLogs/historicalLogs slices (several mutations touch more than
// one of those atomically, and completeHabitWithVerification's "already
// logged today" gate reads state that toggleHabit writes). The return shape
// below is unchanged from before the split, so existing consumers
// (dashboard/page.tsx, goal-program/page.tsx) need no changes.
import { useHabitsCore } from "@/hooks/habits/useHabitsCore";
import { useHabitCrud } from "@/hooks/habits/useHabitCrud";
import { useHabitCompletion } from "@/hooks/habits/useHabitCompletion";
import { useHabitVerification } from "@/hooks/habits/useHabitVerification";
import { useHabitStreaks } from "@/hooks/habits/useHabitStreaks";

export function useHabits() {
  const core = useHabitsCore();

  const crud = useHabitCrud({
    habits: core.habits,
    setHabits: core.setHabits,
    setTodayLogs: core.setTodayLogs,
    setHistoricalLogs: core.setHistoricalLogs,
    supabase: core.supabase,
  });

  const completion = useHabitCompletion({
    habits: core.habits,
    todayLogs: core.todayLogs,
    historicalLogs: core.historicalLogs,
    setHabits: core.setHabits,
    setTodayLogs: core.setTodayLogs,
    setHistoricalLogs: core.setHistoricalLogs,
    supabase: core.supabase,
  });

  const verification = useHabitVerification({
    habits: core.habits,
    todayLogs: core.todayLogs,
    setHabits: core.setHabits,
    setTodayLogs: core.setTodayLogs,
    setHistoricalLogs: core.setHistoricalLogs,
    supabase: core.supabase,
    fetchData: core.fetchData,
  });

  const streaks = useHabitStreaks({
    habits: core.habits,
    todayLogs: core.todayLogs,
    historicalLogs: core.historicalLogs,
  });

  return {
    habits: core.habits,
    todaysHabits: streaks.todaysHabits,
    todayLogs: core.todayLogs,
    historicalLogs: core.historicalLogs,
    loading: core.loading,
    isSyncing: core.isSyncing,
    error: core.error,
    completedCount: streaks.completedCount,
    genuineCompletedCount: streaks.genuineCompletedCount,
    addHabit: crud.addHabit,
    renameHabit: crud.renameHabit,
    toggleHabit: completion.toggleHabit,
    completeHabitWithVerification: verification.completeHabitWithVerification,
    undoCompletion: verification.undoCompletion,
    addLaterReminder: verification.addLaterReminder,
    skipHabitToday: verification.skipHabitToday,
    deleteHabit: crud.deleteHabit,
    removeHabitOptimistic: crud.removeHabitOptimistic,
    restoreHabit: crud.restoreHabit,
    commitDeleteHabit: crud.commitDeleteHabit,
    isCompletedToday: streaks.isCompletedToday,
    isFailedToday: streaks.isFailedToday,
    markFailed: completion.markFailed,
    getStreak: streaks.getStreak,
    getStreakInfo: streaks.getStreakInfo,
    getHabitStrength: streaks.getHabitStrength,
    hasBrokenStreak: streaks.hasBrokenStreak,
    refetch: core.fetchData,
  };
}
