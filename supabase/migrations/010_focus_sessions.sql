-- Focus sessions table for logging timer sessions
-- NOTE: This table and the duration_minutes column on habits were applied
-- directly to production. This migration file documents the schema for
-- local development parity.

-- Add focus timer duration to habits (idempotent)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Focus sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  habit_id         uuid references habits(id) on delete set null,
  habit_name       text,
  duration_minutes integer not null,
  actual_minutes   integer not null,
  was_completed    boolean not null default false,
  completed_at     timestamptz default now(),
  created_at       timestamptz default now()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own focus sessions"
  ON focus_sessions FOR ALL
  USING (auth.uid() = user_id);
