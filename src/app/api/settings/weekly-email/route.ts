import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enabled } = await request.json() as { enabled: boolean };

  if (enabled) {
    // Tier gate — Plus/Pro only. Use the user-authenticated client (not admin)
    // so the lookup works via RLS without needing SUPABASE_SERVICE_ROLE_KEY.
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    if (!profile || profile.subscription_tier === "free") {
      return NextResponse.json({ error: "Weekly email report requires Plus or Pro." }, { status: 403 });
    }
  }

  await supabase.from("profiles").update({ weekly_email_enabled: enabled }).eq("id", user.id);
  return NextResponse.json({ weekly_email_enabled: enabled });
}
