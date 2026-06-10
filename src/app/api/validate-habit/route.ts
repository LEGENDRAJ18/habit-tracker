import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

// ─── Context detection ────────────────────────────────────────────────────────

function detectTimeContext(name: string): boolean {
  const lower = name.toLowerCase();
  return /\b(?:morning|evening|night|afternoon|dawn|noon|\d{1,2}(?::\d{2})?\s*(?:am|pm)|before\s+(?:bed|noon|work|sleep)|after\s+(?:waking|work|dinner|eating)|every\s+(?:morning|evening|night|afternoon))\b/.test(lower);
}

function detectDurationContext(name: string): boolean {
  const lower = name.toLowerCase();
  return /\b\d+\s*(?:minutes?|mins?|hours?|hrs?)\b/.test(lower);
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

// Contextual suggestions per generic single word — avoids the generic "X for 20 minutes every morning" fallback
const GENERIC_SUGGESTIONS: Record<string, string> = {
  run:          "Run 3km every morning",
  running:      "Run 3km every morning",
  jog:          "Jog for 20 minutes every morning",
  jogging:      "Jog for 20 minutes every morning",
  gym:          "Go to the gym for 1 hour every weekday",
  exercise:     "Exercise for 30 minutes every day",
  workout:      "Do a 30-minute workout every day",
  meditate:     "Meditate for 10 minutes every morning",
  meditation:   "Meditate for 10 minutes every morning",
  sleep:        "Be in bed by 10:30 PM every night",
  rest:         "Go to bed at the same time every night",
  relax:        "Spend 20 minutes reading before bed",
  relaxation:   "Spend 20 minutes reading before bed",
  study:        "Study for 45 minutes every evening",
  learn:        "Spend 30 minutes learning something new every day",
  learning:     "Spend 30 minutes learning something new every day",
  read:         "Read 20 pages every evening",
  reading:      "Read 20 pages every evening",
  eat:          "Eat a balanced meal with vegetables every day",
  eating:       "Eat a balanced meal with vegetables every day",
  drink:        "Drink 8 glasses of water every day",
  drinking:     "Drink 8 glasses of water every day",
  diet:         "Track my meals every day",
  work:         "Do 1 focused deep-work block every morning",
  code:         "Code for 1 hour every day",
  coding:       "Code for 1 hour every day",
  program:      "Program for 1 hour every day",
  programming:  "Program for 1 hour every day",
  journal:      "Write a 5-minute journal entry every evening",
  journaling:   "Write a 5-minute journal entry every evening",
  yoga:         "Do 20 minutes of yoga every morning",
  walk:         "Walk for 30 minutes every afternoon",
  walking:      "Walk for 30 minutes every afternoon",
  write:        "Write for 20 minutes every morning",
  writing:      "Write for 20 minutes every morning",
  practice:     "Practice for 30 minutes every day",
  train:        "Train for 45 minutes every day",
  training:     "Train for 45 minutes every day",
  stretch:      "Stretch for 10 minutes every morning",
  stretching:   "Stretch for 10 minutes every morning",
  swim:         "Swim for 30 minutes three times a week",
  swimming:     "Swim for 30 minutes three times a week",
  clean:        "Spend 15 minutes cleaning every evening",
  cleaning:     "Spend 15 minutes cleaning every evening",
};

// Abstract/philosophical inputs that can never be daily habits
const ABSTRACT_RE = /\b(meaning\s+of\s+life|universe|consciousness|enlightenment|nirvana|transcend|existential|philosophy|metaphysics|soul\s+of|spirit\s+of|wisdom\s+of|the\s+truth|inner\s+peace\s+of|infinite\s+wisdom)\b/i;

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

  // Abstract/philosophical inputs cannot be daily trackable habits
  if (ABSTRACT_RE.test(lower)) {
    return {
      status:     "blocked",
      message:    `'${cap}' is too abstract to be a trackable habit — habits need to be concrete daily actions you can check off.`,
      suggestion: "Meditate for 10 minutes every morning",
    };
  }

  if (words.length === 1 && GENERIC_WORDS.has(words[0])) {
    return {
      status:     "warning",
      message:    `'${cap}' is too vague — there's no frequency, duration, or specifics to track. Add how long or how often.`,
      suggestion: GENERIC_SUGGESTIONS[words[0]] ?? `${cap} for 20 minutes every day`,
    };
  }

  if (words.length === 1) {
    return {
      status:  "warning",
      message: `'${cap}' needs more detail — what exactly will you do, how often, and for how long?`,
    };
  }

  // Multi-word habit — check if it has some specificity
  const hasTimeLoc  = detectTimeContext(name);
  const hasDurLoc   = detectDurationContext(name);
  const hasNumber   = /\d/.test(lower);
  const hasFreq     = /\b(daily|every|each|per|weekly|morning|evening|night|before|after)\b/.test(lower);

  // If the habit already contains time and duration info, it's strong enough
  if (hasTimeLoc && hasDurLoc) {
    return {
      status:  "good",
      message: `'${cap}' is specific and measurable — clear time, duration, and action to track.`,
    };
  }

  if (hasNumber || hasFreq || hasTimeLoc || hasDurLoc) {
    return {
      status:  "good",
      message: `'${cap}' is specific and measurable — you have a clear target to track.`,
    };
  }

  // Generate warning that doesn't contradict what's already there
  const missing: string[] = [];
  if (!hasDurLoc && !hasNumber) missing.push("a duration");
  if (!hasTimeLoc && !hasFreq) missing.push("a frequency");
  const missingText = missing.length > 0 ? `adding ${missing.join(" and ")} makes it fully trackable.` : "more specifics would make it even stronger.";

  // Only suggest if we can generate a sensible sentence.
  // Never blindly append "for 20 minutes every morning" to arbitrary multi-word phrases.
  const firstGeneric = words.find((w) => GENERIC_WORDS.has(w));
  const suggestion   = firstGeneric ? (GENERIC_SUGGESTIONS[firstGeneric] ?? undefined) : undefined;

  return {
    status:  "warning",
    message: `'${cap}' could be stronger — ${missingText}`,
    suggestion,
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

    const hasTime     = detectTimeContext(habitName);
    const hasDuration = detectDurationContext(habitName);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json<ValidationResponse>(ruleBasedValidation(habitName));
    }

    // Build context notes so AI doesn't contradict already-specified info
    const contextNotes: string[] = [];
    if (hasTime)     contextNotes.push("The habit name already specifies a time of day. Do NOT suggest adding 'when' as something missing.");
    if (hasDuration) contextNotes.push("The habit name already specifies a duration. Do NOT suggest adding duration or time commitment.");

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
              const ctxParts = [
                calendarContext ? "Context: This habit is being scheduled for specific days on a calendar." : "",
                ...contextNotes,
              ].filter(Boolean);
              return ctxParts.length > 0 ? `${base} ${ctxParts.join(" ")}` : base;
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
