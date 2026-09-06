import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeOccurrenceHits, computeOccurrenceStreak, getCycleDays } from "@/lib/streaks";

// How many of a habit's own last scheduled occurrences to score against —
// 7 calendar days for daily, 7 completions of its own day_of_week (spanning
// ~7 weeks) for weekly. Same window/reasoning as ai-insight's rate7d and
// weekly-report's weak-spot fix: a flat "/7 days" assumes every habit is
// due daily, so a weekly habit completed exactly as scheduled still read as
// badly underperforming in this prompt.
const OCCURRENCE_WINDOW = 7;

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

async function generatePlan(
  habits: { name: string; rate: number; streak: number }[],
  goals: string[],
): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a habit coach. Generate a personalised weekly game plan.

User's habits and recent performance (last ${OCCURRENCE_WINDOW} scheduled occurrences — daily habits are checked over the last ${OCCURRENCE_WINDOW} days, weekly habits over their last ${OCCURRENCE_WINDOW} scheduled days):
${habits.map((h) => `- "${h.name}": completed ${h.rate}/${OCCURRENCE_WINDOW} occurrences, current streak ${h.streak}`).join("\n")}

User's goals: ${goals.length > 0 ? goals.join(", ") : "general wellbeing"}

Return ONLY a JSON array of 4–5 specific, actionable daily actions for this week. Each action should be 1 concise sentence (max 15 words). Focus on what needs the most attention.

Example format: ["Focus on doing X every morning before breakfast", "Set a 9 PM alarm as a reminder for Y"]`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a concise habit coach. Respond ONLY with a valid JSON array of strings." },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const arr = Array.isArray(parsed) ? parsed : parsed.actions ?? parsed.plan ?? Object.values(parsed)[0];
    if (!Array.isArray(arr)) return null;
    return (arr as unknown[]).filter((x) => typeof x === "string").slice(0, 5) as string[];
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = getWeekStart();
  const { data } = await supabase
    .from("weekly_plans")
    .select("actions, created_at")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  return NextResponse.json({ plan: data ?? null, weekStart });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pro-only
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier !== "pro") {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const weekStart = getWeekStart();
  // A weekly habit's last 7 scheduled occurrences can span ~7 weeks, so the
  // logs query needs to look back further than a plain 7-day window —
  // otherwise a weekly habit's occurrence history outside the last 7
  // calendar days is invisible and it scores as if never done. Same fix
  // shape as weekly-report's occurrenceLookback.
  const occurrenceLookback = new Date(Date.now() - OCCURRENCE_WINDOW * 7 * 86400000).toISOString().split("T")[0];

  const admin = createAdminClient();
  const [{ data: habits }, { data: logs }, { data: profileData }] = await Promise.all([
    admin.from("habits").select("id, name, frequency, day_of_week").eq("user_id", user.id),
    admin.from("habit_logs")
      .select("habit_id, completed_at")
      .eq("user_id", user.id)
      .gte("completed_at", occurrenceLookback),
    admin.from("profiles").select("goals").eq("id", user.id).single(),
  ]);

  if (!habits || habits.length === 0) {
    return NextResponse.json({ error: "No habits found" }, { status: 400 });
  }

  const logsArr = logs ?? [];
  const now = new Date();

  // Rate and streak scored against each habit's own scheduled occurrences,
  // not a flat "last 7 calendar days" — see OCCURRENCE_WINDOW above.
  const habitData = habits.map((h) => {
    const doneDates = new Set(
      logsArr.filter((l) => l.habit_id === h.id).map((l) => l.completed_at.split("T")[0]),
    );
    const rate = computeOccurrenceHits(now, doneDates, h.frequency, h.day_of_week, OCCURRENCE_WINDOW);
    // maxLookback in calendar days, scaled by cycle length so a daily habit
    // still walks exactly 7 days back (byte-identical to the old cap) while
    // a weekly habit gets the full 49-day window it needs for 7 occurrences.
    const streak = computeOccurrenceStreak(now, doneDates, h.frequency, h.day_of_week, OCCURRENCE_WINDOW * getCycleDays(h));
    return { name: h.name, rate, streak };
  });

  const goals: string[] = Array.isArray(profileData?.goals) ? profileData.goals : [];
  const actions = await generatePlan(habitData, goals);

  if (!actions) {
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }

  await supabase
    .from("weekly_plans")
    .upsert(
      { user_id: user.id, week_start: weekStart, actions, created_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" },
    );

  return NextResponse.json({ plan: { actions, created_at: new Date().toISOString() }, weekStart });
}
