-- Organisations
CREATE TABLE IF NOT EXISTS organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  admin_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
  description text,
  members     jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own orgs"
  ON organisations FOR ALL
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Members can read their org"
  ON organisations FOR SELECT
  USING (
    auth.uid() = admin_id OR
    members @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))
  );

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  admin_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_name  text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
  members     jsonb NOT NULL DEFAULT '[]',
  group_streak int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own groups"
  ON groups FOR ALL
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Members can read their group"
  ON groups FOR SELECT
  USING (
    auth.uid() = admin_id OR
    members @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))
  );

CREATE POLICY "Members can update group streak"
  ON groups FOR UPDATE
  USING (
    auth.uid() = admin_id OR
    members @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))
  );

-- Profile columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weekly_email_enabled bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS streak_roast_enabled bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL;
