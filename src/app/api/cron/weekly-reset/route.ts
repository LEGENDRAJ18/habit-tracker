// Monday midnight: reset weekly leaderboard snapshot and generate weekly stats.
// The live leaderboard is computed on-demand, but this cron stamps a
// "week_start" marker so rank-change indicators (↑3 this week) work correctly.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runWeeklyReset() {
  const supabase  = createAdminClient();
  const now       = new Date();
  const weekStart = now.toISOString().split("T")[0];

  // Only run on Mondays
  if (now.getUTCDay() !== 1) {
    return { skipped: true, reason: "not Monday", timestamp: now.toISOString() };
  }

  // Snapshot each user's current XP so rank changes can be computed
  // by comparing current XP to this week's baseline.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, xp");

  if (error) throw new Error(error.message);
  if (!profiles || profiles.length === 0) return { snapshots: 0, timestamp: now.toISOString() };

  // Upsert a weekly_xp_snapshot row for each user
  const rows = profiles.map((p) => ({
    user_id:    p.id,
    week_start: weekStart,
    xp_at_start: p.xp ?? 0,
    created_at: now.toISOString(),
  }));

  // Best-effort — if the table doesn't exist yet the insert simply fails silently
  try {
    await supabase
      .from("weekly_xp_snapshots")
      .upsert(rows, { onConflict: "user_id,week_start", ignoreDuplicates: true });
  } catch {
    // table may not exist — safe to ignore
  }

  return { snapshots: profiles.length, weekStart, timestamp: now.toISOString() };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runWeeklyReset());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runWeeklyReset());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
