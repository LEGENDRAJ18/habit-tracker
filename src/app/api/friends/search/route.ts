import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/friends/search?username=mannraj
// Returns { user: { id, name, email, username } | null }
// GET /api/friends/search?username=mann&prefix=true
// Returns { users: Array<{ id, username, xp }> } — up to 5 results, excludes current user
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.replace(/^@/, "").trim();
  if (!username) {
    return NextResponse.json({ error: "username query param required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const isPrefix = searchParams.get("prefix") === "true";

  // ── Prefix search mode (autocomplete) ───────────────────────────────────────
  if (isPrefix) {
    const query = admin
      .from("profiles")
      .select("id, username, xp")
      .ilike("username", `${username}%`)
      .neq("id", user.id)
      .limit(5);

    const { data: profiles, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const users = (profiles ?? []).map((p: { id: string; username: string | null; xp?: number | null }) => ({
      id: p.id,
      username: p.username,
      xp: p.xp ?? null,
    }));

    return NextResponse.json({ users });
  }

  // ── Exact match mode ─────────────────────────────────────────────────────────
  // Look up profile by username (case-insensitive)
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, username")
    .ilike("username", username)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ user: null });

  // Get display name from auth.users metadata
  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
  const metaName =
    authUser?.user?.user_metadata?.full_name ??
    authUser?.user?.user_metadata?.name ??
    null;
  const name = metaName ?? (profile.email ? profile.email.split("@")[0] : "Unknown");

  return NextResponse.json({
    user: {
      id: profile.id,
      name,
      email: profile.email ?? authUser?.user?.email ?? "",
      username: profile.username,
    },
  });
}
