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

// ─── Content moderation ───────────────────────────────────────────────────────

// Regex patterns for categories that are always inappropriate.
// Use word-boundary anchors (\b) to avoid false-positives on substrings.
const INAPPROPRIATE_PATTERNS: RegExp[] = [
  // Sexual content
  /\b(sex|sexual|sexuality|porn|porno|pornography|masturbat\w*|orgasm|orgasmic|erotic|erotica|nude|nudity|naked|boob|boobs|breast|penis|vagina|vulva|dick|cock|pussy|ass\b|arse|anal|blowjob|blow\s*job|handjob|hand\s*job|cum\b|cumming|sperm|horny|slutt?y?|slut|whore|whor|hoe\b|hooker|prostitut\w*|onlyfans|striptease|strip\s*club|fetish|bdsm|kinky|kink\b|nudes|sexting|masturbation)\b/i,
  // Violence & harm
  /\b(kill|killing|murder|stab|stabbing|shoot|shooting|harm\s*others|attack|assault|rape|raping|abuse|abusing|suicide|suicidal|self.?harm|self.?hurt|cut\s*myself|cutting\s*myself|overdose|hang\s*myself)\b/i,
  // Hard illegal drugs (exclude "weed the garden" by requiring drug context words nearby — handled by next pattern)
  /\b(cocaine|heroin|meth\b|methamphetamine|crack\s*cocaine|fentanyl|crystal\s*meth|acid\b|lsd\b|ecstasy\b|mdma|molly\b|shrooms\b|ketamine)\b/i,
];

const INAPPROPRIATE_RESPONSE = {
  status:  "blocked" as const,
  message: "This isn't an appropriate habit. Please enter a real, positive habit you want to build.",
  suggestion: "Meditate for 10 minutes every morning",
};

function containsInappropriateContent(name: string): boolean {
  return INAPPROPRIATE_PATTERNS.some((re) => re.test(name));
}

// ─── AI system prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a content-moderated habit coach reviewing a habit name for a general-audience app used by people aged 7–60. Reply with ONLY valid JSON, no extra keys:
{"status":"good"|"warning"|"blocked","message":"...","suggestion":"..."}

══ CONTENT MODERATION — TOP PRIORITY ══
If the input contains ANY of the following — regardless of phrasing, euphemisms, or clever wording — return EXACTLY this JSON and nothing else:
{"status":"blocked","message":"This isn't an appropriate habit. Please enter a real, positive habit you want to build.","suggestion":"Meditate for 10 minutes every morning"}

Triggers for immediate block:
• Sexual content: sexual acts, body parts in a sexual context, pornography, explicit material
• Violence: harming or killing people or animals, fighting, assault
• Self-harm or suicide references
• Illegal drug use (cocaine, heroin, meth, etc.)
• Any content inappropriate for a 7-year-old

══ HABIT QUALITY RULES ══
good   = specific, measurable, actionable (e.g. "Run 5km daily", "Read 20 pages before bed")
warning = too vague, leisure/entertainment, or missing frequency/duration — earns only 50% XP
blocked = not a trackable habit: pure emotion, nonsense, single noun, random phrase, inappropriate

══ MESSAGE REQUIREMENTS — MANDATORY ══
Every message MUST:
1. Mention the habit by name
2. Explain specifically WHY it is good / vague / blocked
   - good   → explain the concrete benefit AND what makes it specific (duration, frequency, action)
   - warning → name EXACTLY what information is missing (frequency? duration? activity type?) and why that matters
   - blocked → explain why it cannot be tracked and suggest a real alternative
3. Stay under 30 words. Conversational tone. No filler phrases like "looks great!".

NEVER approve a habit with a generic message. Every response must reference the specific habit.

══ EXAMPLES ══
"run" → {"status":"warning","message":"'Run' has no distance or schedule, so there's nothing to track consistently. Add a goal like distance or time.","suggestion":"Run 3km every morning"}
"watch harry potter" → {"status":"blocked","message":"Watching Harry Potter is entertainment, not a habit you can build. Try something active or skill-based instead.","suggestion":"Watch one educational documentary per week"}
"meditate 10 minutes daily" → {"status":"good","message":"Meditating 10 minutes daily gives you a clear duration and cadence — perfect for building a consistent mindfulness practice. 🎯"}
"be happy" → {"status":"blocked","message":"'Be happy' is a feeling, not a daily action you can check off. Habits need to be concrete behaviours.","suggestion":"Write 3 things I'm grateful for each morning"}
"exercise" → {"status":"warning","message":"'Exercise' doesn't say what type, how long, or how often — all three gaps mean nothing to track.","suggestion":"Do 30 minutes of cardio every morning"}
"read" → {"status":"warning","message":"'Read' is missing how much and when, which makes it impossible to build into a consistent routine.","suggestion":"Read 20 pages every night before bed"}
"drink water" → {"status":"warning","message":"'Drink water' needs a target amount and time to be trackable. How much, and when?","suggestion":"Drink 2 glasses of water every morning"}
"journal" → {"status":"warning","message":"'Journal' doesn't say how long or when, so there's no clear habit to measure.","suggestion":"Write a 5-minute journal entry before bed"}`;

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
      message:    `'${cap}' is too vague — there's no frequency, duration, or specifics to track. Add how long or how often.`,
      suggestion: `${cap} for 20 minutes every morning`,
    };
  }

  if (words.length === 1) {
    return {
      status:  "warning",
      message: `'${cap}' needs more detail — what exactly will you do, how often, and for how long?`,
    };
  }

  // Multi-word habit — check if it has some specificity
  const hasNumber = /\d/.test(lower);
  const hasFrequency = /\b(daily|every|each|per|weekly|morning|evening|night|before|after)\b/.test(lower);

  if (hasNumber || hasFrequency) {
    return {
      status:  "good",
      message: `'${cap}' is specific and measurable — you have a clear target to hit and track. Great habit! 🎯`,
    };
  }

  return {
    status:  "warning",
    message: `'${cap}' could be stronger with a frequency or amount — adding "every morning" or a number makes it fully trackable.`,
    suggestion: `${cap} for 20 minutes every morning`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { habitName?: string; goals?: string[]; calendarContext?: boolean };
    const habitName = body.habitName?.trim() ?? "";
    const goals = Array.isArray(body.goals) && body.goals.length > 0 ? body.goals : null;
    const calendarContext = body.calendarContext === true;
    if (habitName.length < 3) {
      return NextResponse.json<ValidationResponse>({ status: "good", message: "" });
    }

    // Content moderation pre-screen — never let inappropriate habits reach AI or DB
    if (containsInappropriateContent(habitName)) {
      return NextResponse.json<ValidationResponse>(INAPPROPRIATE_RESPONSE);
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
          { role: "user",   content: (() => {
              const base = goals
                ? `Habit name: "${habitName}". User's goals: ${goals.join(", ")}.`
                : `Habit name: "${habitName}"`;
              return calendarContext
                ? `${base} Context: This habit is being scheduled for specific days on a calendar — validate whether it makes sense as a schedulable, time-based habit.`
                : base;
            })() },
        ],
        max_tokens: 150,
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

    // Second-pass moderation: if AI returned "good" or "warning" but the habit name
    // still triggers our keyword filter (shouldn't happen, but belt-and-suspenders),
    // override with the moderation response.
    if (containsInappropriateContent(habitName)) {
      return NextResponse.json<ValidationResponse>(INAPPROPRIATE_RESPONSE);
    }

    return NextResponse.json<ValidationResponse>(parsed);
  } catch {
    return NextResponse.json<ValidationResponse>({ status: "good", message: "Specific and actionable" });
  }
}
