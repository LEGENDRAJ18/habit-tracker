import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStreakBrokenEmail } from "@/lib/email/streak-broken";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { habitName?: string };

  const name: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email.split("@")[0];

  await sendStreakBrokenEmail(user.email, name, body.habitName);

  return NextResponse.json({ ok: true });
}
