import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Orgs where user is admin or member
    const { data: ownOrgs } = await admin
      .from("organisations")
      .select("*")
      .eq("admin_id", user.id);

    const { data: profile } = await admin
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .single();

    let memberOrg = null;
    if (profile?.organisation_id) {
      const { data } = await admin.from("organisations").select("*").eq("id", profile.organisation_id).single();
      memberOrg = data;
    }

    return NextResponse.json({ ownOrgs: ownOrgs ?? [], memberOrg });
  } catch (err) {
    console.error("[organisations GET]", err);
    return NextResponse.json({ error: "Failed to load organisations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Pro only
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("subscription_tier").eq("id", user.id).single();
    if (!profile || profile.subscription_tier !== "pro") {
      return NextResponse.json({ error: "Organisation Mode requires Pro." }, { status: 403 });
    }

    const { name, description } = await request.json() as { name: string; description?: string };
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const { data: org, error } = await admin
      .from("organisations")
      .insert({ name: name.trim(), description: description?.trim() || null, admin_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ org });
  } catch (err) {
    console.error("[organisations POST]", err);
    return NextResponse.json({ error: "Failed to create organisation" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, org_id, invite_code } = await request.json() as {
      action: "join" | "kick";
      org_id?: string;
      invite_code?: string;
      member_id?: string;
    };

    const admin = createAdminClient();

    if (action === "join" && invite_code) {
      const { data: org, error } = await admin
        .from("organisations")
        .select("*")
        .eq("invite_code", invite_code.toUpperCase())
        .single();

      if (error || !org) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

      // Add user to members array
      const members = (org.members as Array<{ user_id: string; joined_at: string }>) ?? [];
      if (members.some((m) => m.user_id === user.id)) {
        return NextResponse.json({ error: "Already a member" }, { status: 409 });
      }
      members.push({ user_id: user.id, joined_at: new Date().toISOString() });

      await Promise.all([
        admin.from("organisations").update({ members }).eq("id", org.id),
        admin.from("profiles").update({ organisation_id: org.id }).eq("id", user.id),
      ]);

      return NextResponse.json({ org });
    }

    if (action === "kick" && org_id) {
      const { data: org } = await admin.from("organisations").select("*").eq("id", org_id).eq("admin_id", user.id).single();
      if (!org) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[organisations PATCH]", err);
    return NextResponse.json({ error: "Failed to update organisation" }, { status: 500 });
  }
}
