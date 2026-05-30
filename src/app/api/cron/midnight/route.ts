import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Auto-apply streak freezes for Plus/Pro users who missed habits yesterday.
// Also refills one freeze per week (on Mondays) up to the plan maximum.
async function processStreakFreezes(supabase: ReturnType<typeof createAdminClient>) {
  const now       = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
  const today     = now.toISOString().split("T")[0];
  const isMonday  = now.getUTCDay() === 1;

  // Fetch all paid users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, subscription_tier, streak_freeze_count, freeze_protected_date")
    .in("subscription_tier", ["plus", "pro"]);

  if (!profiles || profiles.length === 0) return { freezesApplied: 0, freezesRefilled: 0 };

  let freezesApplied  = 0;
  let freezesRefilled = 0;

  for (const profile of profiles) {
    try {
      const isPro    = profile.subscription_tier === "pro";
      const maxFreeze = isPro ? 2 : 1;

      // Monday refill: restore one freeze up to plan max
      if (isMonday && profile.streak_freeze_count < maxFreeze) {
        await supabase
          .from("profiles")
          .update({ streak_freeze_count: Math.min(maxFreeze, profile.streak_freeze_count + 1) })
          .eq("id", profile.id);
        freezesRefilled++;
      }

      // Skip auto-apply if already protected yesterday or no freezes left
      if (profile.freeze_protected_date === yesterday) continue;
      if (profile.streak_freeze_count <= 0) continue;

      // Check if user missed any habits yesterday
      const { data: habits } = await supabase
        .from("habits")
        .select("id")
        .eq("user_id", profile.id);

      if (!habits || habits.length === 0) continue;

      const { data: logs } = await supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", profile.id)
        .gte("completed_at", `${yesterday}T00:00:00.000Z`)
        .lt("completed_at", `${today}T00:00:00.000Z`);

      const completedIds = new Set((logs ?? []).map((l) => l.habit_id));
      const missedAny = habits.some((h) => !completedIds.has(h.id));
      if (!missedAny) continue;

      // Auto-apply freeze for yesterday
      await supabase
        .from("profiles")
        .update({
          freeze_protected_date: yesterday,
          streak_freeze_count:   Math.max(0, profile.streak_freeze_count - 1),
        })
        .eq("id", profile.id);

      freezesApplied++;
    } catch {
      // continue to next user
    }
  }

  return { freezesApplied, freezesRefilled };
}

async function run() {
  const supabase = createAdminClient();
  const result   = await processStreakFreezes(supabase);
  return { ...result, timestamp: new Date().toISOString() };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await run());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await run());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
