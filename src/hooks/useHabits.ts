"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import type { Habit, HabitLog, CompletionQuality, Plan } from "@/types";
import {
  saveHabitsCache, loadHabitsCache,
  loadQueue, clearQueue, enqueue, type OfflineOp, type AddHabitPayload,
} from "@/lib/habitsCache";
import { detectVerificationType, detectDefaultTargetValue } from "@/lib/habitVerification";

// Computes habit strength from historical logs using the canonical formula:
// base 10 + 5 per completion − 3 per missed day (min 5, max 100).
// Missed days are counted from the day AFTER creation (not the creation day itself).
function computeStrengthFromLogs(
  habitCreatedAt: string,
  logDates: string[], // unique completion date strings YYYY-MM-DD, any order
): number {
  const today             = new Date().toISOString().split("T")[0];
  const thirtyOneDaysAgo  = new Date(Date.now() - 31 * 86400000).toISOString().split("T")[0];
  const createdDay        = habitCreatedAt.split("T")[0];

  // First day we'd count a miss: the day after the habit was created
  const dayAfterCreation = new Date(new Date(createdDay).getTime() + 86400000)
    .toISOString().split("T")[0];
  const missStart = dayAfterCreation > thirtyOneDaysAgo ? dayAfterCreation : thirtyOneDaysAgo;

  // Total completions within the 31-day window
  const completions = logDates.filter((d) => d >= thirtyOneDaysAgo).length;

  // Days between missStart and today (exclusive) — the window in which we count misses
  const daysInMissWindow = Math.max(
    0,
    Math.round((new Date(today).getTime() - new Date(missStart).getTime()) / 86400000),
  );

  const pastCompletions = logDates.filter((d) => d >= missStart && d < today).length;
  const missed          = Math.max(0, daysInMissWindow - pastCompletions);

  return Math.max(5, Math.min(100, 10 + completions * 5 - missed * 3));
}

// Unique seq counter prevents "cannot add callbacks after subscribe" errors
// when the component remounts before async removeChannel() completes.
let _habitsRTSeq = 0;

