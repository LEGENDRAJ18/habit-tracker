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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  stale: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const h = localStorage.getItem(KEY_HABITS);
    const s = localStorage.getItem(KEY_HIST);
    if (!h || !s) return null; // no habit data at all

    const cacheDate = localStorage.getItem(KEY_DATE);
    const isStale   = cacheDate !== today();

    // Always return habits + history — they're valid across days.
    // todayLogs only apply to the same calendar day.
    const l = localStorage.getItem(KEY_LOGS);
    return {
      habits:         JSON.parse(h) as Habit[],
      todayLogs:      isStale || !l ? [] : (JSON.parse(l) as HabitLog[]),
      historicalLogs: JSON.parse(s) as Pick<HabitLog, "habit_id" | "completed_at">[],
      stale:          isStale,
    };
  } catch {
    return null;
  }
}

// ─── Offline queue ────────────────────────────────────────────────────────────

export type AddHabitPayload = {
  user_id:                 string;
  name:                    string;
  description:             string | null;
  frequency:               "daily" | "weekly";
  stack_after_id:          string | null;
  when_time:               string | null;
  where_location:          string | null;
  how_long:                string | null;
  validity_score:          "valid" | "partial" | "invalid";
  preferred_reminder_time: string | null;
  duration_minutes:        number | null;
  xp_value:                number;
  difficulty:              number;
  verification_type:       string;
  target_value:            number | null;
};

export type OfflineOp =
  | { type: "toggle_complete";   habitId: string; userId: string; completed_at: string; tempLogId: string }
  | { type: "toggle_uncomplete"; habitId: string; logId: string }
  | { type: "delete_habit";      habitId: string }
  | { type: "add_habit";         tempId: string; payload: AddHabitPayload };

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
