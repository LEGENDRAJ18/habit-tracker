-- Store trial end date for in-trial subscribers and prevent duplicate reminder emails
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_end_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent BOOLEAN DEFAULT FALSE;
