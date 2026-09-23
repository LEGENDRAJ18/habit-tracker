"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveUser } from "@/lib/supabase/resolve-user";
import type { Habit, HabitLog } from "@/types";
import {
  saveHabitsCache, loadHabitsCache,
  loadQueue, saveQueue, type QueuedOp,
} from "@/lib/habitsCache";
import { toast } from "@/components/ui/Toast";

// Computes habit strength from historical logs using the canonical formula:
// base 10 + 5 per completion − 3 per missed day (min 5, max 100).
// Missed days are counted from the day AFTER creation (not the creation day itself).
// For a weekly habit, only its scheduled day_of_week counts as a "possible"
// day — every other day was never due, so it can't be missed. Same fix
// family as AtRiskWarnings (analytics/page.tsx) and the dashboard AI
// check-in trigger — without this, a weekly habit racks up ~6 phantom
// misses a week and gets driven toward the floor regardless of how
// consistently it's actually completed on its real schedule.
function computeStrengthFromLogs(
  habitCreatedAt: string,
  logDates: string[], // unique completion date strings YYYY-MM-DD, any order
  frequency: "daily" | "weekly" = "daily",
  dayOfWeek: number | null = null,
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

  // Days between missStart and today (exclusive) — the window in which we count misses.
  // Weekly habits only count occurrences of their own scheduled weekday;
  // fixed to local noon so a bare UTC-midnight parse can't shift the
  // computed day-of-week across a timezone boundary.
  let daysInMissWindow: number;
  if (frequency === "weekly" && dayOfWeek != null) {
    daysInMissWindow = 0;
    const startMs = new Date(`${missStart}T12:00:00`).getTime();
    const endMs   = new Date(`${today}T12:00:00`).getTime();
    for (let t = startMs; t < endMs; t += 86400000) {
      if (new Date(t).getDay() === dayOfWeek) daysInMissWindow++;
    }
  } else {
    daysInMissWindow = Math.max(
      0,
      Math.round((new Date(today).getTime() - new Date(missStart).getTime()) / 86400000),
    );
  }

  const pastCompletions = logDates.filter((d) => d >= missStart && d < today).length;
  const missed          = Math.max(0, daysInMissWindow - pastCompletions);

  return Math.max(5, Math.min(100, 10 + completions * 5 - missed * 3));
}

// Unique seq counter prevents "cannot add callbacks after subscribe" errors
// when the component remounts before async removeChannel() completes.
let _habitsRTSeq = 0;

// Owns the shared state (habits, todayLogs, historicalLogs, loading,
// isSyncing, error) plus everything that hydrates or resyncs it: the initial
// fetch, tab-visibility refetch, offline-queue flush, and the realtime
// subscription. Every other habits/* hook reads this state and its setters
// rather than declaring its own — see the useHabits.ts barrel for why that
// matters (compound optimistic updates touch multiple slices atomically).
export function useHabitsCore() {
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
          // Valid closure self-reference: by the time this timeout fires
          // (3s later), the `const fetchData = ...` assignment below has
          // long completed — this has always worked at runtime. The React
          // Compiler lint rule only started flagging it once this hook got
          // small enough for its analyzer to fully traverse (it silently
          // bailed on the original 1,136-line monolith). No React Compiler
          // transform is enabled in this project (no `reactCompiler` flag in
          // next.config.ts), so this is a lint-only finding, not a runtime risk.
          // eslint-disable-next-line react-hooks/immutability -- see comment above
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
        const computed = computeStrengthFromLogs(habit.created_at, dateMap.get(habit.id) ?? [], habit.frequency, habit.day_of_week);
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

      const user = await resolveUser();
      if (!user) return;

      const stillQueued: QueuedOp[] = [];
      let hasRepeatedFailure = false;

      for (const item of queue as QueuedOp[]) {
        const { op } = item;
        let error: unknown = null;
        try {
          if (op.type === "toggle_complete") {
            ({ error } = await supabase
              .from("habit_logs")
              .insert({ habit_id: op.habitId, user_id: op.userId })
              .select()
              .single());
          } else if (op.type === "toggle_uncomplete") {
            ({ error } = await supabase.from("habit_logs").delete().eq("id", op.logId));
          } else if (op.type === "delete_habit") {
            ({ error } = await supabase.from("habits").delete().eq("id", op.habitId));
          } else if (op.type === "add_habit") {
            ({ error } = await supabase.from("habits").insert(op.payload).select().single());
          }
        } catch (err) {
          error = err;
        }

        if (error) {
          // Don't discard on failure — keep it queued so it retries on the
          // next "online" event instead of silently losing the completion.
          const attempts = item.attempts + 1;
          stillQueued.push({ op, attempts });
          if (attempts >= 3) hasRepeatedFailure = true;
        }
      }

      saveQueue(stillQueued);

      if (hasRepeatedFailure) {
        toast("Some progress couldn't be saved — check your connection and try again.", "error", undefined, 5000);
      }

      // Re-fetch to reconcile server state with what we applied offline
      void fetchData(true);
    };

    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [supabase, fetchData]);

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
    habits, setHabits,
    todayLogs, setTodayLogs,
    historicalLogs, setHistoricalLogs,
    loading,
    isSyncing,
    error,
    supabase,
    fetchData,
  };
}
