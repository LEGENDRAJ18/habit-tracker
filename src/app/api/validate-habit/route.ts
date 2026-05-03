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

const SYSTEM_PROMPT = `You are a habit validation assistant. Evaluate the habit name and respond with JSON only.

Status definitions:
- "good"    — specific, actionable, positive, safe habit
- "warning" — vague or could be improved; always include a concrete "suggestion"
- "blocked" — harmful, illegal, promoting self-harm, offensive, gibberish/random text, or simply not a habit at all

Examples:
"Walk 30 minutes every morning" → good
"Read 20 pages before bed"      → good
"No phone before 9am"           → good
"Drink 8 glasses of water"      → good
"Exercise"                      → warning  (suggestion: "Exercise for 30 minutes daily")
"Be healthy"                    → warning  (suggestion: "Eat a vegetable with every meal")
"Watch less TV"                 → warning  (suggestion: "Limit TV to 1 hour per day")
"Stop smoking"                  → warning  (suggestion: "No cigarettes today")
"health"                        → warning  (suggestion: "Drink 8 glasses of water daily")
"asdf qwer zxcv"                → blocked
"hurt myself"                   → blocked
"buy drugs"                     → blocked
"xyz"                           → blocked

Respond with exactly this JSON — no extra keys:
{"status":"good"|"warning"|"blocked","message":"feedback max 10 words","suggestion":"improved version (warning only, else omit)"}`;

export interface ValidationResponse {
  status: "good" | "warning" | "blocked";
  message: string;
  suggestion?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { habitName?: string };
    const habitName = body.habitName?.trim() ?? "";
    if (habitName.length < 3) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
    }

    // Silently pass through when rate-limited — never block UX on cost controls
    if (!checkRateLimit(user.id)) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
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
          { role: "user",   content: `Habit name: "${habitName}"` },
        ],
        max_tokens: 80,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content) as ValidationResponse;

    // Sanitise — never return an unknown status
    if (!["good", "warning", "blocked"].includes(parsed.status)) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
    }

    return NextResponse.json<ValidationResponse>(parsed);
  } catch {
    // Never block submission because of a validation error
    return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
  }
}
