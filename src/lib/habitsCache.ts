/**
 * Thin localStorage cache for habits + logs.
 * Also manages the offline mutation queue so toggles/adds/deletes
 * made while offline are flushed to Supabase when the network returns.
 */

import type { Habit, HabitLog } from "@/types";

const KEY_HABITS   = "habitai_cache_habits";
const KEY_LOGS     = "habitai_cache_logs";
const KEY_HIST     = "habitai_cache_hist";
const KEY_QUEUE    = "habitai_offline_queue";
const KEY_DATE     = "habitai_cache_date";

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Read/write habits cache ──────────────────────────────────────────────────

export function saveHabitsCache(
  habits: Habit[],
  todayLogs: HabitLog[],
  historicalLogs: Pick<HabitLog, "habit_id" | "completed_at">[],
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_HABITS, JSON.stringify(habits));
    localStorage.setItem(KEY_LOGS,   JSON.stringify(todayLogs));
    localStorage.setItem(KEY_HIST,   JSON.stringify(historicalLogs));
    localStorage.setItem(KEY_DATE,   today());
  } catch {
    // Storage quota exceeded — ignore
  }
}

export function loadHabitsCache(): {
  habits: Habit[];
  todayLogs: HabitLog[];
  historicalLogs: Pick<HabitLog, "habit_id" | "completed_at">[];
} | null {
  if (typeof window === "undefined") return null;
  try {
    const cacheDate = localStorage.getItem(KEY_DATE);
    if (cacheDate !== today()) return null; // stale — ignore
    const h = localStorage.getItem(KEY_HABITS);
    const l = localStorage.getItem(KEY_LOGS);
    const s = localStorage.getItem(KEY_HIST);
    if (!h || !l || !s) return null;
    return {
      habits:        JSON.parse(h) as Habit[],
      todayLogs:     JSON.parse(l) as HabitLog[],
      historicalLogs: JSON.parse(s) as Pick<HabitLog, "habit_id" | "completed_at">[],
    };
  } catch {
    return null;
  }
}

// ─── Offline queue ────────────────────────────────────────────────────────────

export type OfflineOp =
  | { type: "toggle_complete";   habitId: string; userId: string; completed_at: string; tempLogId: string }
  | { type: "toggle_uncomplete"; habitId: string; logId: string }
  | { type: "delete_habit";      habitId: string };

export function loadQueue(): OfflineOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_QUEUE);
    return raw ? (JSON.parse(raw) as OfflineOp[]) : [];
  } catch {
    return [];
  }
}

export function enqueue(op: OfflineOp) {
  if (typeof window === "undefined") return;
  try {
    const q = loadQueue();
    q.push(op);
    localStorage.setItem(KEY_QUEUE, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export function clearQueue() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_QUEUE);
}
