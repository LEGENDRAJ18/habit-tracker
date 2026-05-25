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
      max_tokens: 1000,
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

    const body = await request.json() as {
      mode?: string;
      missedHabitName?: string;
      brokenHabitName?: string;
    };
    const { mode = "coaching", missedHabitName, brokenHabitName } = body;

    // Fetch user data server-side
    const admin = createAdminClient();

    // Memory mode — Pro only, fetch and update AI memory
    if (mode === "memory_coaching") {
      const { data: tierData } = await admin.from("profiles").select("subscription_tier").eq("id", user.id).single();
      if (!["plus", "pro"].includes(tierData?.subscription_tier ?? "free")) {
        return NextResponse.json({ error: "Memory coaching is a Pro feature." }, { status: 403 });
      }
    }

    const [{ data: habits }, { data: rawLogs }, { data: profile }] = await Promise.all([
      admin.from("habits").select("id, name, habit_strength, created_at").eq("user_id", user.id).order("created_at"),
      admin.from("habit_logs").select("habit_id, completed_at").eq("user_id", user.id).gte("completed_at", daysAgo(90)),
      admin.from("profiles").select("goal, goals, subscription_tier, ai_memory").eq("id", user.id).single(),
    ]);

    // Tier gate — free users cannot use AI insights
    const userTier = (profile?.subscription_tier ?? "free") as "free" | "plus" | "pro";
    if (userTier === "free") {
      return NextResponse.json(
        { error: "AI coaching is a Plus & Pro feature. Upgrade to unlock personalised insights." },
        { status: 403 },
      );
    }

    // Rate limit — Plus: 5/day, Pro: unlimited
    let remaining = 9999;
    if (userTier === "plus") {
      const { allowed, remaining: rem } = checkRateLimit(user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: "You've used all 5 AI insights for today. Come back tomorrow, or upgrade to Pro for unlimited insights!" },
          { status: 429 },
        );
      }
      remaining = rem;
    }

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
    const userGoals: string[] =
      Array.isArray(profile?.goals) && (profile.goals as string[]).length > 0
        ? (profile.goals as string[])
        : profile?.goal ? [profile.goal] : [];
    const goalsText = userGoals.length > 0 ? userGoals.join(", ") : "not set";

    // Detect potentially addictive/harmful habit keywords
    const HARMFUL_KEYWORDS = ["smok", "vap", "nicotine", "alcohol", "drink", "gambling", "bet", "drug", "phone addic", "social media addic", "scroll", "reels", "tiktok", "porn", "junk food", "binge"];
    const hasHarmfulHabit = habits.some((h) =>
      HARMFUL_KEYWORDS.some((kw) => h.name.toLowerCase().includes(kw))
    );

    // ── COACHING ──────────────────────────────────────────────────────────────
    if (mode === "coaching") {
      const systemPrompt = `You are an expert habit coach with deep knowledge of behavioral science, addiction recovery, and habit formation. Analyze the user's habit data and provide personalized, actionable insights. Be warm, specific, and encouraging.

${hasHarmfulHabit ? "IMPORTANT: One or more habits involve addiction or harmful behaviors. Include evidence-based recovery strategies in the plan and populate helpResources with 2-3 real, well-known support resources." : ""}

Always respond with valid JSON matching this exact schema:
{
  "struggling": "1-2 sentence explanation of what the data reveals about their main challenge",
  "fixes": ["specific fix 1", "specific fix 2", "specific fix 3"],
  "encouragement": "1-2 personalized encouraging sentences referencing their actual progress",
  "sevenDayPlan": [
    {"day": 1, "action": "short, specific action (max 12 words)"},
    {"day": 2, "action": "short, specific action (max 12 words)"},
    {"day": 3, "action": "short, specific action (max 12 words)"},
    {"day": 4, "action": "short, specific action (max 12 words)"},
    {"day": 5, "action": "short, specific action (max 12 words)"},
    {"day": 6, "action": "short, specific action (max 12 words)"},
    {"day": 7, "action": "short, specific action (max 12 words)"}
  ]${hasHarmfulHabit ? `,
  "helpResources": [
    {"name": "resource name", "url": "https://...", "desc": "one-line description"}
  ]` : `,
  "helpResources": []`}
}`;

      const userPrompt = `User's goals: ${goalsText}
Total habit completions (30 days): ${totalCompletions}

Their habits:
${habitSummaries.map((h) => `- "${h.name}": ${h.rate7d}% completion this week, ${h.streak}-day streak, strength ${h.strength}/100`).join("\n")}

Build a realistic 7-day recovery/improvement plan starting from where they are now. Each day should build on the previous one.`;

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
Their goals: ${goalsText}
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
Overall goals: ${goalsText}
Their 7-day completion rate was: ${habitSummaries.find((h) => h.name === habitName)?.rate7d ?? 0}%
Give a recovery plan.`;

      const result = await callOpenAI(systemPrompt, userPrompt);
      return NextResponse.json({ mode: "streak_analysis", remaining, ...result });
    }

    // ── DEEP MEMORY COACHING (Pro) ────────────────────────────────────────────
    if (mode === "memory_coaching") {
      const memory = (Array.isArray(profile?.ai_memory) ? profile.ai_memory : []) as Array<{
        date: string; summary: string; patterns: string[];
      }>;

      const memoryContext = memory.slice(-3).map((m) =>
        `Session on ${m.date}: ${m.summary}. Patterns: ${m.patterns.join(", ")}`
      ).join("\n");

      const systemPrompt = `You are an AI coach who deeply knows this user. You remember their past sessions and can call out recurring patterns — gently but honestly.

${memory.length > 0 ? `PAST SESSIONS:\n${memoryContext}` : "This is the first coaching session."}

Respond with valid JSON:
{
  "struggling": "1-2 sentences referencing past patterns if applicable",
  "fixes": ["specific fix 1", "specific fix 2", "specific fix 3"],
  "encouragement": "1-2 sentences that reference something specific from their journey",
  "patternInsight": "1 sentence calling out a recurring pattern you've noticed (null if first session)",
  "sevenDayPlan": [
    {"day": 1, "action": "specific action"},
    {"day": 2, "action": "specific action"},
    {"day": 3, "action": "specific action"},
    {"day": 4, "action": "specific action"},
    {"day": 5, "action": "specific action"},
    {"day": 6, "action": "specific action"},
    {"day": 7, "action": "specific action"}
  ]
}`;

      const userPrompt = `User's goals: ${goalsText}
Total completions (90 days): ${totalCompletions}
Habits: ${habitSummaries.map((h) => `"${h.name}": ${h.rate7d}% this week, ${h.streak}-day streak`).join("; ")}

Give deep personalized coaching, referencing what you know about this user.`;

      const result = await callOpenAI(systemPrompt, userPrompt) as Record<string, unknown> & {
        struggling?: string; patternInsight?: string;
      };

      // Save session to memory
      const newMemory = {
        date: new Date().toISOString().split("T")[0],
        summary: (result.struggling ?? "Session completed") as string,
        patterns: habitSummaries
          .filter((h) => h.rate7d < 40)
          .map((h) => `struggles with "${h.name}" on ${h.rate7d}% of days`),
      };
      const updatedMemory = [...memory.slice(-9), newMemory];
      void admin.from("profiles").update({ ai_memory: updatedMemory }).eq("id", user.id);

      return NextResponse.json({ mode: "memory_coaching", remaining, ...result });
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
