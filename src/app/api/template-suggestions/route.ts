import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TemplateSuggestion {
  emoji: string;
  name: string;
  category: string;
  reason: string;
}

const GOAL_TEMPLATES: Record<string, TemplateSuggestion[]> = {
  fitness: [
    { emoji: "💪", name: "Do 20 pushups every morning", category: "Fitness", reason: "Builds upper-body strength in under 2 minutes" },
    { emoji: "🚶", name: "Walk 10,000 steps daily", category: "Fitness", reason: "The gold standard for daily movement" },
    { emoji: "🧘", name: "Stretch for 10 minutes after waking", category: "Fitness", reason: "Reduces injury risk and improves flexibility" },
    { emoji: "💧", name: "Drink 2 litres of water daily", category: "Fitness", reason: "Hydration is the simplest performance boost" },
    { emoji: "🏃", name: "Run for 20 minutes every morning", category: "Fitness", reason: "Cardio consistency beats intensity" },
    { emoji: "🥗", name: "Eat a vegetable with every meal", category: "Fitness", reason: "The simplest nutrition upgrade" },
  ],
  learning: [
    { emoji: "📚", name: "Read for 20 minutes before bed", category: "Learning", reason: "20 pages a day = 15 books a year" },
    { emoji: "💻", name: "Practice coding for 30 minutes", category: "Learning", reason: "Daily practice compounds into mastery" },
    { emoji: "🎧", name: "Listen to 1 educational podcast episode", category: "Learning", reason: "Turn commute time into learning time" },
    { emoji: "✍️", name: "Review notes for 15 minutes after studying", category: "Learning", reason: "Spaced repetition doubles retention" },
    { emoji: "🧠", name: "Study flashcards for 15 minutes daily", category: "Learning", reason: "Active recall is the fastest way to retain facts" },
    { emoji: "📝", name: "Write a summary of what you learned today", category: "Learning", reason: "Teaching is the deepest form of learning" },
  ],
  mindfulness: [
    { emoji: "🧘", name: "Meditate for 10 minutes every morning", category: "Mindfulness", reason: "10 minutes reduces cortisol and sharpens focus" },
    { emoji: "📔", name: "Write 3 gratitude entries before bed", category: "Mindfulness", reason: "Rewires brain toward positivity over time" },
    { emoji: "🌬️", name: "Do 5 minutes of deep breathing at noon", category: "Mindfulness", reason: "Midday reset lowers anxiety" },
    { emoji: "📵", name: "No phone for 1 hour after waking", category: "Mindfulness", reason: "Starts the day with intention, not reaction" },
    { emoji: "🌿", name: "Spend 10 minutes in nature each day", category: "Mindfulness", reason: "Nature exposure measurably reduces stress" },
    { emoji: "🛁", name: "Take a 10-minute mindful shower", category: "Mindfulness", reason: "Turns a daily task into a reset ritual" },
  ],
  sleep: [
    { emoji: "📵", name: "No screens 30 minutes before bed", category: "Sleep", reason: "Blue light suppresses melatonin production" },
    { emoji: "🌙", name: "Be in bed by 10:30pm every night", category: "Sleep", reason: "Consistent bedtime regulates circadian rhythm" },
    { emoji: "☀️", name: "Get sunlight within 30 minutes of waking", category: "Sleep", reason: "Morning light sets your sleep clock for the night" },
    { emoji: "🍵", name: "No caffeine after 2pm", category: "Sleep", reason: "Caffeine has a 6-hour half-life" },
    { emoji: "📖", name: "Read fiction for 20 minutes before sleeping", category: "Sleep", reason: "Reading reduces pre-sleep anxiety better than screens" },
    { emoji: "🧴", name: "Do a 5-minute bedtime wind-down routine", category: "Sleep", reason: "Signals to your brain that sleep is coming" },
  ],
  nutrition: [
    { emoji: "🥗", name: "Eat vegetables with every meal", category: "Nutrition", reason: "The simplest nutrition upgrade" },
    { emoji: "🍽️", name: "No phone during meals", category: "Nutrition", reason: "Mindful eating improves digestion and satisfaction" },
    { emoji: "🚫", name: "No snacking after 8pm", category: "Nutrition", reason: "Evening fasting improves metabolic health" },
    { emoji: "💧", name: "Drink a glass of water before each meal", category: "Nutrition", reason: "Reduces overeating by 20%" },
    { emoji: "🥣", name: "Eat a protein-rich breakfast every morning", category: "Nutrition", reason: "Protein at breakfast reduces cravings all day" },
    { emoji: "🍎", name: "Eat fruit as the only snack today", category: "Nutrition", reason: "Simple swap that removes 200+ empty calories" },
  ],
  career: [
    { emoji: "🎯", name: "Do 90 minutes of deep work before noon", category: "Productivity", reason: "Morning hours = peak cognitive performance" },
    { emoji: "📝", name: "Write tomorrow's top 3 tasks the night before", category: "Productivity", reason: "Eliminates morning decision fatigue" },
    { emoji: "📥", name: "Process inbox to zero every day", category: "Productivity", reason: "Clears mental overhead and reduces anxiety" },
    { emoji: "🚫", name: "No meetings before 10am", category: "Productivity", reason: "Protects your highest-focus morning hours" },
    { emoji: "📋", name: "Do a 10-minute weekly review every Friday", category: "Productivity", reason: "Weekly reviews compound career progress" },
    { emoji: "⏱️", name: "Use the Pomodoro technique for 2 sessions daily", category: "Productivity", reason: "Structured sprints beat unstructured hours" },
  ],
  finance: [
    { emoji: "💰", name: "Review spending for 5 minutes each evening", category: "Finance", reason: "Awareness is the first step to saving more" },
    { emoji: "📊", name: "Check investment portfolio once per week", category: "Finance", reason: "Regular reviews prevent emotional decisions" },
    { emoji: "🛒", name: "Wait 24 hours before any non-essential purchase", category: "Finance", reason: "Eliminates 80% of impulse buys" },
    { emoji: "📱", name: "Track daily expenses in an app", category: "Finance", reason: "What gets tracked gets managed" },
    { emoji: "💳", name: "Pay off credit card balance every week", category: "Finance", reason: "Prevents interest from silently draining wealth" },
    { emoji: "🏦", name: "Transfer 10% of income to savings on payday", category: "Finance", reason: "Paying yourself first is the oldest wealth rule" },
  ],
  relationships: [
    { emoji: "📞", name: "Call or text a friend or family member daily", category: "Social", reason: "Relationships need regular maintenance" },
    { emoji: "🎧", name: "Practice active listening in one conversation today", category: "Social", reason: "The rarest and most valued social skill" },
    { emoji: "🤝", name: "Do one kind thing for someone each day", category: "Social", reason: "Kindness is a learnable daily habit" },
    { emoji: "📅", name: "Schedule a social plan every week", category: "Social", reason: "Planned connection beats hoping it happens" },
    { emoji: "✉️", name: "Send a thoughtful message to someone daily", category: "Social", reason: "Small gestures maintain strong bonds" },
    { emoji: "🙏", name: "Express appreciation to someone each day", category: "Social", reason: "Gratitude expressed strengthens every relationship" },
  ],
  creativity: [
    { emoji: "🎨", name: "Create something for 20 minutes daily", category: "Creativity", reason: "Output compounds: the more you make, the better you get" },
    { emoji: "📓", name: "Fill one journal page every morning", category: "Creativity", reason: "Morning pages unlock ideas trapped in your mind" },
    { emoji: "🌍", name: "Learn one new thing about a topic you love", category: "Creativity", reason: "Curiosity feeds creative work" },
    { emoji: "🎵", name: "Practice your instrument for 15 minutes", category: "Creativity", reason: "15 minutes daily beats 2 hours weekly" },
    { emoji: "📸", name: "Take one intentional photo each day", category: "Creativity", reason: "Photography trains your eye to see beauty" },
    { emoji: "🖊️", name: "Write 200 words of creative writing daily", category: "Creativity", reason: "Volume builds the skill that inspiration can't" },
  ],
  breaking: [
    { emoji: "📵", name: "No social media before noon", category: "Digital Detox", reason: "Starts the day with your own agenda" },
    { emoji: "🌅", name: "No phone for first 30 minutes after waking", category: "Digital Detox", reason: "Builds a morning routine that belongs to you" },
    { emoji: "⏱️", name: "Set a 1-hour daily social media limit", category: "Digital Detox", reason: "Awareness of usage is the first step to breaking it" },
    { emoji: "🚭", name: "Go smoke-free for the full day", category: "Breaking Bad", reason: "Each smoke-free day rewires the craving response" },
    { emoji: "🍷", name: "Skip alcohol entirely today", category: "Breaking Bad", reason: "One day at a time is the proven path" },
    { emoji: "☕", name: "Limit caffeine to 1 cup before noon", category: "Breaking Bad", reason: "Reducing caffeine improves sleep without cold turkey" },
  ],
};

