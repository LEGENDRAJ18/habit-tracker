-- Lets a Goal Program phase transition retire the previous phase's habits
-- instead of letting them accumulate on the dashboard forever. Soft-archive
-- only — habit_logs (habit_id ON DELETE CASCADE) stays untouched, so
-- streak/completion history is fully preserved for any retired habit.

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
