-- Habit Verification System
-- Adds auto-detected verification_type to habits, and richer completion
-- metadata to habit_logs so completions can be partial/full/skipped with
-- proof (counter value, reflection text, photo, timer usage).

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS verification_type text
    CHECK (verification_type IN ('counter', 'duration', 'photo', 'reflection', 'standard'))
    NOT NULL DEFAULT 'standard';

ALTER TABLE habit_logs
  ADD COLUMN IF NOT EXISTS actual_value       numeric,
  ADD COLUMN IF NOT EXISTS verification_type  text,
  ADD COLUMN IF NOT EXISTS reflection_text    text,
  ADD COLUMN IF NOT EXISTS photo_url          text,
  ADD COLUMN IF NOT EXISTS completion_quality text
    CHECK (completion_quality IN ('full', 'partial', 'skipped')) NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS timer_used         boolean NOT NULL DEFAULT false;

-- Skip-token weekly quota (Free: 1/week, Plus: 3/week, Pro: unlimited)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skip_tokens_used  int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skip_week_start   date;

-- "I'll do it later" — 2-hour reminder queue, polled by a cron and delivered
-- via the existing push_subscriptions/pushNotify pipeline.
CREATE TABLE IF NOT EXISTS later_reminders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id   uuid REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  habit_name text NOT NULL,
  remind_at  timestamptz NOT NULL,
  sent       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS later_reminders_due_idx ON later_reminders (remind_at) WHERE NOT sent;

ALTER TABLE later_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own later reminders" ON later_reminders;
CREATE POLICY "Users can manage their own later reminders"
  ON later_reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
