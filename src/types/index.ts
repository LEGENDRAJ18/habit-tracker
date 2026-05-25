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
  is_public?: boolean;
  commitment_text?: string | null;
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

export interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_name?: string;
  opponent_name?: string;
  habit_name: string;
  duration_days: number;
  start_date: string | null;
  status: "pending" | "active" | "completed" | "declined";
  winner_id: string | null;
  challenger_completions: number;
  opponent_completions: number;
  created_at: string;
}

export interface MonthlyWrapData {
  month: string;
  totalCompletions: number;
  uniqueHabits: number;
  bestStreak: number;
  topHabit: string;
  consistencyPct: number;
  totalXP: number;
  personalityTags: string[];
  biggestImprovement: string | null;
}
