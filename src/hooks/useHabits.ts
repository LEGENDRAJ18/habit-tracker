"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitLog } from "@/types";
import {
  saveHabitsCache, loadHabitsCache,
  loadQueue, clearQueue, enqueue, type OfflineOp, type AddHabitPayload,
} from "@/lib/habitsCache";

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

    const t0 = performance.now();
    const { data: { user } } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 5_000)
      ),
    ]);
    console.log("[LOAD] getUser", Math.round(performance.now() - t0), "ms");

    if (!user) {
      if (!silent) setLoading(false);
      setIsSyncing(false);
      return;
    }

    const today            = new Date().toISOString().split("T")[0];
    const tomorrow         = new Date(Date.now() + 86400000).toISOString().split("T")[0];
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

  // Flush offline queue when network returns ────────────────────────────────
  useEffect(() => {
    const flushQueue = async () => {
      const queue = loadQueue();
      if (queue.length === 0) return;
      clearQueue();

      const { data: { user } } = await supabase.auth.getUser();
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
  ): Promise<{ error: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const offline = typeof navigator !== "undefined" && !navigator.onLine;

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
      };
      enqueue({ type: "add_habit", tempId, payload });
      posthog.capture("habit_created", { habit_name: name, frequency, validity_score: validityScore ?? "valid" });
      return { error: null };
    }

    const { data, error } = await supabase
      .from("habits")
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      // Revert the optimistic add
      setHabits((prev) => prev.filter((h) => h.id !== tempId));
      return { error: error.message };
    }
    if (data) {
      // Swap temp placeholder with the real DB record
      setHabits((prev) => prev.map((h) => (h.id === tempId ? data : h)));
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

      const { data: { user } } = await supabase.auth.getUser();
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

      posthog.capture("habit_completed", { habit_name: habit?.name, frequency: habit?.frequency });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);

      const { data: { user } } = await supabase.auth.getUser();
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

      const { data, error: insertErr } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habitId, user_id: user.id })
        .select()
        .single();

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

      setTodayLogs((prev) => prev.map((l) => (l.id === tempId ? data : l)));
      void supabase.from("habits").update({ habit_strength: newStrength }).eq("id", habitId);
    }
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

  const isCompletedToday = (habitId: string) =>
    todayLogs.some((l) => l.habit_id === habitId);

  const completedCount = habits.filter((h) => isCompletedToday(h.id)).length;

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

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user || cancelled) return;

      const seq = ++_habitsRTSeq;

      // Unique names prevent "cannot add callbacks after subscribe" errors if
      // the component re-mounts before the previous async removeChannel() finishes.
      try {
        habitsChannel = supabase
          .channel(`habits-rt-${user.id}-${seq}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${user.id}` }, () => { if (!cancelled) fetchData(true); })
          .subscribe();
      } catch (err) {
        console.warn("[useHabits] habits realtime skipped:", err);
      }

      try {
        logsChannel = supabase
          .channel(`logs-rt-${user.id}-${seq}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "habit_logs", filter: `user_id=eq.${user.id}` }, () => { if (!cancelled) fetchData(true); })
          .subscribe();
      } catch (err) {
        console.warn("[useHabits] logs realtime skipped:", err);
      }
    })();

    return () => {
      cancelled = true;
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
    deleteHabit,
    removeHabitOptimistic,
    restoreHabit,
    commitDeleteHabit,
    isCompletedToday,
    getStreak,
    getStreakInfo,
    getHabitStrength,
    hasBrokenStreak,
    refetch: fetchData,
  };
}
