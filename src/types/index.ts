export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekly";
  created_at: string;
  stack_after_id: string | null;
  habit_strength: number;
  when_time: string | null;
  where_location: string | null;
  how_long: string | null;
  validity_score?: "valid" | "partial" | "invalid";
  smart_timing?: boolean;
  preferred_reminder_time?: string | null;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes: string | null;
}

export type Plan = "free" | "plus" | "pro";

export const FREE_HABIT_LIMIT = 5;
