import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function daysAgo(n: number) {
  return toDateStr(new Date(Date.now() - n * 86400000));
}

// GET /api/friends/profile/[id]
// Returns friend's public profile — only if caller and id are accepted friends
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createAdminClient();

  // Verify friendship
  const { data: friendship } = await admin
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`,
    )
    .limit(1)
    .maybeSingle();

  if (!friendship) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  // Fetch profile, auth user, public habits, and recent logs in parallel
  const since7 = daysAgo(7);
  const [
    { data: profile },
    { data: authUser },
    { data: habits },
    { data: logs },
  ] = await Promise.all([
    admin.from("profiles").select("id, email, username, level, xp").eq("id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from("habits").select("id, name, category").eq("user_id", id).eq("is_public", true),
    admin.from("habit_logs").select("completed_at").eq("user_id", id).gte("completed_at", since7),
  ]);

  // Name resolution
  const metaName =
    authUser?.user?.user_metadata?.full_name ??
    authUser?.user?.user_metadata?.name ??
    null;
  const email = profile?.email ?? authUser?.user?.email ?? "";
  const name = metaName ?? (email ? email.split("@")[0] : "Unknown");

  // Streak calculation (from logs over last 30 days)
  const { data: logsStreak } = await admin
    .from("habit_logs")
    .select("completed_at")
    .eq("user_id", id)
    .gte("completed_at", daysAgo(30));

  const dateDays = new Set(
    (logsStreak ?? []).map((l: { completed_at: string }) => l.completed_at.split("T")[0]),
  );
  const today = toDateStr(new Date());
  const yesterday = daysAgo(1);
  let cur: string | null = dateDays.has(today) ? today : dateDays.has(yesterday) ? yesterday : null;
  let streak = 0;
  while (cur && dateDays.has(cur)) {
    streak++;
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    cur = toDateStr(prev);
  }

  // Weekly % (last 7 days completions / (habits_count * 7))
  const publicHabitCount = (habits ?? []).length;
  const weeklyCompletions = (logs ?? []).length;
  const weeklyPct =
    publicHabitCount > 0
      ? Math.round((weeklyCompletions / (publicHabitCount * 7)) * 100)
      : 0;

  return NextResponse.json({
    profile: {
      id,
      name,
      username: profile?.username ? `@${profile.username}` : null,
      level: profile?.level ?? 1,
      xp: profile?.xp ?? 0,
      streak,
      weeklyPct,
      habits: (habits ?? []).map((h: { id: string; name: string; category: string }) => ({
        id: h.id,
        name: h.name,
        category: h.category,
      })),
    },
  });
}
