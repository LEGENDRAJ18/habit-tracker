-- Track scheduled cancellation so users keep access until period ends
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end   TIMESTAMPTZ;
