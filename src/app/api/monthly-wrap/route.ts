import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MonthlyWrapData } from "@/types";

const PERSONALITY_RULES: [RegExp, string][] = [
  [/morning|wake|early/i,             "Morning Champion 🌅"],
  [/run|gym|workout|exercise|fitness/i,"Fitness Warrior 💪"],
  [/read|book|study|learn/i,          "Knowledge Seeker 📚"],
  [/meditat|mindful|breath/i,         "Inner Peace Seeker 🧘"],
  [/journal|write|reflect/i,          "Self-Reflector ✍️"],
  [/diet|eat|food|meal/i,             "Nutrition Nerd 🥗"],
  [/water|hydrat/i,                   "Hydration Hero 💧"],
];

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile || profile.subscription_tier !== "pro") {
      return NextResponse.json({ error: "Monthly Wrapped is a Pro feature." }, { status: 403 });
    }

    // Determine last month's date range
    const now         = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey    = firstOfLastMonth.toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if wrap already exists
    const { data: existing } = await admin
      .from("monthly_wraps")
      .select("data")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .single();

    if (existing?.data) {
      return NextResponse.json({ wrap: existing.data });
    }

    // Fetch last month's habit logs
    const startStr = firstOfLastMonth.toISOString();
    const endStr   = firstOfThisMonth.toISOString();

    const [{ data: logs }, { data: habits }] = await Promise.all([
      admin.from("habit_logs")
        .select("habit_id, completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", startStr)
        .lt("completed_at", endStr),
      admin.from("habits")
        .select("id, name, created_at")
        .eq("user_id", user.id),
    ]);

    const allLogs     = logs ?? [];
    const allHabits   = habits ?? [];
    const totalCompletions = allLogs.length;

    if (totalCompletions === 0 && allHabits.length === 0) {
      return NextResponse.json({ wrap: null });
    }

    // Days in last month
    const daysInMonth = Math.round((firstOfThisMonth.getTime() - firstOfLastMonth.getTime()) / 86400000);

    // Consistency: unique days with at least one completion / days in month
    const uniqueDays = new Set(allLogs.map((l) => l.completed_at.split("T")[0])).size;
    const consistencyPct = Math.min(100, Math.round((uniqueDays / daysInMonth) * 100));

    // Best streak
    const allDates  = Array.from(new Set(allLogs.map((l) => l.completed_at.split("T")[0]))).sort();
    let bestStreak  = allDates.length > 0 ? 1 : 0;
    let curStreak   = bestStreak;
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) { curStreak++; bestStreak = Math.max(bestStreak, curStreak); }
      else curStreak = 1;
    }

    // Top habit (most completions last month)
    const habitCounts = new Map<string, number>();
    for (const log of allLogs) {
      habitCounts.set(log.habit_id, (habitCounts.get(log.habit_id) ?? 0) + 1);
    }
    const topHabitId = Array.from(habitCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topHabit   = allHabits.find((h) => h.id === topHabitId)?.name ?? (allHabits[0]?.name ?? "—");

    // XP (10 per completion as approximation)
    const totalXP = totalCompletions * 10;

    // Personality tags
    const tags = new Set<string>();
    for (const habit of allHabits) {
      for (const [pattern, tag] of PERSONALITY_RULES) {
        if (pattern.test(habit.name)) tags.add(tag);
      }
    }
    if (consistencyPct >= 80) tags.add("Consistency King 👑");
    if (bestStreak >= 14)     tags.add("Streak Legend 🔥");

    const wrap: MonthlyWrapData = {
      month: monthKey,
      totalCompletions,
      uniqueHabits: new Set(allLogs.map((l) => l.habit_id)).size,
      bestStreak,
      topHabit,
      consistencyPct,
      totalXP,
      personalityTags: Array.from(tags).slice(0, 5),
      biggestImprovement: null,
    };

    // Persist wrap
    await admin.from("monthly_wraps").upsert({
      user_id: user.id,
      month:   monthKey,
      data:    wrap,
    });

    return NextResponse.json({ wrap });
  } catch (err) {
    console.error("[monthly-wrap]", err);
    return NextResponse.json({ error: "Failed to generate wrap" }, { status: 500 });
  }
}