export function useHabits() {
  // ── Seed state from localStorage cache for instant display ──
  const [habits, setHabits]                 = useState<Habit[]>(() => loadHabitsCache()?.habits ?? []);
  const [todayLogs, setTodayLogs]           = useState<HabitLog[]>(() => loadHabitsCache()?.todayLogs ?? []);
  const [historicalLogs, setHistoricalLogs] = useState<Pick<HabitLog, "habit_id" | "completed_at">[]>(() => loadHabitsCache()?.historicalLogs ?? []);
  const [loading, setLoading]               = useState(() => !loadHabitsCache()); // skip spinner if cache hit
  // isSyncing: true while a background network fetch is in progress (cache was stale or outdated)
  const [isSyncing, setIsSyncing]           = useState(() => loadHabitsCache()?.stale ?? false);
  const [error, setError]                   = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  const fetchData = useCallback(async (silent = false) => {
    // Only show the skeleton when there is truly no data to display.
    // If cache already seeded habits into state, keep them visible while
    // the refresh runs in the background (no flicker, no stuck skeleton).
    if (!silent && !loadHabitsCache()) setLoading(true);
    setIsSyncing(true);

    // resolveUser() tries getSession() first (instant), falls back to
    // getUser() which also refreshes the token if expired. This means
    // fetchData() doubles as a session-recovery point on tab refocus.
    const t0 = performance.now();
    const user = await resolveUser();
    console.log("[LOAD] resolveUser", Math.round(performance.now() - t0), "ms");

    if (!user) {
      if (!silent) {
        if (!loadHabitsCache()) {
          setError("Couldn't load — check your connection");
          setTimeout(() => void fetchData(true), 3_000);
        }
        setLoading(false);
      }
      setIsSyncing(false);
      return;
    }

    // Use local midnight as the boundary so the "today" window matches the
    // user's clock regardless of timezone (UTC-based dates diverge for
    // users in UTC+8 after local midnight, or UTC-5 before UTC midnight).
    const localMidnight = new Date(); localMidnight.setHours(0, 0, 0, 0);
    const localTomorrow  = new Date(localMidnight.getTime() + 86400000);
    const today            = localMidnight.toISOString();
    const tomorrow         = localTomorrow.toISOString();
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86400000).toISOString().split("T")[0];
    const ninetyDaysAgo    = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

    // If offline, skip the network entirely — cache is already in state.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!silent) setLoading(false);
      setIsSyncing(false);
      return;
    }

    // Hard 2.5-second timeout: if Supabase is slow/down, stop the spinner and
    // keep whatever is already in state (from the localStorage cache).
    const TIMEOUT_MS = 2500;
    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), TIMEOUT_MS)
    );

    const fetchAll = Promise.all([
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
        .neq("outcome", "failed")
        .gte("completed_at", ninetyDaysAgo)
        .order("completed_at", { ascending: false }),
    ]);

    const t1 = performance.now();
    const result = await Promise.race([fetchAll, timeout]);

    if (result === "timeout") {
      console.log("[LOAD] habits TIMEOUT (>2500ms)");
      setLoading(false);
      setIsSyncing(false);
      return;
    }
    console.log("[LOAD] habits+logs+history", Math.round(performance.now() - t1), "ms");

    const [
      { data: habitsData, error: hErr },
      { data: logsData,   error: lErr },
      { data: histData },
    ] = result;

    if (hErr) setError(hErr.message);
    if (lErr) setError(lErr.message);

    const loadedHabits = habitsData || [];
    const loadedHist   = histData   || [];

    // Sync habit_strength in DB: apply missed-day penalties accumulated while user was away
    if (loadedHabits.length > 0) {
      // Build per-habit date sets from 31-day logs (strength uses 31-day window)
      const recentHist = loadedHist.filter((l) => l.completed_at.split("T")[0] >= thirtyOneDaysAgo);
      const dateMap = new Map<string, string[]>();
      for (const log of recentHist) {
        const d   = log.completed_at.split("T")[0];
        const arr = dateMap.get(log.habit_id) ?? [];
        if (!arr.includes(d)) arr.push(d);
        dateMap.set(log.habit_id, arr);
      }

      const strengthUpdates: { id: string; strength: number }[] = [];
      for (const habit of loadedHabits) {
        const computed = computeStrengthFromLogs(habit.created_at, dateMap.get(habit.id) ?? []);
        if (computed !== habit.habit_strength) {
          strengthUpdates.push({ id: habit.id, strength: computed });
        }
      }

      if (strengthUpdates.length > 0) {
        await Promise.all(
          strengthUpdates.map(({ id, strength }) =>
            supabase.from("habits").update({ habit_strength: strength }).eq("id", id),
          ),
        );
        for (const upd of strengthUpdates) {
          const idx = loadedHabits.findIndex((h) => h.id === upd.id);
          if (idx !== -1) loadedHabits[idx] = { ...loadedHabits[idx], habit_strength: upd.strength };
        }
      }
    }

    setHabits(loadedHabits);
    setTodayLogs(logsData || []);
    setHistoricalLogs(loadedHist);
    if (!silent) setLoading(false);
    setIsSyncing(false);

    // Persist to cache for instant load next visit
    saveHabitsCache(loadedHabits, logsData || [], loadedHist);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Refresh session + data when the user returns to this tab (fixes post-tab-switch timeouts).
  // getSession() on a new request will auto-refresh an expired token, so calling fetchData(true)
  // here primes the session before the user has a chance to submit any mutation.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchData(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchData]);

  // Flush offline queue when network returns ────────────────────────────────
  useEffect(() => {
    const flushQueue = async () => {
      const queue = loadQueue();
      if (queue.length === 0) return;
      clearQueue();

      const user = await resolveUser();
      if (!user) return;

      for (const op of queue as OfflineOp[]) {
        try {
          if (op.type === "toggle_complete") {
            await supabase
              .from("habit_logs")
              .insert({ habit_id: op.habitId, user_id: op.userId })
              .select()
              .single();
          } else if (op.type === "toggle_uncomplete") {
            await supabase.from("habit_logs").delete().eq("id", op.logId);
          } else if (op.type === "delete_habit") {
            await supabase.from("habits").delete().eq("id", op.habitId);
          } else if (op.type === "add_habit") {
            await supabase.from("habits").insert(op.payload).select().single();
          }
        } catch {
          // If an op fails after reconnect, skip it — state already reflects the intent
        }
      }

      // Re-fetch to reconcile server state with what we applied offline
      void fetchData(true);
    };

    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [supabase, fetchData]);

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

    const user = await resolveUser();
    if (!user) return { error: "Not authenticated", log: null };

    const now = new Date().toISOString();
    const tempId = `opt-${habitId}-${Date.now()}`;
    const newStrength = Math.min(100, currentStrength + 5);

    const tempLog: HabitLog = {
      id: tempId,
      habit_id: habitId,
      user_id: user.id,
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
    setTodayLogs((prev) => prev.filter((l) => l.id !== logId));
    await supabase.from("habit_logs").delete().eq("id", logId);
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
  // Weekly quota: Free 1, Plus 3, Pro unlimited.
  const SKIP_QUOTA: Record<Plan, number> = { free: 1, plus: 3, pro: Infinity };

  const skipHabitToday = async (habitId: string, tier: Plan): Promise<{ error: string | null }> => {
    if (todayLogs.some((l) => l.habit_id === habitId)) return { error: null };
    const user = await resolveUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("skip_tokens_used, skip_week_start")
      .eq("id", user.id)
      .single();

    // Week starts Monday, local time
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).toISOString().split("T")[0];

    const used = profile?.skip_week_start === monday ? (profile?.skip_tokens_used ?? 0) : 0;
    if (used >= SKIP_QUOTA[tier]) {
      return { error: `You've used all your skips for this week (${SKIP_QUOTA[tier]}/week).` };
    }

    const now = new Date().toISOString();
    const tempId = `opt-skip-${habitId}-${Date.now()}`;
    const tempLog: HabitLog = {
      id: tempId, habit_id: habitId, user_id: user.id, completed_at: now,
      notes: null, outcome: "success", completion_quality: "skipped",
    };
    setTodayLogs((prev) => [...prev, tempLog]);

    const [{ data, error }] = await Promise.all([
      supabase.from("habit_logs")
        .insert({ habit_id: habitId, user_id: user.id, completed_at: now, outcome: "success", completion_quality: "skipped" })
        .select().single(),
      supabase.from("profiles").update({ skip_tokens_used: used + 1, skip_week_start: monday }).eq("id", user.id),
    ]);

    if (error || !data) {
      setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
      return { error: error?.message ?? "Couldn't skip — try again" };
    }
    setTodayLogs((prev) => prev.map((l) => (l.id === tempId ? data : l)));
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

  // A limit habit with a 'failed' log is NOT completed — only 'success' outcome counts.
  const isCompletedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId && (l.outcome ?? "success") === "success");

  const isFailedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId && l.outcome === "failed");

  const completedCount = habits.filter((h) => isCompletedToday(h.id)).length;

  const markFailed = async (habitId: string): Promise<void> => {
    // Idempotent — skip if already acted on today
    if (todayLogs.some((l) => l.habit_id === habitId)) return;

    const user = await resolveUser();
    if (!user) return;

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

    if (error) setTodayLogs((prev) => prev.filter((l) => l.id !== tempId));
  };

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

  const getStreak = useCallback(
    (habitId: string): number => {
      const dates     = habitDateSets.get(habitId) ?? [];
      if (dates.length === 0) return 0;

      const today     = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (dates[0] !== today && dates[0] !== yesterday) return 0;

      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev     = new Date(dates[i - 1]);
        const curr     = new Date(dates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) streak++;
        else break;
      }
      return streak;
    },
    [habitDateSets],
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

      const today      = new Date().toISOString().split("T")[0];
      const yesterday  = new Date(Date.now() -     86400000).toISOString().split("T")[0];
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

      let freezeApplied = false;
      let newFreezeUsed = false;

      const firstDate = dates[0];
      if (firstDate !== today && firstDate !== yesterday) {
        if (firstDate === twoDaysAgo) {
          if (isPaid && freezeAvailable) {
            freezeApplied = true;
            newFreezeUsed = true;
          } else if (freezeProtectedDate === yesterday) {
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
        if (diffDays === 1) {
          streak++;
        } else if (diffDays === 2) {
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
    },
    [habitDateSets],
  );

  // Returns the stored habit_strength from DB state (updated on toggle and synced on load)
  const getHabitStrength = useCallback(
    (habitId: string): number => habits.find((h) => h.id === habitId)?.habit_strength ?? 10,
    [habits],
  );

  const hasBrokenStreak = useCallback(
    (habitId: string): boolean => {
      const dates       = habitDateSets.get(habitId) ?? [];
      if (dates.length === 0) return false;
      const today       = new Date().toISOString().split("T")[0];
      const yesterday   = new Date(Date.now() -     86400000).toISOString().split("T")[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      return dates[0] !== today && dates[0] !== yesterday && dates[0] >= sevenDaysAgo;
    },
    [habitDateSets],
  );

  // Real-time subscriptions for cross-tab sync
  useEffect(() => {
    let habitsChannel: ReturnType<typeof supabase.channel> | null = null;
    let logsChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // Debounce realtime callbacks: wait 1 s before re-fetching so the DB write
    // from the same tab is visible before we overwrite optimistic state.
    let rtDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (cancelled) return;
      if (rtDebounceTimer) clearTimeout(rtDebounceTimer);
      rtDebounceTimer = setTimeout(() => { if (!cancelled) void fetchData(true); }, 1000);
    };

    (async () => {
      const user = await resolveUser();
      if (!user || cancelled) return;

      const seq = ++_habitsRTSeq;

      // Unique names prevent "cannot add callbacks after subscribe" errors if
      // the component re-mounts before the previous async removeChannel() finishes.
      try {
        habitsChannel = supabase
          .channel(`habits-rt-${user.id}-${seq}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${user.id}` }, scheduleRefetch)
          .subscribe();
      } catch (err) {
        console.warn("[useHabits] habits realtime skipped:", err);
      }

      try {
        logsChannel = supabase
          .channel(`logs-rt-${user.id}-${seq}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "habit_logs", filter: `user_id=eq.${user.id}` }, scheduleRefetch)
          .subscribe();
      } catch (err) {
        console.warn("[useHabits] logs realtime skipped:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (rtDebounceTimer) clearTimeout(rtDebounceTimer);
      if (habitsChannel) { try { supabase.removeChannel(habitsChannel).catch(() => {}); } catch {} }
      if (logsChannel)   { try { supabase.removeChannel(logsChannel).catch(() => {}); }   catch {} }
    };
  }, [supabase, fetchData]);

  return {
    habits,
    todayLogs,
    historicalLogs,
    loading,
    isSyncing,
    error,
    completedCount,
    addHabit,
    renameHabit,
    toggleHabit,
    completeHabitWithVerification,
    undoCompletion,
    addLaterReminder,
    skipHabitToday,
    deleteHabit,
    removeHabitOptimistic,
    restoreHabit,
    commitDeleteHabit,
    isCompletedToday,
    isFailedToday,
    markFailed,
    getStreak,
    getStreakInfo,
    getHabitStrength,
    hasBrokenStreak,
    refetch: fetchData,
  };
}
