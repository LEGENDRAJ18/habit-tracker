import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function daysAgo(n: number) {
  return toDateStr(new Date(Date.now() - n * 86400000));
}
function getStreak(dates: Set<string>): number {
  const today     = toDateStr(new Date());
  const yesterday = daysAgo(1);
  let cur: string | null = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null;
  if (!cur) return 0;
  let streak = 0;
  while (cur && dates.has(cur)) {
    streak++;
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    cur = toDateStr(prev);
  }
  return streak;
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
      const [{ data: authUser }, { data: logs }, { data: habits }] = await Promise.all([
        admin.auth.admin.getUserById(fid),
        admin.from("habit_logs").select("completed_at").eq("user_id", fid).gte("completed_at", since),
        admin.from("habits").select("id").eq("user_id", fid),
      ]);

      const email = authUser?.user?.email ?? "Unknown";
      const name = email.split("@")[0];
      const dates = new Set((logs ?? []).map((l: { completed_at: string }) => l.completed_at.split("T")[0]));
      const streak = getStreak(dates);
      const completions30 = (logs ?? []).length;
      const habitCount = (habits ?? []).length;

      return { id: fid, name, email, streak, completions30, habitCount };
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
