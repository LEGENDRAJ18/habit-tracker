CREATE TABLE IF NOT EXISTS weekly_plans (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  actions    TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_plans_user_week ON weekly_plans (user_id, week_start);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own weekly plans" ON weekly_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can insert own weekly plans" ON weekly_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own weekly plans" ON weekly_plans
  FOR UPDATE USING (auth.uid() = user_id);
