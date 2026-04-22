export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekly";
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes: string | null;
}

export type Plan = "free" | "plus" | "pro";

export const FREE_HABIT_LIMIT = 3;
