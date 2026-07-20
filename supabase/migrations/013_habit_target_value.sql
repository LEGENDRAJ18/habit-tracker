-- Counter-type habit verification needs a numeric goal to score partial
-- completions against (e.g. "8 glasses of water"). Auto-populated with a
-- sensible default at creation time based on the detected counter keyword.
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS target_value numeric;
