"use client";

import { useCallback, useMemo } from "react";
import type { Habit, HabitLog } from "@/types";

interface Params {
  habits: Habit[];
  todayLogs: HabitLog[];
  historicalLogs: Pick<HabitLog, "habit_id" | "completed_at">[];
}

// Pure derived/read layer — streaks, completion counts, and habit-strength
// lookups. No Supabase writes; everything here is computed from the habits/
// todayLogs/historicalLogs state owned by useHabitsCore.
export function useHabitStreaks({ habits, todayLogs, historicalLogs }: Params) {
  // A limit habit with a 'failed' log is NOT completed — only 'success' outcome counts.
  const isCompletedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId && (l.outcome ?? "success") === "success");

  const isFailedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId && l.outcome === "failed");

  // Habits actually due today — daily habits always qualify; weekly habits
  // only qualify on their saved day_of_week. Completion stats (and anything
  // that treats "all done today" as 100%) are computed against this, not the
  // full habits list, so a weekly habit not due today can't hold the count
  // below 100% or block the "everything done" celebration.
  const todaysHabits = habits.filter((h) => h.is_active !== false && (h.frequency !== "weekly" || h.day_of_week === new Date().getDay()));

  const completedCount = todaysHabits.filter((h) => isCompletedToday(h.id)).length;

  // "Genuine" completion — same as isCompletedToday but excludes skips.
  // isCompletedToday/completedCount intentionally still count a skip (it
  // resolves the habit for the day and shows the checkbox checked); this
  // stricter version is for anything that celebrates or rewards ACTUALLY
  // doing the habit — completion modals, milestones, XP-today displays —
  // which a skip must never satisfy.
  const isGenuinelyCompletedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId && (l.outcome ?? "success") === "success" && l.completion_quality !== "skipped");

  const genuineCompletedCount = todaysHabits.filter((h) => isGenuinelyCompletedToday(h.id)).length;

  // Build per-habit date sets once so getStreak stays O(1) per call
  const habitDateSets = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const log of historicalLogs) {
      const dateStr = log.completed_at.split("T")[0];
      const arr     = map.get(log.habit_id) ?? [];
      if (!arr.includes(dateStr)) arr.push(dateStr);
      map.set(log.habit_id, arr);
    }
    map.forEach((arr) => arr.sort().reverse());
    return map;
  }, [historicalLogs]);

  // For daily habits every calendar day is a valid occurrence, so "current"
  // is always today and the cycle length is 1 day — identical to the old
  // hard-coded logic. For weekly habits, "current" is the most recent date
  // matching the habit's day_of_week — which may BE today (if today is the
  // scheduled day and hasn't elapsed yet) or may already be in the past
  // (scheduled day already came and went this week).
  //
  // "previous" is the grace value that still counts as "streak not yet
  // broken": when today IS the scheduled day, that's last cycle's occurrence
  // (haven't done today's yet, but today isn't over) — same as "yesterday"
  // for daily. When today is NOT the scheduled day, `current` itself has
  // already fully elapsed, so there's no separate grace value — `previous`
  // collapses to `current`, meaning only an exact match keeps the streak
  // alive (matches "yesterday" being the true elapsed occurrence for daily).
  const getOccurrenceWindow = useCallback((habit: Pick<Habit, "frequency" | "day_of_week">) => {
    const now = new Date();
    if (habit.frequency !== "weekly") {
      const today     = now.toISOString().split("T")[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
      return { current: today, previous: yesterday, cycleDays: 1 };
    }
    const dow                = habit.day_of_week ?? now.getDay();
    const daysSinceScheduled = (now.getDay() - dow + 7) % 7;
    const currentDate = new Date(now.getTime() - daysSinceScheduled * 86400000);
    const current      = currentDate.toISOString().split("T")[0];
    const previous      = daysSinceScheduled === 0
      ? new Date(currentDate.getTime() - 7 * 86400000).toISOString().split("T")[0]
      : current;
    return { current, previous, cycleDays: 7 };
  }, []);

  const getStreak = useCallback(
    (habitId: string): number => {
      const dates = habitDateSets.get(habitId) ?? [];
      if (dates.length === 0) return 0;

      const habit = habits.find((h) => h.id === habitId);
      const { current, previous, cycleDays } = getOccurrenceWindow(habit ?? { frequency: "daily", day_of_week: null });

      if (dates[0] !== current && dates[0] !== previous) return 0;

      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev     = new Date(dates[i - 1]);
        const curr     = new Date(dates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === cycleDays) streak++;
        else break;
      }
      return streak;
    },
    [habitDateSets, habits, getOccurrenceWindow],
  );

  const getStreakInfo = useCallback(
    (
      habitId: string,
      isPaid: boolean,
      freezeAvailable: boolean,
      freezeProtectedDate: string | null,
    ): { streak: number; freezeApplied: boolean; newFreezeUsed: boolean } => {
      const dates = habitDateSets.get(habitId) ?? [];
      if (dates.length === 0) return { streak: 0, freezeApplied: false, newFreezeUsed: false };

      const habit = habits.find((h) => h.id === habitId);
      const { current, previous, cycleDays } = getOccurrenceWindow(habit ?? { frequency: "daily", day_of_week: null });

      // The occurrence that a freeze can cover (the last one to have fully
      // elapsed) is always `previous` — for daily/scheduled-today weekly
      // that's last cycle's date; otherwise `previous` already collapsed to
      // `current`, which IS the elapsed, missed occurrence. "twoAgo" is the
      // occurrence before that, whose presence in `dates` means exactly one
      // cycle was skipped and a freeze can bridge the gap.
      const missedOccurrence = previous;
      const twoAgo = new Date(new Date(missedOccurrence + "T00:00:00Z").getTime() - cycleDays * 86400000)
        .toISOString().split("T")[0];

      let freezeApplied = false;
      let newFreezeUsed = false;

      const firstDate = dates[0];
      if (firstDate !== current && firstDate !== previous) {
        if (firstDate === twoAgo) {
          if (isPaid && freezeAvailable) {
            freezeApplied = true;
            newFreezeUsed = true;
          } else if (freezeProtectedDate === missedOccurrence) {
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
        const prev     = new Date(dates[i - 1]);
        const curr     = new Date(dates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === cycleDays) {
          streak++;
        } else if (diffDays === 2 * cycleDays) {
          const missingDate = new Date(curr.getTime() + cycleDays * 86400000).toISOString().split("T")[0];
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
    },
    [habitDateSets, habits, getOccurrenceWindow],
  );

  // Returns the stored habit_strength from DB state (updated on toggle and synced on load)
  const getHabitStrength = useCallback(
    (habitId: string): number => habits.find((h) => h.id === habitId)?.habit_strength ?? 10,
    [habits],
  );

  const hasBrokenStreak = useCallback(
    (habitId: string): boolean => {
      const dates = habitDateSets.get(habitId) ?? [];
      if (dates.length === 0) return false;

      const habit = habits.find((h) => h.id === habitId);
      const { current, previous } = getOccurrenceWindow(habit ?? { frequency: "daily", day_of_week: null });
      // Notification freshness window — how recently the break must have
      // happened to still be worth surfacing. Kept as a flat 7-calendar-day
      // window for both cadences (not cycle-scaled) since this is a UX
      // staleness cutoff, not part of the streak-correctness math above.
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      return dates[0] !== current && dates[0] !== previous && dates[0] >= sevenDaysAgo;
    },
    [habitDateSets, habits, getOccurrenceWindow],
  );

  return {
    todaysHabits,
    completedCount,
    genuineCompletedCount,
    isCompletedToday,
    isFailedToday,
    getStreak,
    getStreakInfo,
    getHabitStrength,
    hasBrokenStreak,
  };
}
