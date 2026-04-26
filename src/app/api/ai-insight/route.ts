import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Per-instance in-memory rate limit (resets on cold start; good enough for MVP)
const rateLimitMap = new Map<string, { date: string; count: number }>();
const DAILY_LIMIT = 5;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split("T")[0];
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.date !== today) {
    rateLimitMap.set(userId, { date: today, count: 1 });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }
  if (entry.count >= DAILY_LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: DAILY_LIMIT - entry.count };
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.75,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

function getStreak(dates: Set<string>): number {
  const today     = daysAgo(0);
  const yesterday = daysAgo(1);
  const start     = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null;
  if (!start) return 0;
  let streak = 0;
  let offset = start === today ? 0 : 1;
  while (dates.has(daysAgo(offset))) {
    streak++;
    offset++;
  }
  return streak;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit
    const { allowed, remaining } = checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "You've used all 5 AI insights for today. Come back tomorrow!" },
        { status: 429 },
      );
    }

    const body = await request.json() as {
      mode?: string;
      missedHabitName?: string;
      brokenHabitName?: string;
    };
    const { mode = "coaching", missedHabitName, brokenHabitName } = body;

    // Fetch user data server-side
    const admin = createAdminClient();

    const [{ data: habits }, { data: rawLogs }, { data: profile }] = await Promise.all([
      admin.from("habits").select("id, name, habit_strength, created_at").eq("user_id", user.id).order("created_at"),
      admin.from("habit_logs").select("habit_id, completed_at").eq("user_id", user.id).gte("completed_at", daysAgo(30)),
      admin.from("profiles").select("goal, tier").eq("id", user.id).single(),
    ]);

    if (!habits || habits.length === 0) {
      return NextResponse.json({ error: "No habits to analyze yet" }, { status: 400 });
    }

    const logs = rawLogs ?? [];

    // Compute per-habit streaks and 7-day rates
    const habitLogMap = new Map<string, Set<string>>();
    for (const log of logs) {
      const d = log.completed_at.split("T")[0];
      if (!habitLogMap.has(log.habit_id)) habitLogMap.set(log.habit_id, new Set());
      habitLogMap.get(log.habit_id)!.add(d);
    }

    const habitSummaries = habits.map((h) => {
      const dates  = habitLogMap.get(h.id) ?? new Set<string>();
      const streak = getStreak(dates);
      const last7  = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
      const rate7d = Math.round((last7.filter((d) => dates.has(d)).length / 7) * 100);
      return { name: h.name, strength: h.habit_strength ?? 10, streak, rate7d };
    });

    const totalCompletions = logs.length;
    const goal = profile?.goal ?? null;

    // ── COACHING ──────────────────────────────────────────────────────────────
    if (mode === "coaching") {
      const systemPrompt = `You are an expert habit coach. Analyze the user's habit data and provide personalized, actionable insights. Be warm, specific, and encouraging. Always respond with valid JSON matching this exact schema:
{
  "struggling": "1-2 sentence explanation of what the data reveals about their main challenge",
  "fixes": ["specific fix 1", "specific fix 2", "specific fix 3"],
  "encouragement": "1-2 personalized encouraging sentences referencing their actual progress"
}`;

      const userPrompt = `User's goal: ${goal ?? "not set"}
Total habit completions (30 days): ${totalCompletions}

Their habits:
${habitSummaries.map((h) => `- "${h.name}": ${h.rate7d}% completion this week, ${h.streak}-day streak, strength ${h.strength}/100`).join("\n")}

Give them coaching based on this real data.`;

      const result = await callOpenAI(systemPrompt, userPrompt);
      return NextResponse.json({ mode: "coaching", remaining, ...result });
    }

    // ── DAILY CHECK-IN ────────────────────────────────────────────────────────
    if (mode === "checkin") {
      const habitName = missedHabitName ?? habits[0].name;
      const systemPrompt = `You are a supportive habit coach. The user missed a habit yesterday. Give a short, practical suggestion. Respond with valid JSON:
{
  "suggestion": "2-3 sentences max: acknowledge it gently, give ONE specific actionable tip for today"
}`;

      const userPrompt = `User missed "${habitName}" yesterday.
Their goal: ${goal ?? "not set"}
Current streak for this habit: ${habitSummaries.find((h) => h.name === habitName)?.streak ?? 0} days.
7-day completion rate: ${habitSummaries.find((h) => h.name === habitName)?.rate7d ?? 0}%.`;

      const result = await callOpenAI(systemPrompt, userPrompt);
      return NextResponse.json({ mode: "checkin", remaining, ...result });
    }

    // ── STREAK ANALYSIS ───────────────────────────────────────────────────────
    if (mode === "streak_analysis") {
      const habitName = brokenHabitName ?? habits[0].name;

      // Find which days of the week they most often miss this habit
      const habitId   = habits.find((h) => h.name === habitName)?.id;
      const dates     = habitId ? (habitLogMap.get(habitId) ?? new Set<string>()) : new Set<string>();
      const dayNames  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const missedDayCounts: Record<string, number> = {};
      for (let i = 1; i <= 30; i++) {
        const d = daysAgo(i);
        if (!dates.has(d)) {
          const dayName = dayNames[new Date(d + "T12:00:00").getDay()];
          missedDayCounts[dayName] = (missedDayCounts[dayName] ?? 0) + 1;
        }
      }
      const worstDay = Object.entries(missedDayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "weekends";

      const systemPrompt = `You are a habit recovery coach. A user just broke their streak. Be empathetic but practical. Respond with valid JSON:
{
  "pattern": "1 sentence describing the pattern you see in their data (mention the specific day they struggle most)",
  "recoverySteps": ["step 1 - specific and actionable", "step 2 - specific and actionable", "step 3 - specific and actionable"]
}`;

      const userPrompt = `Habit: "${habitName}"
They most often miss it on: ${worstDay}
Overall goal: ${goal ?? "not set"}
Their 7-day completion rate was: ${habitSummaries.find((h) => h.name === habitName)?.rate7d ?? 0}%
Give a recovery plan.`;

      const result = await callOpenAI(systemPrompt, userPrompt);
      return NextResponse.json({ mode: "streak_analysis", remaining, ...result });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("[ai-insight]", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "AI service unavailable" },
      { status: 500 },
    );
  }
}
