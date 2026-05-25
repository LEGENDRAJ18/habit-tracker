-- Battles table with RLS
CREATE TABLE IF NOT EXISTS battles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_name    text NOT NULL,
  duration_days int  NOT NULL DEFAULT 7,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','declined')),
  challenger_completions int NOT NULL DEFAULT 0,
  opponent_completions   int NOT NULL DEFAULT 0,
  started_at    timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
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

-- Monthly wraps table with RLS
CREATE TABLE IF NOT EXISTS monthly_wraps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month             text NOT NULL,  -- e.g. "2025-04"
  total_completions int  NOT NULL DEFAULT 0,
  consistency_pct   int  NOT NULL DEFAULT 0,
  best_streak       int  NOT NULL DEFAULT 0,
  top_habit         text,
  total_xp          int  NOT NULL DEFAULT 0,
  unique_habits     int  NOT NULL DEFAULT 0,
  personality_tags  text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE monthly_wraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wraps"
  ON monthly_wraps FOR ALL
  USING (auth.uid() = user_id);
