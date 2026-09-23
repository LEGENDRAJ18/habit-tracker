"use client";

import type { Dispatch, SetStateAction } from "react";
import posthog from "posthog-js";
import type { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import type { Habit, HabitLog } from "@/types";
import { enqueue, type AddHabitPayload } from "@/lib/habitsCache";
import { detectVerificationType, detectDefaultTargetValue } from "@/lib/habitVerification";

type Supabase = ReturnType<typeof createClient>;

interface Params {
  habits: Habit[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  setTodayLogs: Dispatch<SetStateAction<HabitLog[]>>;
  setHistoricalLogs: Dispatch<SetStateAction<Pick<HabitLog, "habit_id" | "completed_at">[]>>;
  supabase: Supabase;
}

// Habit-level CRUD — creating, renaming, and deleting habits (as opposed to
// logging completions against them, which lives in useHabitCompletion /
// useHabitVerification). Reads/writes the shared state passed in from
// useHabitsCore rather than declaring its own, so these mutations stay in
// sync with completion state that lives in the same habits/todayLogs slices.
export function useHabitCrud({ habits, setHabits, setTodayLogs, setHistoricalLogs, supabase }: Params) {
  const addHabit = async (
    name: string,
    description: string,
    frequency: "daily" | "weekly",
    stackAfterId?: string | null,
    whenTime?: string | null,
    whereLocation?: string | null,
    howLong?: string | null,
    validityScore?: "valid" | "partial" | "invalid",
    reminderTime?: string | null,
    durationMinutes?: number | null,
    xpValue?: number | null,
    difficulty?: number | null,
    habitType?: "standard" | "limit",
    dayOfWeek?: number | null,
  ): Promise<{ error: string | null }> => {
    // resolveUser() checks token expiry at every layer and refreshes via
    // getUser()/refreshSession() if expired, so the token is guaranteed fresh
    // by the time we reach the insert below.
    const t0 = performance.now();
    const user = await resolveUser();
    console.log(`[habit] auth resolve ${Math.round(performance.now() - t0)}ms, user ${user?.id ?? "null"}`);
    if (!user) return { error: "Not authenticated" };
    console.log(`[habit] creating habit "${name}" for ${user.id}`);

    const offline = typeof navigator !== "undefined" && !navigator.onLine;

    // Auto-detect verification type from the habit name (keyword-based; see spec).
    const verificationType = detectVerificationType(name);
    const targetValue = verificationType === "counter" ? detectDefaultTargetValue(name) : null;

    // Optimistic: add to state immediately so the card appears at once
    const tempId = `opt-${Date.now()}`;
    const now    = new Date().toISOString();
    const tempHabit: Habit = {
      id:                      tempId,
      user_id:                 user.id,
      name,
      description:             description || null,
      frequency,
      day_of_week:             frequency === "weekly" ? dayOfWeek ?? null : null,
      created_at:              now,
      stack_after_id:          stackAfterId    ?? null,
      habit_strength:          10,
      when_time:               whenTime        ?? null,
      where_location:          whereLocation   ?? null,
      how_long:                howLong         ?? null,
      validity_score:          validityScore   ?? "valid",
      preferred_reminder_time: reminderTime    ?? null,
      duration_minutes:        durationMinutes ?? null,
      xp_value:                xpValue         ?? 10,
      difficulty:              difficulty      ?? 1,
      is_public:               false,
      commitment_text:         null,
      habit_type:              habitType       ?? "standard",
      verification_type:       verificationType,
      target_value:            targetValue,
    };
    setHabits((prev) => [...prev, tempHabit]);

    if (offline) {
      const payload: AddHabitPayload = {
        user_id:                 user.id,
        name,
        description:             description || null,
        frequency,
        day_of_week:             frequency === "weekly" ? dayOfWeek ?? null : null,
        stack_after_id:          stackAfterId    ?? null,
        when_time:               whenTime        ?? null,
        where_location:          whereLocation   ?? null,
        how_long:                howLong         ?? null,
        validity_score:          validityScore   ?? "valid",
        preferred_reminder_time: reminderTime    ?? null,
        duration_minutes:        durationMinutes ?? null,
        xp_value:                xpValue         ?? 10,
        difficulty:              difficulty      ?? 1,
        verification_type:       verificationType,
        target_value:            targetValue,
      };
      enqueue({ type: "add_habit", tempId, payload });
      posthog.capture("habit_created", { habit_name: name, frequency, validity_score: validityScore ?? "valid" });
      return { error: null };
    }

    type InsertError = { message: string; code?: string; details?: string; hint?: string };
    type InsertResult = { data: Habit | null; error: InsertError | null };
    const insertPayload = {
      user_id:                 user.id,
      name,
      description:             description || null,
      frequency,
      day_of_week:             frequency === "weekly" ? dayOfWeek ?? null : null,
      stack_after_id:          stackAfterId    ?? null,
      when_time:               whenTime        ?? null,
      where_location:          whereLocation   ?? null,
      how_long:                howLong         ?? null,
      validity_score:          validityScore   ?? "valid",
      preferred_reminder_time: reminderTime    ?? null,
      duration_minutes:        durationMinutes ?? null,
      xp_value:                xpValue         ?? 10,
      difficulty:              difficulty      ?? 1,
      habit_type:              habitType       ?? "standard",
      verification_type:       verificationType,
      target_value:            targetValue,
    };

    console.log("[habit:insert] payload", JSON.stringify(insertPayload));

    const doInsert = (): Promise<InsertResult> => {
      let timerId: ReturnType<typeof setTimeout> | undefined;
      const insertPromise = (async (): Promise<InsertResult> => {
        const r = await supabase.from("habits").insert(insertPayload).select().single();
        clearTimeout(timerId); // cancel timeout — insert returned, don't show false error
        const err = r.error as InsertError | null;
        if (err) {
          console.error("[habit:insert] error", {
            message: err.message,
            code:    err.code,
            details: err.details,
            hint:    err.hint,
          });
        } else {
          console.log("[habit:insert] success, id:", (r.data as Habit | null)?.id);
        }
        return r as unknown as InsertResult;
      })();
      const timeoutPromise = new Promise<InsertResult>((resolve) => {
        timerId = setTimeout(() => {
          console.error("[habit:insert] TIMED OUT after 15s — insert never returned, user_id:", user.id);
          resolve({ data: null, error: { message: "Couldn't add — try again" } });
        }, 15_000);
      });
      return Promise.race<InsertResult>([insertPromise, timeoutPromise]);
    };

    let { data, error } = await doInsert();

    // Refresh-and-retry: covers the race where the token expires between
    // resolveUser() returning and the insert reaching the Supabase server.
    if (error && /jwt|expired|not authorized/i.test(error.message ?? "")) {
      console.log("[habit] JWT error on insert, refreshing token and retrying...");
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session) {
        console.log(`[habit] token refreshed (new expiry: ${new Date((refreshData.session.expires_at ?? 0) * 1_000).toISOString()}), retrying insert`);
        ({ data, error } = await doInsert());
      }
    }

    if (error) {
      // Revert the optimistic add
      setHabits((prev) => prev.filter((h) => h.id !== tempId));
      return { error: error.message };
    }
    if (data) {
      // Swap temp placeholder with real DB record. If fetchData wiped tempId
      // concurrently, append the real record so the habit isn't silently lost.
      setHabits((prev) => {
        if (prev.some((h) => h.id === tempId)) return prev.map((h) => (h.id === tempId ? data : h));
        if (!prev.some((h) => h.id === data.id)) return [...prev, data];
        return prev;
      });
      posthog.capture("habit_created", {
        habit_name:     name,
        frequency,
        validity_score: validityScore ?? "valid",
      });
    }
    return { error: null };
  };

  const renameHabit = async (
    habitId: string,
    newName: string,
    validityScore: "valid" | "partial" | "invalid",
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from("habits")
      .update({ name: newName, validity_score: validityScore })
      .eq("id", habitId);
    if (error) return { error: error.message };
    setHabits((prev) =>
      prev.map((h) => h.id === habitId ? { ...h, name: newName, validity_score: validityScore } : h),
    );
    return { error: null };
  };

  const deleteHabit = async (habitId: string) => {
    await supabase.from("habits").delete().eq("id", habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setTodayLogs((prev) => prev.filter((l) => l.habit_id !== habitId));
    setHistoricalLogs((prev) => prev.filter((l) => l.habit_id !== habitId));
  };

  // Optimistic delete: removes from state immediately, returns the removed habit.
  // Caller must call commitDeleteHabit(id) after the undo window expires,
  // or call restoreHabit(habit) to undo.
  const removeHabitOptimistic = (habitId: string) => {
    const removed = habits.find((h) => h.id === habitId) ?? null;
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setTodayLogs((prev) => prev.filter((l) => l.habit_id !== habitId));
    return removed;
  };

  const restoreHabit = (habit: (typeof habits)[number]) => {
    setHabits((prev) => {
      const exists = prev.some((h) => h.id === habit.id);
      return exists ? prev : [...prev, habit].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  };

  const commitDeleteHabit = async (habitId: string) => {
    await supabase.from("habits").delete().eq("id", habitId);
    setHistoricalLogs((prev) => prev.filter((l) => l.habit_id !== habitId));
  };

  return { addHabit, renameHabit, deleteHabit, removeHabitOptimistic, restoreHabit, commitDeleteHabit };
}
