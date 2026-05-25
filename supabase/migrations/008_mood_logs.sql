CREATE TABLE IF NOT EXISTS mood_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood       int  NOT NULL CHECK (mood BETWEEN 1 AND 5),
  note       text,
  logged_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mood_logs_user_date ON mood_logs (user_id, logged_at DESC);

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mood logs"
  ON mood_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
