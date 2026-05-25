import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("group_id").eq("id", user.id).single();

    const [{ data: ownGroups }, memberGroupData] = await Promise.all([
      admin.from("groups").select("*").eq("admin_id", user.id),
      profile?.group_id
        ? admin.from("groups").select("*").eq("id", profile.group_id).single()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({ ownGroups: ownGroups ?? [], memberGroup: memberGroupData?.data ?? null });
  } catch (err) {
    console.error("[groups GET]", err);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, habit_name } = await request.json() as { name: string; habit_name: string };
    if (!name?.trim() || !habit_name?.trim()) {
      return NextResponse.json({ error: "name and habit_name are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: group, error } = await admin
      .from("groups")
      .insert({ name: name.trim(), habit_name: habit_name.trim(), admin_id: user.id, members: [{ user_id: user.id, joined_at: new Date().toISOString() }] })
      .select()
      .single();

    if (error) throw error;

    // Set admin's group_id
    await admin.from("profiles").update({ group_id: group.id }).eq("id", user.id);

    return NextResponse.json({ group });
  } catch (err) {
    console.error("[groups POST]", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, invite_code, group_id } = await request.json() as {
      action: "join" | "log_completion";
      invite_code?: string;
      group_id?: string;
    };

    const admin = createAdminClient();

    if (action === "join" && invite_code) {
      const { data: group, error } = await admin
        .from("groups")
        .select("*")
        .eq("invite_code", invite_code.toUpperCase())
        .single();

      if (error || !group) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

      const members = (group.members as Array<{ user_id: string; joined_at: string }>) ?? [];
      if (members.some((m) => m.user_id === user.id)) {
        return NextResponse.json({ error: "Already a member" }, { status: 409 });
      }
      members.push({ user_id: user.id, joined_at: new Date().toISOString() });

      await Promise.all([
        admin.from("groups").update({ members }).eq("id", group.id),
        admin.from("profiles").update({ group_id: group.id }).eq("id", user.id),
      ]);

      return NextResponse.json({ group });
    }

    if (action === "log_completion" && group_id) {
      const { data: group } = await admin.from("groups").select("*").eq("id", group_id).single();
      if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

      const members = (group.members as Array<{ user_id: string; joined_at: string; completed_today?: boolean }>) ?? [];
      const member = members.find((m) => m.user_id === user.id);
      if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

      member.completed_today = true;

      // Check if all completed today → increment group streak
      const allDone = members.every((m) => m.completed_today);
      const updates: Record<string, unknown> = { members };
      if (allDone) updates.group_streak = (group.group_streak ?? 0) + 1;

      await admin.from("groups").update(updates).eq("id", group_id);
      return NextResponse.json({ allDone, group_streak: allDone ? (group.group_streak ?? 0) + 1 : group.group_streak });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[groups PATCH]", err);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
