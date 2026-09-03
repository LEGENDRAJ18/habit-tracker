import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MonthlyWrapData } from "@/types";
import { computeOccurrencesInRange } from "@/lib/streaks";

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
        .select("id, name, created_at, frequency, day_of_week")
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

    // Consistency: unique days with at least one completion / possible days.
    // "Possible days" is daysInMonth whenever any daily habit exists — a
    // daily habit alone can cover every day regardless of what weekly
    // habits are doing, so the plain daysInMonth denominator is already
    // correct there (byte-identical to the original calc). It's only wrong
    // for a user whose habits are ALL weekly, where daysInMonth structurally
    // caps consistency at ~7/30 even for someone who never misses a
    // scheduled day — for that case, the denominator narrows to the days in
    // the month that actually matched one of their habits' day_of_week.
    const uniqueDays = new Set(allLogs.map((l) => l.completed_at.split("T")[0])).size;
    const hasDailyHabit = allHabits.some((h) => h.frequency !== "weekly");
    let possibleDays = daysInMonth;
    if (!hasDailyHabit && allHabits.length > 0) {
      const scheduledDows = new Set(allHabits.map((h) => h.day_of_week).filter((d): d is number => d != null));
      let matchingDays = 0;
      for (let t = firstOfLastMonth.getTime(); t < firstOfThisMonth.getTime(); t += 86400000) {
        if (scheduledDows.has(new Date(t).getUTCDay())) matchingDays++;
      }
      if (matchingDays > 0) possibleDays = matchingDays;
    }
    const consistencyPct = Math.min(100, Math.round((uniqueDays / possibleDays) * 100));

    // Best streak (aggregate: any habit done that day, consecutive calendar
    // days). Deliberately left as a calendar-day streak, not fixed to the
    // per-habit occurrence pattern used elsewhere — this is a different
    // metric shape (aggregate across all of a user's habits, not one
    // habit's own rate against its own schedule), and a correct fix would
    // require merging multiple habits' different day_of_week schedules into
    // one "was anything due today" timeline, which is a bigger redesign
    // than this pass covers. Flagged, not fixed: an all-weekly habit set
    // will rarely show a bestStreak above 1 today.
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

    // Top habit: scored by each habit's own occurrence-rate over the month
    // (hits / possible occurrences), not raw completion count — a weekly
    // habit has at most ~4-5 possible completions in a month vs. a daily
    // habit's ~30, so raw-count comparison structurally favored daily
    // habits even when the weekly one was completed perfectly every time.
    const doneDatesByHabit = new Map<string, Set<string>>();
    for (const log of allLogs) {
      const d = log.completed_at.split("T")[0];
      if (!doneDatesByHabit.has(log.habit_id)) doneDatesByHabit.set(log.habit_id, new Set());
      doneDatesByHabit.get(log.habit_id)!.add(d);
    }
    let topHabit = allHabits[0]?.name ?? "—";
    let topRate  = -1;
    for (const habit of allHabits) {
      const dates = doneDatesByHabit.get(habit.id) ?? new Set<string>();
      const { possible, hits } = computeOccurrencesInRange(firstOfLastMonth, firstOfThisMonth, dates, habit.frequency, habit.day_of_week);
      const rate = possible > 0 ? hits / possible : 0;
      if (rate > topRate) { topRate = rate; topHabit = habit.name; }
    }

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
