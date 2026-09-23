"use client";

import type { Dispatch, SetStateAction } from "react";
import posthog from "posthog-js";
import type { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import type { Habit, HabitLog, CompletionQuality } from "@/types";
import { toast } from "@/components/ui/Toast";

type Supabase = ReturnType<typeof createClient>;

interface Params {
  habits: Habit[];
  todayLogs: HabitLog[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  setTodayLogs: Dispatch<SetStateAction<HabitLog[]>>;
  setHistoricalLogs: Dispatch<SetStateAction<Pick<HabitLog, "habit_id" | "completed_at">[]>>;
  supabase: Supabase;
  fetchData: (silent?: boolean) => Promise<void>;
}

// Verified/gated completion paths — the richer counter/duration/photo/
// reflection completion sheet, its undo, the tier-quota-gated "skip" action
// (server-mediated, unlike everything else here which writes to Supabase
// directly), and the unrelated "remind me later" action. Shares habits/
// todayLogs state with useHabitCompletion — completeHabitWithVerification's
// "already logged today" gate reads the SAME todayLogs that toggleHabit
// writes to, so this can't have its own independent state slice.
export function useHabitVerification({
  habits, todayLogs, setHabits, setTodayLogs, setHistoricalLogs, supabase, fetchData,
}: Params) {
  // Completes a habit through the verification bottom sheet — same shape as
  // toggleHabit's "complete" branch, but persists the richer verification
  // metadata (actual_value, reflection_text, photo_url, completion_quality,
  // timer_used) instead of a bare habit_logs row.
  const completeHabitWithVerification = async (
    habitId: string,
    opts: {
      actualValue?: number | null;
      verificationType?: string | null;
      reflectionText?: string | null;
      photoUrl?: string | null;
      completionQuality: CompletionQuality;
      timerUsed?: boolean;
    },
  ): Promise<{ error: string | null; log: HabitLog | null }> => {
    const habit = habits.find((h) => h.id === habitId);
    const currentStrength = habit?.habit_strength ?? 10;
    if (todayLogs.some((l) => l.habit_id === habitId)) return { error: null, log: null }; // already logged today

    // ── Optimistic complete — fires INSTANTLY before any await, same shape
    // as toggleHabit's complete branch (user_id is an empty placeholder
    // until auth resolves — only local state uses it before then) ──
    const now = new Date().toISOString();
    const tempId = `opt-${habitId}-${Date.now()}`;
    const newStrength = Math.min(100, currentStrength + 5);

    const tempLog: HabitLog = {
      id: tempId,
      habit_id: habitId,
      user_id: "",
      completed_at: now,
      notes: null,
      outcome: "success",
      actual_value: opts.actualValue ?? null,
      verification_type: (opts.verificationType as HabitLog["verification_type"]) ?? null,
      reflection_text: opts.reflectionText ?? null,
      photo_url: opts.photoUrl ?? null,
      completion_quality: opts.completionQuality,
      timer_used: opts.timerUsed ?? false,
    };

    setTodayLogs((prev) => [...prev, tempLog]);
    setHistoricalLogs((prev) => {
      const dateStr = now.split("T")[0];
      if (prev.some((l) => l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr)) return prev;
      return [{ habit_id: habitId, completed_at: now }, ...prev];
    });
    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, habit_strength: newStrength } : h)));

    const user = await resolveUser();
    if (!user) {
      // Revert
      setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
      setHistoricalLogs((prev) => {
        const dateStr = now.split("T")[0];
        return prev.filter((l) => !(l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr));
      });
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, habit_strength: currentStrength } : h)));
      return { error: "Not authenticated", log: null };
    }

    const { data, error } = await supabase
      .from("habit_logs")
      .insert({
        habit_id: habitId,
        user_id: user.id,
        completed_at: now,
        outcome: "success",
        actual_value: opts.actualValue ?? null,
        verification_type: opts.verificationType ?? null,
        reflection_text: opts.reflectionText ?? null,
        photo_url: opts.photoUrl ?? null,
        completion_quality: opts.completionQuality,
        timer_used: opts.timerUsed ?? false,
      })
      .select()
      .single();

    if (error || !data) {
      setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
      setHistoricalLogs((prev) => {
        const dateStr = now.split("T")[0];
        return prev.filter((l) => !(l.habit_id === habitId && l.completed_at.split("T")[0] === dateStr));
      });
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, habit_strength: currentStrength } : h)));
      return { error: error?.message ?? "Couldn't save completion", log: null };
    }

    setTodayLogs((prev) => prev.map((l) => (l.id === tempId ? data : l)));
    void supabase.from("habits").update({ habit_strength: newStrength }).eq("id", habitId);
    posthog.capture("habit_completed", { habit_name: habit?.name, frequency: habit?.frequency, verification_type: opts.verificationType, completion_quality: opts.completionQuality });

    return { error: null, log: data };
  };

  // Undoes a just-created verified completion by its exact log id (rather than
  // re-deriving "the current log for this habit" from todayLogs) — the 10s undo
  // toast is created synchronously right after completion, before HabitCard's
  // closures have re-rendered with the new state, so anything that re-looks-up
  // "today's log" via stale todayLogs would see it as not-yet-completed and
  // insert a second completion instead of deleting the first.
  const undoCompletion = async (habitId: string, logId: string): Promise<void> => {
    const removed = todayLogs.find((l) => l.id === logId) ?? null;
    setTodayLogs((prev) => prev.filter((l) => l.id !== logId));
    const { error } = await supabase.from("habit_logs").delete().eq("id", logId);
    if (error) {
      if (removed) setTodayLogs((prev) => [...prev, removed]);
      toast("Couldn't undo — try again", "error", undefined, 3000);
      return;
    }
    void fetchData(true); // resync habit_strength + historicalLogs cleanly
  };

  // "Later" long-press action — queues a 2-hour reminder, delivered via the
  // existing push_subscriptions pipeline's polling cron.
  const addLaterReminder = async (habitId: string, habitName: string): Promise<{ error: string | null }> => {
    const user = await resolveUser();
    if (!user) return { error: "Not authenticated" };
    const remindAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("later_reminders")
      .insert({ user_id: user.id, habit_id: habitId, habit_name: habitName, remind_at: remindAt });
    return { error: error?.message ?? null };
  };

  // "Skip" long-press action — consumes a weekly skip token and logs the day
  // as intentionally skipped (protects the streak, awards no XP).
  // Weekly quota: Free 1, Plus 3, Pro unlimited. Tier + quota are enforced
  // server-side (atomic, can't be raced) — see /api/habits/[id]/skip.
  const skipHabitToday = async (habitId: string): Promise<{ error: string | null }> => {
    if (todayLogs.some((l) => l.habit_id === habitId)) return { error: null };
    const user = await resolveUser();
    if (!user) return { error: "Not authenticated" };

    const now = new Date().toISOString();
    const tempId = `opt-skip-${habitId}-${Date.now()}`;
    const tempLog: HabitLog = {
      id: tempId, habit_id: habitId, user_id: user.id, completed_at: now,
      notes: null, outcome: "success", completion_quality: "skipped",
    };
    setTodayLogs((prev) => [...prev, tempLog]);

    const res = await fetch(`/api/habits/${habitId}/skip`, { method: "POST" });
    const body = await res.json().catch(() => ({})) as { error?: string | null; log?: HabitLog | null };

    if (!res.ok || body.error) {
      setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
      return { error: body.error ?? "Couldn't skip — try again" };
    }
    if (body.log) {
      setTodayLogs((prev) => prev.map((l) => (l.id === tempId ? (body.log as HabitLog) : l)));
    } else {
      // Server found an existing log for today — drop the optimistic temp entry.
      setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
    }
    return { error: null };
  };

  return { completeHabitWithVerification, undoCompletion, addLaterReminder, skipHabitToday };
}
