import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface GoalValidationResponse {
  status: "good" | "too_vague" | "not_a_goal";
  message: string;
}

const SYSTEM_PROMPT = `You are a supportive coach reviewing what someone typed as their goal for a multi-week habit-building program, for a general-audience app used by people aged 7–60. Reply with ONLY valid JSON, no extra keys:
{"status":"good"|"too_vague"|"not_a_goal","message":"..."}

══ CONTENT MODERATION — TOP PRIORITY ══
If the input contains sexual content, violence, self-harm/suicide references, illegal hard drug use, or anything inappropriate for a 7-year-old, return EXACTLY:
{"status":"not_a_goal","message":"This doesn't look like a goal we can build a program around. Try describing something real you want to work toward."}

══ CLASSIFICATION RULES ══
good = a real, specific, well-formed personal goal with enough detail to plan a program around — ideally states what they want plus a timeframe or starting point (e.g. "I want to quit smoking cigarettes within 30 days, I've smoked for 10 years")
too_vague = a real, coherent goal, but missing key detail needed to plan a program — no timeframe, no sense of current level or starting point, or too generic/a single vague word (e.g. "exercize", "get fit", "be better at school")
not_a_goal = not coherent as a personal goal at all — nonsense, a random phrase, a description of something rather than something to work toward, gibberish, or inappropriate content (e.g. "watching people swear", "asdfgh", "the sky")

Typos and misspellings (like "exercize" for "exercise") should still be understood — classify based on intent, not spelling.

══ MESSAGE REQUIREMENTS — MANDATORY ══
Every message MUST:
1. Be specific to what they actually typed, never generic.
2. good → briefly confirm in plain English what makes it work (specific goal + timeframe or clear starting point). Do NOT mention XP, habits, or streaks — this is feedback on a GOAL, not a habit.
3. too_vague → name EXACTLY what's missing (a timeframe? what "done" looks like? a starting point?) and suggest adding it.
4. not_a_goal → say plainly this doesn't look like a goal yet, without being harsh or judgmental.
5. Stay under 30 words. Warm, conversational tone. No filler like "great job!".

══ EXAMPLES ══
"I want to quit smoking cigarettes within 30 days, I've smoked for 10 years" → {"status":"good","message":"This works — a clear target (quit smoking), a timeframe (30 days), and your starting point (10 years). Enough to build a real plan around."}
"exercize" → {"status":"too_vague","message":"'Exercize' is a start, but there's no timeframe or sense of what you're working toward yet. Add a deadline and what success looks like."}
"get fit" → {"status":"too_vague","message":"'Get fit' is the right idea, but too open-ended to plan around. What does 'fit' mean for you, and by when?"}
"watching people swear" → {"status":"not_a_goal","message":"This reads like something you're observing, not a goal for yourself. What do YOU want to achieve?"}
"asdfgh" → {"status":"not_a_goal","message":"This doesn't look like a goal yet. Try describing something real you want to work toward."}`;

// Used only if OPENAI_API_KEY is missing or the AI call fails — a rough
// structural fallback so the feature degrades gracefully instead of breaking.
// Unlike the AI path, it can't judge semantic coherence (e.g. "watching
// people swear" would read as too_vague here, not not_a_goal) — that's an
// accepted limitation of a fallback-only mechanism, matching validate-habit's
// own rule-based fallback.
function ruleBasedValidation(text: string): GoalValidationResponse {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length === 0 || trimmed.length < 4) {
    return { status: "not_a_goal", message: "This doesn't look like a goal yet — try describing something real you want to work toward." };
  }
  if (words.length <= 2) {
    return { status: "too_vague", message: "That's a start, but too short to plan around — add a timeframe and what “done” looks like." };
  }
  const hasTimeframe = /\b(day|days|week|weeks|month|months|year|years|by|within|before)\b/i.test(trimmed);
  if (!hasTimeframe) {
    return { status: "too_vague", message: "This is a real goal, but there's no timeframe yet — when do you want to achieve this by?" };
  }
  return { status: "good", message: "This has enough detail — a clear goal and a timeframe — to build a program around." };
}

export async function POST(request: NextRequest) {
  let goalText = "";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { goalText?: string };
    goalText = body.goalText?.trim() ?? "";
    if (goalText.length < 5) {
      return NextResponse.json<GoalValidationResponse>({ status: "good", message: "" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json<GoalValidationResponse>(ruleBasedValidation(goalText));
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Goal: "${goalText}"` },
        ],
        max_tokens: 150,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json<GoalValidationResponse>(ruleBasedValidation(goalText));
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content) as GoalValidationResponse;

    if (!["good", "too_vague", "not_a_goal"].includes(parsed.status)) {
      return NextResponse.json<GoalValidationResponse>(ruleBasedValidation(goalText));
    }

    return NextResponse.json<GoalValidationResponse>(parsed);
  } catch (err) {
    console.error("[validate-goal] unexpected error, falling back to rule-based check", err);
    return NextResponse.json<GoalValidationResponse>(
      goalText ? ruleBasedValidation(goalText) : { status: "good", message: "" }
    );
  }
}
