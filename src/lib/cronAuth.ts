import type { NextRequest } from "next/server";

// Shared auth check for every scheduled-job endpoint — was 7 near-identical
// copies of this same check across cron/reminders, cron/midnight,
// cron/goal-program-checkin, send-reminder, cron/monthly-wrapped,
// cron/weekly-reset, and push/send, one of which already drifted out of
// sync once (a stale hardcoded secret in a pg_cron job, not this function
// itself — but duplicated auth logic is exactly what makes that kind of
// drift easy to miss).
//
// Accepts both trigger mechanisms actually in use:
//   Vercel Cron sends:      Authorization: Bearer <CRON_SECRET>
//   Supabase pg_cron sends: x-cron-secret: <CRON_SECRET>
// Routes only ever triggered by one mechanism still work unchanged — the
// other header simply never arrives for them.
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  const legacy = req.headers.get("x-cron-secret");
  return legacy === secret;
}
