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

const SYSTEM_PROMPT = `Classify a habit name. JSON only, no extra keys:
{"status":"good"|"warning"|"blocked","message":"2-5 words","suggestion":"specific version (warning only)"}
good=specific+actionable. warning=too vague, add suggestion. blocked=harmful/nonsense/not a habit.`;

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

  if (words.length === 0 || BLOCKED_RE.test(lower) || lower.length < 3) {
    return { status: "blocked", message: "Not a valid habit" };
  }

  if (words.length === 1 && GENERIC_WORDS.has(words[0])) {
    const w = words[0];
    const cap = w.charAt(0).toUpperCase() + w.slice(1);
    return {
      status: "warning",
      message: "Too vague — add specifics",
      suggestion: `${cap} for 20 minutes every morning`,
    };
  }

  if (words.length === 1) {
    return { status: "warning", message: "Add more detail" };
  }

  return { status: "good", message: "Specific and actionable" };
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
        max_tokens: 50,
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
