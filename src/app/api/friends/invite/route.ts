import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email/invite";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Look up the invited user by email
  const { data: users } = await admin.auth.admin.listUsers();
  const invitee = users?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

  if (invitee) {
    // Both users exist — create friendship record directly
    const { error } = await admin
      .from("friendships")
      .upsert(
        { requester_id: user.id, addressee_id: invitee.id, status: "pending" },
        { onConflict: "requester_id,addressee_id", ignoreDuplicates: true },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send invite email regardless (so non-users get a signup link)
  const inviterName = (user.email ?? "A friend").split("@")[0];
  try {
    await sendInviteEmail(normalizedEmail, inviterName, user.id);
  } catch {
    // Email failure is non-fatal if friendship was created
  }

  return NextResponse.json({ ok: true, existing: !!invitee });
}
