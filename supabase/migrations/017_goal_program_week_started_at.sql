-- Stage 0 of server-side Goal Program cadence: track when the CURRENT week
-- actually started, separate from updated_at (which also changes on
-- unrelated writes like pause/resume). A later cron uses this to detect an
-- overdue week — this migration is plumbing only, no cron reads it yet.

ALTER TABLE goal_programs
  ADD COLUMN IF NOT EXISTS current_week_started_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows to their program start rather than "now" so an
-- old, already-active program doesn't look freshly-started.
UPDATE goal_programs
  SET current_week_started_at = started_at
  WHERE current_week_started_at IS DISTINCT FROM started_at;
