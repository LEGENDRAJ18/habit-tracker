export type VerificationType = "counter" | "duration" | "photo" | "reflection" | "standard";

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
  duration_minutes?: number | null;
  difficulty?: number | null;
  xp_value?: number | null;
  habit_type?: "standard" | "limit";
  verification_type?: VerificationType;
  target_value?: number | null;
  program_id?: string | null;
  program_phase?: number | null;
  program_week?: number | null;
}

export interface FocusSession {
  id: string;
  user_id: string;
  habit_id: string | null;
  habit_name: string | null;
  duration_minutes: number;
  actual_minutes: number;
  was_completed: boolean;
  completed_at: string;
  created_at: string;
}

export type CompletionQuality = "full" | "partial" | "skipped";

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes: string | null;
  outcome?: "success" | "failed";
  actual_value?: number | null;
  verification_type?: VerificationType | null;
  reflection_text?: string | null;
  photo_url?: string | null;
  completion_quality?: CompletionQuality;
  timer_used?: boolean;
}

export type Plan = "free" | "plus" | "pro";

export const FREE_HABIT_LIMIT = 999; // free plan is now unlimited

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

export type GoalCategory =
  | "sport" | "body" | "bad_habit" | "academic"
  | "build" | "mental_health" | "finance" | "relationships";

export interface ProgramHabit {
  name: string;
  frequency: "daily" | "weekly";
  why: string;
}

export interface ProgramMilestone {
  text: string;
  done: boolean;
}

export interface ProgramPhase {
  phase: number;
  title: string;
  weeks: number;
  focus: string;
  milestones: ProgramMilestone[];
  habits: ProgramHabit[];
}

export interface GoalProgram {
  id: string;
  user_id: string;
  goal_category: GoalCategory;
  goal_description: string;
  program_name: string;
  program_overview: string;
  phases: ProgramPhase[];
  current_phase: number;
  current_week: number;
  status: "active" | "paused" | "completed" | "abandoned";
  started_at: string;
  target_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramCheckin {
  id: string;
  user_id: string;
  program_id: string;
  week_number: number;
  rating: number;
  what_went_well: string | null;
  what_was_hard: string | null;
  ai_response: string | null;
  created_at: string;
}
