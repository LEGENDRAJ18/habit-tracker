import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export async function POST(req: NextRequest) {
  // Verify the caller's Supabase JWT — only authenticated users can trigger their own welcome email
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Idempotent — skip if already sent
  if (user.user_metadata?.welcome_sent) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const name: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email.split("@")[0];

  await sendWelcomeEmail(user.email, name);

  // Mark so we never send twice
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, welcome_sent: true },
  });

  return NextResponse.json({ ok: true });
}
