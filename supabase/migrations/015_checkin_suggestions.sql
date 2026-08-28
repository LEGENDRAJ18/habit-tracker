-- Structured, trackable AI check-in suggestions (Goal Program).
-- ai_response stays a short warm acknowledgment sentence; concrete,
-- checkable suggestions move into their own nullable JSONB column so
-- existing check-ins (ai_suggestions = null) keep rendering exactly as
-- before with no backfill needed.

ALTER TABLE program_checkins
  ADD COLUMN IF NOT EXISTS ai_suggestions jsonb;
