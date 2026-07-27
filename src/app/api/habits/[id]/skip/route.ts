import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/types";

// "Skip" long-press action — consumes a weekly skip token and logs the day
// as intentionally skipped (protects the streak, awards no XP).
// Weekly quota: Free 1, Plus 3, Pro unlimited. Same limits as the previous
// client-side implementation in useHabits.ts.
const SKIP_QUOTA: Record<Plan, number> = { free: 1, plus: 3, pro: Infinity };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: habitId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_tier, skip_tokens_used, skip_week_start")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const tier = (profile.subscription_tier as Plan) ?? "free";

  // Week starts Monday. Computed server-side (UTC) rather than trusting the
  // client's browser-local "Monday" — the only behavioral difference from
  // before is that the weekly reset is now UTC-anchored instead of the
  // user's local timezone; the quota amounts themselves are unchanged.
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
    .toISOString().split("T")[0];

  const rawSkipWeekStart  = (profile.skip_week_start as string | null) ?? null;
  const rawSkipTokensUsed = (profile.skip_tokens_used as number | null) ?? 0;
  const used = rawSkipWeekStart === monday ? rawSkipTokensUsed : 0;

  if (used >= SKIP_QUOTA[tier]) {
    return NextResponse.json(
      { error: `You've used all your skips for this week (${SKIP_QUOTA[tier]}/week).` },
      { status: 403 },
    );
  }

  // Atomic guarded update (compare-and-swap on the raw stored values) — two
  // concurrent requests can't both consume the same token.
  let query = admin
    .from("profiles")
    .update({ skip_tokens_used: used + 1, skip_week_start: monday })
    .eq("id", user.id)
    .eq("skip_tokens_used", rawSkipTokensUsed);
  query = rawSkipWeekStart === null
    ? query.is("skip_week_start", null)
    : query.eq("skip_week_start", rawSkipWeekStart);

  const { data: updated, error: updateError } = await query.select("skip_tokens_used, skip_week_start");
  if (updateError) return NextResponse.json({ error: "Failed to record skip." }, { status: 500 });
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Please try again." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: log, error: logError } = await admin
    .from("habit_logs")
    .insert({ habit_id: habitId, user_id: user.id, completed_at: now, outcome: "success", completion_quality: "skipped" })
    .select()
    .single();

  if (logError || !log) {
    // Roll back the quota consumption so a failed log insert doesn't burn a skip.
    await admin
      .from("profiles")
      .update({ skip_tokens_used: rawSkipTokensUsed, skip_week_start: rawSkipWeekStart })
      .eq("id", user.id);
    return NextResponse.json({ error: "Couldn't skip — try again" }, { status: 500 });
  }

  return NextResponse.json({ error: null, log });
}
