import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

User's habits and recent performance (last 7 days):
${habits.map((h) => `- "${h.name}": completed ${h.rate}/7 days, current streak ${h.streak} days`).join("\n")}

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
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const admin = createAdminClient();
  const [{ data: habits }, { data: logs }, { data: profileData }] = await Promise.all([
    admin.from("habits").select("id, name").eq("user_id", user.id),
    admin.from("habit_logs")
      .select("habit_id, completed_at")
      .eq("user_id", user.id)
      .gte("completed_at", sevenDaysAgo),
    admin.from("profiles").select("goals").eq("id", user.id).single(),
  ]);

  if (!habits || habits.length === 0) {
    return NextResponse.json({ error: "No habits found" }, { status: 400 });
  }

  const logsArr = logs ?? [];

  // Compute 7-day rate and streak for each habit
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const habitData = habits.map((h) => {
    const habitLogs = logsArr
      .filter((l) => l.habit_id === h.id)
      .map((l) => l.completed_at.split("T")[0])
      .sort()
      .reverse();
    const rate = habitLogs.length;
    let streak = 0;
    if (habitLogs[0] === today || habitLogs[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < habitLogs.length; i++) {
        const prev = new Date(habitLogs[i - 1]);
        const curr = new Date(habitLogs[i]);
        if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
        else break;
      }
    }
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
