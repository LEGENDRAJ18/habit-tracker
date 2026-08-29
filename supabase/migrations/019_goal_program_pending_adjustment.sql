-- Stage 3 of Goal Program auto-intervention: a read-only AI-generated
-- proposal (extend the current phase, or pause one underperforming habit),
-- surfaced in the UI with no accept/decline mechanism yet (Stage 4). Never
-- mutates phases/habits itself — this column is purely storage for the
-- proposal text and its parameters.

ALTER TABLE goal_programs
  ADD COLUMN IF NOT EXISTS pending_adjustment jsonb;
