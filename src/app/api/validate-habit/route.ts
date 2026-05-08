import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// In-memory rate limit — resets on cold start, good enough for cost control
const rateLimitMap = new Map<string, { date: string; count: number }>();
const DAILY_LIMIT = 10;

function checkRateLimit(userId: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.date !== today) {
    rateLimitMap.set(userId, { date: today, count: 1 });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

const SYSTEM_PROMPT = `You are a habit coach reviewing a habit name. Reply with JSON only, no extra keys:
{"status":"good"|"warning"|"blocked","message":"1-2 sentences personalised to the exact habit — mention it by name, explain WHY it is valid/vague/invalid. Max 30 words. Conversational tone.","suggestion":"specific better habit name — only for warning or blocked"}

Rules:
good = specific, measurable, actionable (e.g. "Run 5km daily", "Read 20 pages before bed")
warning = too vague, leisure/entertainment, or missing frequency/duration — earns 50% XP
blocked = not a habit: harmful, nonsense, pure emotion, single noun, random phrase

Examples (follow this exact style):
"run" → {"status":"warning","message":"'Run' is too vague to earn full XP. How far, how often?","suggestion":"Run 3km every morning"}
"watch harry potter" → {"status":"blocked","message":"Watching Harry Potter is entertainment, not a habit. Try a learning or active habit instead.","suggestion":"Watch one documentary per week"}
"meditate 10 minutes daily" → {"status":"good","message":"Meditating 10 minutes daily is clear and measurable. You'll earn full XP 🎯"}
"be happy" → {"status":"blocked","message":"'Be happy' is a feeling, not a habit you can track. Try an action that improves your mood.","suggestion":"Write 3 things I'm grateful for each morning"}
"exercise" → {"status":"warning","message":"'Exercise' is too broad to earn full XP. Specify what you'll do and for how long.","suggestion":"Do 30 minutes of exercise every morning"}
"read" → {"status":"warning","message":"'Read' needs more detail to earn full XP. Add what or how much.","suggestion":"Read 20 pages every night before bed"}`;

export interface ValidationResponse {
  status: "good" | "warning" | "blocked";
  message: string;
  suggestion?: string;
}

const GENERIC_WORDS = new Set([
  "exercise", "workout", "gym", "run", "running", "jog", "jogging",
  "meditate", "meditation", "sleep", "rest", "relax", "relaxation",
  "study", "learn", "learning", "read", "reading",
  "eat", "eating", "drink", "drinking", "diet",
  "work", "code", "coding", "program", "programming",
  "journal", "journaling", "yoga", "walk", "walking",
  "write", "writing", "practice", "train", "training",
  "stretch", "stretching", "swim", "swimming", "clean", "cleaning",
]);

const BLOCKED_RE = /^\d+$|^(.)\1{3,}$|^[^a-zA-Z]{2,}$/;

function ruleBasedValidation(name: string): ValidationResponse {
  const lower = name.trim().toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const cap   = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);

  if (words.length === 0 || BLOCKED_RE.test(lower) || lower.length < 3) {
    return {
      status:     "blocked",
      message:    "That doesn't look like a trackable habit. Try something like 'Do 20 pushups every morning'.",
      suggestion: "Do 20 pushups every morning",
    };
  }

  if (words.length === 1 && GENERIC_WORDS.has(words[0])) {
    return {
      status:     "warning",
      message:    `'${cap}' is too vague to earn full XP. Add a duration or frequency to make it specific.`,
      suggestion: `${cap} for 20 minutes every morning`,
    };
  }

  if (words.length === 1) {
    return {
      status:  "warning",
      message: `'${cap}' needs more detail. What exactly will you do, and how often?`,
    };
  }

  return {
    status:  "good",
    message: `'${cap}' is a clear, actionable habit. You'll earn full XP 🎯`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { habitName?: string; goals?: string[] };
    const habitName = body.habitName?.trim() ?? "";
    const goals = Array.isArray(body.goals) && body.goals.length > 0 ? body.goals : null;
    if (habitName.length < 3) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json<ValidationResponse>(ruleBasedValidation(habitName));
    }

    // Silently fall back to rule-based when rate-limited — never block UX on cost controls
    if (!checkRateLimit(user.id)) {
      return NextResponse.json<ValidationResponse>(ruleBasedValidation(habitName));
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
          { role: "user",   content: goals
              ? `Habit name: "${habitName}". User's goals: ${goals.join(", ")}.`
              : `Habit name: "${habitName}"` },
        ],
        max_tokens: 120,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json<ValidationResponse>(ruleBasedValidation(habitName));
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content) as ValidationResponse;

    // Sanitise — never return an unknown status
    if (!["good", "warning", "blocked"].includes(parsed.status)) {
      return NextResponse.json<ValidationResponse>(ruleBasedValidation(habitName));
    }

    return NextResponse.json<ValidationResponse>(parsed);
  } catch {
    return NextResponse.json<ValidationResponse>({ status: "good", message: "Specific and actionable" });
  }
}
