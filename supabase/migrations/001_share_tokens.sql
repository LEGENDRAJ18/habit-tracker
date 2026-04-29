-- share_tokens: stores public achievement share pages
-- Drop + recreate for idempotent migrations
CREATE TABLE IF NOT EXISTS share_tokens (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type        TEXT        NOT NULL,                          -- streak | level | daily
  achievement_value       INTEGER     NOT NULL DEFAULT 0,
  achievement_emoji       TEXT        NOT NULL DEFAULT '',
  achievement_name        TEXT        NOT NULL DEFAULT '',
  achievement_description TEXT        NOT NULL DEFAULT '',
  user_display_name       TEXT        NOT NULL DEFAULT 'Habit Builder',
  user_streak             INTEGER     NOT NULL DEFAULT 0,
  user_level              INTEGER     NOT NULL DEFAULT 1,
  user_xp                 INTEGER     NOT NULL DEFAULT 0,
  token                   TEXT        UNIQUE NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can read (required for public share pages)
CREATE POLICY "Public can read share tokens"
  ON share_tokens FOR SELECT
  USING (true);

-- Authenticated users can only insert their own tokens
CREATE POLICY "Users can insert own share tokens"
  ON share_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);
