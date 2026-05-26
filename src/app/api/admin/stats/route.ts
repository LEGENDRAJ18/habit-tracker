import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = ["mannrajsj@gmail.com", "surjeetsj@gmail.com"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Start of today in UTC (ISO date string → Supabase interprets as midnight UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Build 7-day window start times (UTC midnight)
  const weekStarts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString();
  });

  const [
    totalUsersRes,
    todayUsersRes,
    totalHabitsRes,
    freeTierRes,
    plusTierRes,
    proTierRes,
    todayCompletionsRes,
    activeBattlesRes,
    orgsRes,
    ...weeklySignupRess
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    admin.from("habits").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("subscription_tier", "free"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("subscription_tier", "plus"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("subscription_tier", "pro"),
    admin.from("habit_logs").select("*", { count: "exact", head: true }).gte("completed_at", todayISO),
    admin.from("battles").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("organisations").select("*", { count: "exact", head: true }),
    // One query per day: count profiles created in [dayStart, nextDayStart)
    ...weekStarts.map((start, i) => {
      const end = weekStarts[i + 1] ?? new Date(Date.now() + 86400000).toISOString();
      return admin.from("profiles").select("*", { count: "exact", head: true })
        .gte("created_at", start).lt("created_at", end);
    }),
  ]);

  const weeklySignups = weeklySignupRess.map((r, i) => ({
    date: weekStarts[i].split("T")[0],
    count: r.count ?? 0,
  }));

  return NextResponse.json({
    totalUsers:       totalUsersRes.count       ?? 0,
    todayUsers:       todayUsersRes.count       ?? 0,
    totalHabits:      totalHabitsRes.count      ?? 0,
    todayCompletions: todayCompletionsRes.count ?? 0,
    activeBattles:    activeBattlesRes.count    ?? 0,
    orgsCount:        orgsRes.count             ?? 0,
    tiers: {
      free: freeTierRes.count ?? 0,
      plus: plusTierRes.count ?? 0,
      pro:  proTierRes.count  ?? 0,
    },
    weeklySignups,
    updatedAt: new Date().toISOString(),
  });
}
