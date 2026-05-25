-- Battles table with RLS (schema matches existing DB)
CREATE TABLE IF NOT EXISTS battles (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_name             text NOT NULL,
  duration_days          int  NOT NULL DEFAULT 7,
  status                 text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','declined')),
  challenger_completions int,
  opponent_completions   int,
  start_date             date,
  winner_id              uuid REFERENCES profiles(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own battles"
  ON battles FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can read own battles"
  ON battles FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Participants can update battles"
  ON battles FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Monthly wraps table with RLS (schema matches existing DB: data stored as jsonb)
CREATE TABLE IF NOT EXISTS monthly_wraps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month      date NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE monthly_wraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wraps"
  ON monthly_wraps FOR ALL
  USING (auth.uid() = user_id);
