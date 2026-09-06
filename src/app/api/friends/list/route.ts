import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAggregateOccurrenceStreak } from "@/lib/streaks";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function daysAgo(n: number) {
  return toDateStr(new Date(Date.now() - n * 86400000));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch accepted friendships in both directions
  const [{ data: sent }, { data: received }, { data: pending }] = await Promise.all([
    admin.from("friendships").select("addressee_id").eq("requester_id", user.id).eq("status", "accepted"),
    admin.from("friendships").select("requester_id").eq("addressee_id", user.id).eq("status", "accepted"),
    admin.from("friendships").select("requester_id").eq("addressee_id", user.id).eq("status", "pending"),
  ]);

  const friendIds = [
    ...((sent ?? []).map((r) => r.addressee_id)),
    ...((received ?? []).map((r) => r.requester_id)),
  ];

  const pendingIds = (pending ?? []).map((r) => r.requester_id);

  // Build stats for each friend
  const since = daysAgo(30);
  const friendStats = await Promise.all(
    friendIds.map(async (fid) => {
      const [{ data: authUser }, { data: logs }, { data: habits }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(fid),
        admin.from("habit_logs").select("completed_at").eq("user_id", fid).gte("completed_at", since),
        admin.from("habits").select("id, frequency, day_of_week").eq("user_id", fid),
        admin.from("profiles").select("username").eq("id", fid).maybeSingle(),
      ]);

      const email = authUser?.user?.email ?? "Unknown";
      const metaName =
        authUser?.user?.user_metadata?.full_name ??
        authUser?.user?.user_metadata?.name ??
        null;
      const name = metaName ?? email.split("@")[0];
      const username = profile?.username ?? null;
      const dates = new Set((logs ?? []).map((l: { completed_at: string }) => l.completed_at.split("T")[0]));
      // Aggregate across this friend's whole habit set (any habit counts as
      // "done" that day) — maxLookback matches the 30-day window the logs
      // above were actually fetched with, same effective ceiling as before.
      const streak = computeAggregateOccurrenceStreak(new Date(), dates, habits ?? [], 30);
      const completions30 = (logs ?? []).length;
      const habitCount = (habits ?? []).length;

      return { id: fid, name, email, username, streak, completions30, habitCount };
    }),
  );

  // Pending requester names
  const pendingFriends = await Promise.all(
    pendingIds.map(async (fid) => {
      const { data: authUser } = await admin.auth.admin.getUserById(fid);
      const email = authUser?.user?.email ?? "Unknown";
      return { id: fid, name: email.split("@")[0], email };
    }),
  );

  return NextResponse.json({
    friends: friendStats.sort((a, b) => b.streak - a.streak),
    pending: pendingFriends,
  });
}