function getFallbackSuggestions(goals: string[], existingNames: Set<string>): TemplateSuggestion[] {
  const goalKeys = goals.map((g) => {
    const lower = g.toLowerCase();
    if (lower.includes("fit") || lower.includes("health") || lower.includes("exercise")) return "fitness";
    if (lower.includes("learn") || lower.includes("study") || lower.includes("education")) return "learning";
    if (lower.includes("mind") || lower.includes("well") || lower.includes("mental")) return "mindfulness";
    if (lower.includes("sleep") || lower.includes("rest") || lower.includes("recovery")) return "sleep";
    if (lower.includes("nutri") || lower.includes("diet") || lower.includes("food")) return "nutrition";
    if (lower.includes("career") || lower.includes("product") || lower.includes("work")) return "career";
    if (lower.includes("financ") || lower.includes("money") || lower.includes("saving")) return "finance";
    if (lower.includes("relation") || lower.includes("social") || lower.includes("friend")) return "relationships";
    if (lower.includes("creativ") || lower.includes("hobby") || lower.includes("art")) return "creativity";
    if (lower.includes("break") || lower.includes("quit") || lower.includes("stop")) return "breaking";
    return null;
  }).filter(Boolean) as string[];

  const uniqueKeys = goalKeys.length > 0 ? [...new Set(goalKeys)] : ["mindfulness", "fitness", "learning"];

  const results: TemplateSuggestion[] = [];
  for (const key of uniqueKeys) {
    const templates = GOAL_TEMPLATES[key] ?? [];
    for (const t of templates) {
      if (!existingNames.has(t.name.toLowerCase()) && results.length < 6) {
        results.push(t);
      }
    }
  }

  if (results.length < 6) {
    const fallback = [
      ...GOAL_TEMPLATES.mindfulness,
      ...GOAL_TEMPLATES.fitness,
      ...GOAL_TEMPLATES.learning,
    ];
    for (const t of fallback) {
      if (!existingNames.has(t.name.toLowerCase()) && !results.find((r) => r.name === t.name) && results.length < 6) {
        results.push(t);
      }
    }
  }

  return results.slice(0, 6);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const [{ data: profile }, { data: habits }] = await Promise.all([
      admin.from("profiles").select("goals, goal").eq("id", user.id).single(),
      admin.from("habits").select("name").eq("user_id", user.id),
    ]);

    const goals: string[] =
      Array.isArray(profile?.goals) && (profile.goals as string[]).length > 0
        ? (profile.goals as string[])
        : profile?.goal ? [profile.goal] : [];

    const existingNames = new Set((habits ?? []).map((h: { name: string }) => h.name.toLowerCase()));
    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        suggestions: getFallbackSuggestions(goals, existingNames),
        date: today,
      });
    }

    const systemPrompt = `You are a precision habit coach. Generate exactly 6 personalized daily habit suggestions.

Return ONLY valid JSON: {"suggestions":[{"emoji":"...","name":"...","category":"...","reason":"..."}]}

Rules:
- name: specific and measurable — include duration/frequency/quantity. Max 55 characters.
- emoji: single relevant emoji
- category: one of Fitness, Sleep, Mindfulness, Learning, Productivity, Nutrition, Social, Creativity, Digital Detox
- reason: 1 sentence max 12 words on why this fits the user right now
- NEVER suggest a habit that appears in the "Existing habits" list
- Vary categories so suggestions span at least 3 different areas`;

    const userPrompt = `User goals: ${goals.length > 0 ? goals.join(", ") : "general wellness"}
Today: ${dayOfWeek} ${timeOfDay}
Existing habits to AVOID duplicating: ${[...existingNames].slice(0, 20).join(", ") || "none yet"}

Generate 6 varied, specific habits that match their goals and suit a ${dayOfWeek} ${timeOfDay}.`;

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
        temperature: 0.85,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        suggestions: getFallbackSuggestions(goals, existingNames),
        date: today,
      });
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const parsed = JSON.parse(data.choices[0].message.content) as { suggestions: TemplateSuggestion[] };

    const filtered = (parsed.suggestions ?? [])
      .filter((s) => s.name && s.emoji && !existingNames.has(s.name.toLowerCase()))
      .slice(0, 6);

    if (filtered.length < 3) {
      return NextResponse.json({
        suggestions: getFallbackSuggestions(goals, existingNames),
        date: today,
      });
    }

    return NextResponse.json({ suggestions: filtered, date: today });
  } catch {
    return NextResponse.json({
      suggestions: getFallbackSuggestions([], new Set()),
      date: new Date().toISOString().split("T")[0],
    });
  }
}
