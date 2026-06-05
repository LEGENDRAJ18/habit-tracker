import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitaiapp.com";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET — returns current user's referral code, link, and stats
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Load or create referral code
    const { data: profile } = await admin
      .from("profiles")
      .select("referral_code, referral_count")
      .eq("id", user.id)
      .single();

    let code = profile?.referral_code as string | null;
    if (!code) {
      // Generate unique code (retry on collision)
      let attempts = 0;
      while (!code && attempts < 5) {
        const candidate = generateCode();
        const { error } = await admin
          .from("profiles")
          .update({ referral_code: candidate })
          .eq("id", user.id);
        if (!error) code = candidate;
        attempts++;
      }
    }

    if (!code) return NextResponse.json({ error: "Failed to generate referral code" }, { status: 500 });

    // Get referral breakdown
    const { data: referrals } = await admin
      .from("referrals")
      .select("status, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    const rewarded = (referrals ?? []).filter((r) => r.status === "rewarded").length;
    return NextResponse.json({
      code,
      link: `${APP_URL}/auth/login?ref=${code}`,
      total: (referrals ?? []).length,
      rewarded,
      pending: (referrals ?? []).filter((r) => r.status === "pending").length,
      earnedDays: rewarded * 14,
    });
  } catch (err) {
    console.error("[referral GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST — apply a referral code for the current user (called after signup)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { code?: string };
    const code = body.code?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const admin = createAdminClient();

    // Check this user hasn't already used a referral code
    const { data: myProfile } = await admin
      .from("profiles")
      .select("referred_by")
      .eq("id", user.id)
      .single();

    if (myProfile?.referred_by) {
      return NextResponse.json({ error: "Referral code already applied" }, { status: 409 });
    }

    // Find referrer by code
    const { data: referrer } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .single();

    if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    if (referrer.id === user.id) return NextResponse.json({ error: "Cannot use your own code" }, { status: 400 });

    // Check referral doesn't already exist for this user
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("referred_id", user.id)
      .single();

    if (existing) return NextResponse.json({ error: "Already referred" }, { status: 409 });

    // Apply referral: mark referred_by on user, insert referral row, give user 14 days Plus
    const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();

    await Promise.all([
      admin.from("profiles").update({
        referred_by: referrer.id,
        subscription_tier: "plus",
        trial_end_date:    trialEnd,
        subscription_status: "trialing",
      }).eq("id", user.id),

      admin.from("referrals").insert({
        referrer_id: referrer.id,
        referred_id: user.id,
        status:      "pending",
      }),

    ]);

    // Simpler referral count increment
    const { data: refProfile } = await admin
      .from("profiles")
      .select("referral_count")
      .eq("id", referrer.id)
      .single();

    await admin.from("profiles")
      .update({ referral_count: (refProfile?.referral_count ?? 0) + 1 })
      .eq("id", referrer.id);

    return NextResponse.json({ success: true, trialDays: 14 });
  } catch (err) {
    console.error("[referral POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
