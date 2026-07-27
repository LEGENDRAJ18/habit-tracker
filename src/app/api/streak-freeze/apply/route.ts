import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Automatic streak-freeze application — Plus/Pro only, once every 7 days.
// Mirrors the eligibility logic previously computed client-side in
// useProfile.ts (freezeAvailable) and dashboard/page.tsx (isPaid).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_tier, last_freeze_used")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const isPaid = profile.subscription_tier === "plus" || profile.subscription_tier === "pro";
  if (!isPaid) {
    return NextResponse.json({ error: "Streak freeze is a Plus/Pro feature." }, { status: 403 });
  }

  const lastFreezeUsed = profile.last_freeze_used as string | null;
  const today = new Date().toISOString().split("T")[0];
  const freezeAvailable =
    !lastFreezeUsed ||
    Math.round((new Date(today).getTime() - new Date(lastFreezeUsed).getTime()) / 86400000) >= 7;

  if (!freezeAvailable) {
    return NextResponse.json({ error: "You've already used your streak freeze this week." }, { status: 403 });
  }

  // Same as the client's `new Date(Date.now() - 86400000).toISOString().split("T")[0]`,
  // computed server-side instead of trusting a client-supplied date.
  const protectedDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Atomic guarded update (compare-and-swap on last_freeze_used) — re-checks
  // eligibility in the WHERE clause so two concurrent requests can't both win.
  let query = admin
    .from("profiles")
    .update({ last_freeze_used: today, freeze_protected_date: protectedDate, streak_freezes: 0 })
    .eq("id", user.id);
  query = lastFreezeUsed === null
    ? query.is("last_freeze_used", null)
    : query.eq("last_freeze_used", lastFreezeUsed);

  const { data: updated, error } = await query.select("last_freeze_used, freeze_protected_date, streak_freezes");

  if (error) return NextResponse.json({ error: "Failed to apply streak freeze." }, { status: 500 });
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "You've already used your streak freeze this week." }, { status: 403 });
  }

  return NextResponse.json(updated[0]);
}
