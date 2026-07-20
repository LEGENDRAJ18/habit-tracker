-- AI Goal Program (Pro feature)
-- Multi-week, AI-generated habit programs built around a user's stated goal.

CREATE TABLE IF NOT EXISTS goal_programs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_category          text NOT NULL CHECK (goal_category IN (
                           'sport', 'body', 'bad_habit', 'academic',
                           'build', 'mental_health', 'finance', 'relationships'
                         )),
  goal_description       text NOT NULL,
  program_name           text NOT NULL,
  program_overview       text NOT NULL,
  phases                 jsonb NOT NULL DEFAULT '[]',
  current_phase          int NOT NULL DEFAULT 1,
  current_week           int NOT NULL DEFAULT 1,
  status                 text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  started_at             timestamptz NOT NULL DEFAULT now(),
  target_completion_date timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_programs_user_active_idx
  ON goal_programs (user_id) WHERE status = 'active';

ALTER TABLE goal_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own goal programs" ON goal_programs;
CREATE POLICY "Users can manage their own goal programs"
  ON goal_programs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS program_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  program_id      uuid REFERENCES goal_programs(id) ON DELETE CASCADE NOT NULL,
  week_number     int NOT NULL,
  rating          int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  what_went_well  text,
  what_was_hard   text,
  ai_response     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS program_checkins_program_idx ON program_checkins (program_id);

ALTER TABLE program_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own program checkins" ON program_checkins;
CREATE POLICY "Users can manage their own program checkins"
  ON program_checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Link auto-created habits back to the program/phase/week that generated them
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS program_id    uuid REFERENCES goal_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_phase int,
  ADD COLUMN IF NOT EXISTS program_week  int;

CREATE INDEX IF NOT EXISTS habits_program_id_idx ON habits (program_id) WHERE program_id IS NOT NULL;

-- Daily AI-generation rate limit (max 3 program generations/day/user) --
-- same shape as profiles.ai_insight_count/ai_insight_date in ai-insight route.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal_program_gen_count int,
  ADD COLUMN IF NOT EXISTS goal_program_gen_date  date;

-- Storage bucket for habit verification photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('habit-photos', 'habit-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own habit photos" ON storage.objects;
CREATE POLICY "Users can upload their own habit photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'habit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can read their own habit photos" ON storage.objects;
CREATE POLICY "Users can read their own habit photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'habit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own habit photos" ON storage.objects;
CREATE POLICY "Users can delete their own habit photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'habit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
