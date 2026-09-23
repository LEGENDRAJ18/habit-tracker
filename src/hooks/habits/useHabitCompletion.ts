"use client";

import type { Dispatch, SetStateAction } from "react";
import posthog from "posthog-js";
import type { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import type { Habit, HabitLog } from "@/types";
import { saveHabitsCache, enqueue } from "@/lib/habitsCache";

type Supabase = ReturnType<typeof createClient>;

interface Params {
  habits: Habit[];
  todayLogs: HabitLog[];
  historicalLogs: Pick<HabitLog, "habit_id" | "completed_at">[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  setTodayLogs: Dispatch<SetStateAction<HabitLog[]>>;
  setHistoricalLogs: Dispatch<SetStateAction<Pick<HabitLog, "habit_id" | "completed_at">[]>>;
  supabase: Supabase;
}

// Standard (unverified) completion logging — the plain checkbox toggle and
// the "limit" habit-type failure marker. Verified completions (counter/
// duration/photo/reflection) live in useHabitVerification instead, but both
// read/write the SAME todayLogs slice from useHabitsCore — completion state
// can't be split into separate per-module state without breaking the
// "already logged today" gate the verification path depends on.
export function useHabitCompletion({
  habits, todayLogs, historicalLogs, setHabits, setTodayLogs, setHistoricalLogs, supabase,
}: Params) {
  const toggleHabit = async (habitId: string): Promise<void> => {
    const offline         = typeof navigator !== "undefined" && !navigator.onLine;
    const habit           = habits.find((h) => h.id === habitId);
    const currentStrength = habit?.habit_strength ?? 10;
    const existing        = todayLogs.find((l) => l.habit_id === habitId);

    if (existing) {
      // ── Optimistic uncomplete — fires INSTANTLY before any await ──
      const newStrength = Math.max(5, currentStrength - 5);
      setTodayLogs((prev) => prev.filter((l) => l.id !== existing.id));
      setHistoricalLogs((prev) => {
        const dateStr = existing.completed_at.split("T")[0];
        return prev.filter(
          (l) => !(l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr),
        );
      });
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, habit_strength: newStrength } : h)),
      );

      const user = await resolveUser();
      if (!user) {
        // Revert — not authenticated
        setTodayLogs((prev) => [...prev, existing]);
        setHistoricalLogs((prev) => [
          { habit_id: existing.habit_id, completed_at: existing.completed_at },
          ...prev,
        ]);
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, habit_strength: currentStrength } : h)),
        );
        return;
      }

      if (offline) {
        enqueue({ type: "toggle_uncomplete", habitId, logId: existing.id });
        return;
      }

      const { error: delErr } = await supabase.from("habit_logs").delete().eq("id", existing.id);
      if (delErr) {
        setTodayLogs((prev) => [...prev, existing]);
        setHistoricalLogs((prev) => [
          { habit_id: existing.habit_id, completed_at: existing.completed_at },
          ...prev,
        ]);
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, habit_strength: currentStrength } : h)),
        );
        throw delErr;
      }
      void supabase.from("habits").update({ habit_strength: newStrength }).eq("id", habitId);
      saveHabitsCache(
        habits.map((h) => (h.id === habitId ? { ...h, habit_strength: newStrength } : h)),
        todayLogs.filter((l) => l.id !== existing.id),
        historicalLogs.filter(
          (l) => !(l.habit_id === habitId && l.completed_at.split("T")[0] === existing.completed_at.split("T")[0]),
        ),
      );

    } else {
      // ── Optimistic complete — fires INSTANTLY before any await ──
      const now    = new Date().toISOString();
      const tempId = `opt-${habitId}-${Date.now()}`;
      const newStrength = Math.min(100, currentStrength + 5);

      // user_id is empty placeholder until auth resolves — only local state uses it
      const tempLog: HabitLog = {
        id:           tempId,
        habit_id:     habitId,
        user_id:      "",
        completed_at: now,
        notes:        null,
      };

      setTodayLogs((prev) => [...prev, tempLog]);
      setHistoricalLogs((prev) => {
        const dateStr = now.split("T")[0];
        if (prev.some((l) => l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr))
          return prev;
        return [{ habit_id: habitId, completed_at: now }, ...prev];
      });
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, habit_strength: newStrength } : h)),
      );

      posthog.capture("habit_completed", {
        habit_name: habit?.name,
        frequency: habit?.frequency,
        verification_type: habit?.verification_type ?? "standard",
        completion_quality: "full",
      });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);

      const user = await resolveUser();
      if (!user) {
        // Revert
        setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
        setHistoricalLogs((prev) => {
          const dateStr = now.split("T")[0];
          return prev.filter(
            (l) => !(l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr),
          );
        });
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, habit_strength: currentStrength } : h)),
        );
        return;
      }

      if (offline) {
        enqueue({ type: "toggle_complete", habitId, userId: user.id, completed_at: now, tempLogId: tempId });
        return;
      }

      let logResult = await supabase
        .from("habit_logs")
        .insert({ habit_id: habitId, user_id: user.id, completed_at: now, outcome: "success" })
        .select()
        .single();

      // Refresh-and-retry on JWT expiry (token may have expired during idle)
      if (logResult.error && /jwt|expired|not authorized/i.test(logResult.error.message ?? "")) {
        console.log("[habit] JWT error on log insert, refreshing and retrying...");
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session) {
          console.log(`[habit] token refreshed, retrying log insert`);
          logResult = await supabase
            .from("habit_logs")
            .insert({ habit_id: habitId, user_id: refreshData.session.user.id, completed_at: now, outcome: "success" })
            .select()
            .single();
        }
      }

      const { data, error: insertErr } = logResult;

      if (insertErr || !data) {
        setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
        setHistoricalLogs((prev) => {
          const dateStr = now.split("T")[0];
          return prev.filter(
            (l) => !(l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr),
          );
        });
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, habit_strength: currentStrength } : h)),
        );
        throw insertErr ?? new Error("habit_log insert returned no data");
      }

      // Replace tempId with the real DB record. If fetchData ran concurrently
      // and wiped tempId from state, fall back to appending the real record so
      // the completion is never silently lost.
      setTodayLogs((prev) => {
        if (prev.some((l) => l.id === tempId)) {
          return prev.map((l) => (l.id === tempId ? data : l));
        }
        if (!prev.some((l) => l.id === data.id)) return [...prev, data];
        return prev;
      });
      setHistoricalLogs((prev) => {
        const dateStr = data.completed_at.split("T")[0];
        if (!prev.some((l) => l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr)) {
          return [{ habit_id: habitId, completed_at: data.completed_at }, ...prev];
        }
        return prev;
      });
      void supabase.from("habits").update({ habit_strength: newStrength }).eq("id", habitId);
      saveHabitsCache(
        habits.map((h) => (h.id === habitId ? { ...h, habit_strength: newStrength } : h)),
        [...todayLogs.filter((l) => l.id !== tempId), data],
        historicalLogs,
      );
    }
  };

  const markFailed = async (habitId: string): Promise<{ error: string | null }> => {
    // Idempotent — skip if already acted on today
    if (todayLogs.some((l) => l.habit_id === habitId)) return { error: null };

    const user = await resolveUser();
    if (!user) return { error: "Not authenticated" };

    const now    = new Date().toISOString();
    const tempId = `opt-fail-${habitId}-${Date.now()}`;
    const tempLog: HabitLog = {
      id:           tempId,
      habit_id:     habitId,
      user_id:      user.id,
      completed_at: now,
      notes:        null,
      outcome:      "failed",
    };
    setTodayLogs((prev) => [...prev, tempLog]);

    const { error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: habitId, user_id: user.id, outcome: "failed" });

    if (error) {
      setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
      return { error: error.message };
    }
    return { error: null };
  };

  return { toggleHabit, markFailed };
}
