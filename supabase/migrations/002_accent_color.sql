-- Add accent_color column to profiles for per-user theme preference
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'violet';
