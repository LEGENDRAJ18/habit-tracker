import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RawMember = { user_id: string; joined_at: string; completed_today?: boolean };

async function enrichMembers(admin: ReturnType<typeof createAdminClient>, members: RawMember[]) {
  if (!members.length) return members;
  const ids = members.map((m) => m.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? "Member"]));
  return members.map((m) => ({ ...m, display_name: nameMap.get(m.user_id) ?? "Member" }));
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    // Use user-authenticated client for own profile so subscription_tier is
    // correct even when SUPABASE_SERVICE_ROLE_KEY is absent.
    const { data: profile } = await supabase.from("profiles").select("group_id, subscription_tier").eq("id", user.id).single();

    const [{ data: ownGroups }, memberGroupData] = await Promise.all([
      admin.from("groups").select("*").eq("admin_id", user.id),
      profile?.group_id
        ? admin.from("groups").select("*").eq("id", profile.group_id).single()
        : Promise.resolve({ data: null }),
    ]);

    // Enrich all groups' members with display names
    const enrichedOwn = await Promise.all(
      (ownGroups ?? []).map(async (g) => ({
        ...g,
        members: await enrichMembers(admin, (g.members ?? []) as RawMember[]),
      }))
    );

    const rawMemberGroup = memberGroupData?.data ?? null;
    const enrichedMemberGroup = rawMemberGroup
      ? { ...rawMemberGroup, members: await enrichMembers(admin, (rawMemberGroup.members ?? []) as RawMember[]) }
      : null;

    return NextResponse.json({
      ownGroups: enrichedOwn,
      memberGroup: enrichedMemberGroup,
      tier: profile?.subscription_tier ?? "free",
    });
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

    const admin = createAdminClient();

    // Tier check: only Plus/Pro can create groups
    const { data: profile } = await admin.from("profiles").select("subscription_tier").eq("id", user.id).single();
    const tier = profile?.subscription_tier as string | undefined;
    if (tier !== "plus" && tier !== "pro") {
      return NextResponse.json({ error: "Group Habits require a Plus or Pro subscription.", upgrade: true }, { status: 403 });
    }

    const { name, habit_name, emoji } = await request.json() as { name: string; habit_name: string; emoji?: string };
    if (!name?.trim() || !habit_name?.trim()) {
      return NextResponse.json({ error: "name and habit_name are required" }, { status: 400 });
    }

    const { data: group, error } = await admin
      .from("groups")
      .insert({
        name: name.trim(),
        habit_name: habit_name.trim(),
        emoji: emoji?.trim() || "🔥",
        admin_id: user.id,
        members: [{ user_id: user.id, joined_at: new Date().toISOString() }],
      })
      .select()
      .single();

    if (error) throw error;

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
      action: "join" | "log_completion" | "leave";
      invite_code?: string;
      group_id?: string;
    };

    const admin = createAdminClient();

    // ── Join ──────────────────────────────────────────────────────────────────
    if (action === "join" && invite_code) {
      const { data: group, error } = await admin
        .from("groups")
        .select("*")
        .eq("invite_code", invite_code.toUpperCase())
        .single();

      if (error || !group) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

      const members = (group.members as RawMember[]) ?? [];
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

    // ── Log completion ────────────────────────────────────────────────────────
    if (action === "log_completion" && group_id) {
      const { data: group } = await admin.from("groups").select("*").eq("id", group_id).single();
      if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

      const members = (group.members as RawMember[]) ?? [];
      const member = members.find((m) => m.user_id === user.id);
      if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

      member.completed_today = true;

      const allDone = members.every((m) => m.completed_today);
      const updates: Record<string, unknown> = { members };
      if (allDone) updates.group_streak = (group.group_streak ?? 0) + 1;

      await admin.from("groups").update(updates).eq("id", group_id);
      return NextResponse.json({ allDone, group_streak: allDone ? (group.group_streak ?? 0) + 1 : group.group_streak });
    }

    // ── Leave ─────────────────────────────────────────────────────────────────
    if (action === "leave" && group_id) {
      const { data: group } = await admin.from("groups").select("*").eq("id", group_id).single();
      if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

      const members = (group.members as RawMember[]) ?? [];
      const isAdmin = group.admin_id === user.id;

      if (isAdmin) {
        // Admin leaving — delete the group and clear group_id for all members
        const memberIds = members.map((m) => m.user_id);
        await Promise.all([
          admin.from("groups").delete().eq("id", group_id),
          admin.from("profiles").update({ group_id: null }).in("id", memberIds),
        ]);
      } else {
        // Regular member — remove from members array, clear own group_id
        const remaining = members.filter((m) => m.user_id !== user.id);
        await Promise.all([
          admin.from("groups").update({ members: remaining }).eq("id", group_id),
          admin.from("profiles").update({ group_id: null }).eq("id", user.id),
        ]);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[groups PATCH]", err);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
