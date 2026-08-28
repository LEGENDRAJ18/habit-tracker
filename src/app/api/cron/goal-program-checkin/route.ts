// Daily Goal Program cadence nudge (Stage 1). Read-only against
// phases/current_week/current_phase — the only write is last_nudged_at, an
// idempotency marker so an overdue week doesn't get re-pushed every day it
// stays overdue. Does not auto-advance the program in any way; the user
// still drives progress entirely via "Mark complete".
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushNotify } from "@/lib/pushNotify";

const OVERDUE_DAYS = 7;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runGoalProgramCheckin() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: programs, error } = await admin
    .from("goal_programs")
    .select("id, user_id, program_name, current_week, current_week_started_at, last_nudged_at")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!programs || programs.length === 0) {
    return { checked: 0, nudged: 0, timestamp: now.toISOString() };
  }

  let nudged = 0;
  for (const program of programs) {
    try {
      const weekStarted = new Date(program.current_week_started_at);
      const daysSince = (now.getTime() - weekStarted.getTime()) / 86_400_000;
      if (daysSince < OVERDUE_DAYS) continue;

      // Already nudged for this specific week cycle — current_week_started_at
      // only moves forward on a real transition (Stage 0), so this naturally
      // resets once the week actually advances.
      if (program.last_nudged_at && new Date(program.last_nudged_at) >= weekStarted) continue;

      const { data: checkin } = await admin
        .from("program_checkins")
        .select("id")
        .eq("program_id", program.id)
        .eq("week_number", program.current_week)
        .limit(1)
        .maybeSingle();
      if (checkin) continue;

      await pushNotify(
        admin,
        program.user_id,
        {
          title: `Week ${program.current_week} check-in?`,
          body: `You're on Week ${program.current_week} of "${program.program_name}" — still on track?`,
          tag: "goal_program_nudge",
          url: "/goal-program",
        },
        "general",
      );

      await admin.from("goal_programs").update({ last_nudged_at: now.toISOString() }).eq("id", program.id);
      nudged++;
    } catch (err) {
      console.error("[cron/goal-program-checkin] failed for program", program.id, err);
    }
  }

  return { checked: programs.length, nudged, timestamp: now.toISOString() };
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
