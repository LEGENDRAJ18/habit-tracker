-- persona: the 8-option onboarding persona (student/professional/athlete/...),
-- written by both the primary onboarding flow and the in-dashboard fallback
-- modal. Previously only stored via the derived `user_mode` field; this keeps
-- the actual persona selection for future personalisation.
--
-- welcome_seen: gates the one-time post-onboarding welcome overlay. Stored on
-- the profile (not localStorage) so it survives device changes and reinstalls.
--
-- notif_prompt_last_asked_at: last time the notification-permission modal was
-- shown/dismissed, so a "Maybe later" response snoozes the prompt for a few
-- days instead of re-asking on every visit.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS persona text,
  ADD COLUMN IF NOT EXISTS welcome_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_prompt_last_asked_at timestamptz;

-- Backfill: users who already completed onboarding before this column existed
-- must never see the "welcome" overlay retroactively — only genuinely new
-- completions (welcome_seen defaults to false) should trigger it.
UPDATE profiles SET welcome_seen = true
  WHERE onboarding_completed = true AND welcome_seen = false;
