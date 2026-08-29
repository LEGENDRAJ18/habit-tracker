// Daily Goal Program cadence + struggle-detection nudge (Stages 1-2).
// Read-only against phases/current_week/current_phase — the only write is
// last_nudged_at, an idempotency marker so an overdue/struggling week
// doesn't get re-pushed every day it stays that way. Does not auto-advance
// the program or touch its habits in any way; the user still drives
// progress entirely via "Mark complete", and no AI call happens here.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushNotify } from "@/lib/pushNotify";

const OVERDUE_DAYS = 7;
const COMPLETION_WINDOW_DAYS = 7;
const COMPLETION_THRESHOLD = 0.5;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Sustained low completion over the trailing week, across this program's
// CURRENT active habits only (retired-phase habits are already
// is_active: false, so this naturally scopes to the current phase).
// Skipped for programs under a week old or with no active habits — not
// enough signal either way.
async function hasLowCompletion(
  admin: ReturnType<typeof createAdminClient>,
  programId: string,
  startedAt: string,
  now: Date,
): Promise<boolean> {
  const programAgeDays = (now.getTime() - new Date(startedAt).getTime()) / 86_400_000;
  if (programAgeDays < COMPLETION_WINDOW_DAYS) return false;

  const { data: activeHabits } = await admin
    .from("habits")
    .select("id")
    .eq("program_id", programId)
    .eq("is_active", true);
  const activeIds = (activeHabits ?? []).map((h) => h.id);
  if (activeIds.length === 0) return false;

  const windowStart = new Date(now.getTime() - COMPLETION_WINDOW_DAYS * 86_400_000).toISOString();
  const { count } = await admin
    .from("habit_logs")
    .select("id", { count: "exact", head: true })
    .in("habit_id", activeIds)
    .neq("outcome", "failed")
    .gte("completed_at", windowStart);

  const possible = activeIds.length * COMPLETION_WINDOW_DAYS;
  return possible > 0 && (count ?? 0) / possible < COMPLETION_THRESHOLD;
}

async function runGoalProgramCheckin() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: programs, error } = await admin
    .from("goal_programs")
    .select("id, user_id, program_name, current_week, current_week_started_at, last_nudged_at, started_at")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!programs || programs.length === 0) {
    return { checked: 0, nudged: 0, struggling: 0, timestamp: now.toISOString() };
  }

  let nudged = 0;
  let strugglingCount = 0;
  for (const program of programs) {
    try {
      const weekStarted = new Date(program.current_week_started_at);
      const daysSince = (now.getTime() - weekStarted.getTime()) / 86_400_000;
      const stalled = daysSince >= OVERDUE_DAYS;

      let overdue = false;
      if (stalled) {
        const { data: checkin } = await admin
          .from("program_checkins")
          .select("id")
          .eq("program_id", program.id)
          .eq("week_number", program.current_week)
          .limit(1)
          .maybeSingle();
        overdue = !checkin;
      }

      const lowCompletion = await hasLowCompletion(admin, program.id, program.started_at, now);

      // "Two consecutive missed check-ins" only makes sense once the
      // current week is itself already overdue with no check-in, and only
      // from week 2 onward — week 1 of a fresh phase gets a clean slate.
      let missedTwoInARow = false;
      if (overdue && program.current_week >= 2) {
        const { data: prevCheckin } = await admin
          .from("program_checkins")
          .select("id")
          .eq("program_id", program.id)
          .eq("week_number", program.current_week - 1)
          .limit(1)
          .maybeSingle();
        missedTwoInARow = !prevCheckin;
      }

      const struggling = lowCompletion || missedTwoInARow;
      if (!overdue && !struggling) continue;

      // Already nudged for this specific week cycle — current_week_started_at
      // only moves forward on a real transition (Stage 0), so this naturally
      // resets once the week actually advances.
      if (program.last_nudged_at && new Date(program.last_nudged_at) >= weekStarted) continue;

      const payload = struggling
        ? {
            title: "Rough patch?",
            body: `"${program.program_name}" has looked tough this week — we'll check in on this soon.`,
            tag: "goal_program_struggle",
            url: "/goal-program",
          }
        : {
            title: `Week ${program.current_week} check-in?`,
            body: `You're on Week ${program.current_week} of "${program.program_name}" — still on track?`,
            tag: "goal_program_nudge",
            url: "/goal-program",
          };

      await pushNotify(admin, program.user_id, payload, "general");

      await admin.from("goal_programs").update({ last_nudged_at: now.toISOString() }).eq("id", program.id);
      nudged++;
      if (struggling) strugglingCount++;
    } catch (err) {
      console.error("[cron/goal-program-checkin] failed for program", program.id, err);
    }
  }

  return { checked: programs.length, nudged, struggling: strugglingCount, timestamp: now.toISOString() };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runGoalProgramCheckin());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runGoalProgramCheckin());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
