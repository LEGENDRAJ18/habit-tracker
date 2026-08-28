-- Stage 1 of server-side Goal Program cadence: idempotency marker so the
-- new daily nudge cron doesn't re-push every day for a whole overdue week.
-- NULL, or a value older than current_week_started_at, means "not yet
-- nudged for the current week" — current_week_started_at advancing on any
-- real phase/week transition (Stage 0) naturally resets eligibility for
-- the next week too, with no extra bookkeeping needed.

ALTER TABLE goal_programs
  ADD COLUMN IF NOT EXISTS last_nudged_at timestamptz;
