-- Captures the user's grading system once (asked contextually via the Goal
-- Program academic-category question), reused silently on future academic
-- programs and available to any future feature that wants it. Open text —
-- covers both the preset chip keys and a free-text "Something else" answer.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grading_system text;
