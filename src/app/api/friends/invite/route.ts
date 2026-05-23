import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email/invite";

// Username pattern: optional leading @, then 3–20 alphanumeric/underscore chars
const USERNAME_RE = /^@?[a-z0-9_]{3,20}$/i;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Accept either { invite } (new) or { email } (legacy)
  const body = await req.json();
  const raw: string | undefined = body.invite ?? body.email;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const trimmed = raw.trim();
  const isUsername = USERNAME_RE.test(trimmed);

  let inviteeId: string | null = null;
  let resolvedEmail: string = "";

  if (isUsername) {
    // Look up by username in profiles
    const slug = trimmed.replace(/^@/, "").toLowerCase();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("username", slug)
      .limit(1)
      .maybeSingle();

    if (profile) {
      if (profile.id === user.id) {
        return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
      }
      inviteeId = profile.id;
      resolvedEmail = profile.email ?? "";
    }
    // If no profile found, we can't send email for a username-only lookup — return error
    if (!inviteeId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  } else {
    // Treat as email
    const normalizedEmail = trimmed.toLowerCase();
    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
    }
    resolvedEmail = normalizedEmail;

    // Look up the invited user by email
    const { data: users } = await admin.auth.admin.listUsers();
    const found = users?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (found) {
      inviteeId = found.id;
    }
  }

  if (inviteeId) {
    // Both users exist — create friendship record directly
    const { error } = await admin
      .from("friendships")
      .upsert(
        { requester_id: user.id, addressee_id: inviteeId, status: "pending" },
        { onConflict: "requester_id,addressee_id", ignoreDuplicates: true },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send invite email (only if we have an email address — username-only users already exist)
  if (resolvedEmail) {
    const inviterName = (user.email ?? "A friend").split("@")[0];
    try {
      await sendInviteEmail(resolvedEmail, inviterName, user.id);
    } catch {
      // Email failure is non-fatal if friendship was created
    }
  }

  return NextResponse.json({ ok: true, existing: !!inviteeId });
}
