ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS smart_timing           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preferred_reminder_time TIME;
