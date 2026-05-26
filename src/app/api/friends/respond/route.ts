import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushNotify } from "@/lib/pushNotify";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requesterId, action } = await req.json();
  if (!requesterId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (action === "reject") {
    await admin
      .from("friendships")
      .delete()
      .eq("requester_id", requesterId)
      .eq("addressee_id", user.id);
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Push the requester to let them know their request was accepted
  const { data: acceptorProfile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  const acceptorName = acceptorProfile?.username ?? "Someone";
  void pushNotify(admin, requesterId, {
    title: "🎉 Friend request accepted!",
    body:  `${acceptorName} accepted your friend request. You're now friends on HabitAI!`,
    tag:   `friend-accept-${user.id}`,
    url:   "/friends",
  }, "friend");

  return NextResponse.json({ ok: true });
}
