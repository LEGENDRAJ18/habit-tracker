import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callOpenAIJSON } from "@/lib/openai";
import { categoryLabel, FALLBACK_MILESTONE_TEXT } from "@/lib/goalProgram";
import type { GoalCategory, ProgramPhase } from "@/types";

const DAILY_GENERATION_LIMIT = 3;

interface QAPair { question: string; answer: string }
interface ProgramPreview {
  program_name: string;
  program_overview: string;
  phases: ProgramPhase[];
}

// Normalizes an AI-generated phase's milestones to exactly one per week.
// The generation prompt already asks for this, but nothing enforces it —
// a mismatch either strands the user mid-phase (too many milestones: the
// last one stays "done" with no further milestone to reach) or ends the
// phase early (too few: "all milestones done" triggers before the phase's
// actual week count is up). Normalizing here guarantees the invariant
// regardless of what the model returns.
function normalizePhaseMilestones(milestones: string[], weeks: number): string[] {
  const clean = milestones.map((m) => m?.trim()).filter((m): m is string => !!m);
  if (weeks <= 0 || clean.length === weeks) return clean;
  if (clean.length > weeks) {
    // Fold overflow into the last kept milestone rather than dropping it.
    const kept = clean.slice(0, weeks - 1);
    const overflow = clean.slice(weeks - 1).join(" Also: ");
    return [...kept, overflow];
  }
  const padded = [...clean];
  while (padded.length < weeks) {
    padded.push(FALLBACK_MILESTONE_TEXT);
  }
  return padded;
}

// Forces the sum of phase weeks to match the user's stated timeframe,
// regardless of what the AI actually returned — same defense-in-depth
// reasoning as normalizePhaseMilestones. Adjusts the last phase's length
// to absorb the difference rather than touching earlier phases' content.
function normalizeTotalWeeks(phases: Array<{ weeks: number }>, targetWeeks: number): void {
  if (phases.length === 0) return;
  const currentTotal = phases.reduce((sum, p) => sum + p.weeks, 0);
  const diff = targetWeeks - currentTotal;
  if (diff === 0) return;
  const last = phases[phases.length - 1];
  last.weeks = Math.max(1, last.weeks + diff);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Tier read + generation-quota counter both go through the admin client.
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier, goal_program_gen_count, goal_program_gen_date")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_tier !== "pro") {
      return NextResponse.json({ error: "AI Goal Program is a Pro feature." }, { status: 403 });
    }

    const body = await request.json() as {
      mode?: "questions" | "feasibility" | "generate" | "save";
      goalCategory?: GoalCategory;
      goalDescription?: string;
      answers?: QAPair[];
      program?: ProgramPreview;
      targetWeeks?: number | null;
    };
    const { mode = "questions", goalCategory, goalDescription, answers = [], program, targetWeeks } = body;
    const safeTargetWeeks = typeof targetWeeks === "number" && Number.isFinite(targetWeeks) && targetWeeks > 0
      ? Math.round(targetWeeks)
      : null;

    if (!goalCategory || !goalDescription?.trim()) {
      return NextResponse.json({ error: "Missing goal category or description" }, { status: 400 });
    }

    // ── Clarifying questions ────────────────────────────────────────────────
    if (mode === "questions") {
      const systemPrompt = `You are an expert coach helping someone plan a multi-week habit program to reach a personal goal.

First, carefully read their goal description below. Identify anything they've ALREADY told you — a deadline or timeframe, how much time they can spend, how often, past attempts, specific constraints, or their intended approach (e.g. quitting "cold turkey" vs. gradually, all at once vs. step by step). Treat all of that as already known — do not ask about it again.

Then ask 3-4 short clarifying questions covering only what's genuinely still missing and needed to tailor the program (e.g. support systems, specific triggers, daily schedule, past attempts, constraints) — never a question whose answer is already stated in their description.

If their stated timeframe or approach is unusually fast, abrupt, or all-at-once (e.g. stopping "immediately" or "within a day," rather than gradually over weeks), do NOT ask questions that assume a longer, gradual, multi-week routine (like "how much time can you dedicate each day"). Ask things relevant to that specific short window instead — like what might make them slip, who can support them, or what's different this time.

Do NOT ask about their current skill/experience level, or their target timeframe/deadline — both are already captured separately.

For EACH question, also provide 3-4 short suggested answers written in plain, everyday language — no jargon, no vague categories. Phrase both the question and the answers concretely and specifically. For example, instead of asking about "time constraints," ask "How much time do you have per session?" with answers like "Under 15 min", "15-30 min", "30-60 min", "1 hour+". Do NOT include a "something else" or "other" option in your answers — that's added automatically by the app.

Respond with valid JSON exactly matching this schema:
{ "questions": [ { "question": "question text", "options": ["short answer 1", "short answer 2", "short answer 3"] } ] }`;
      const userPrompt = `Goal category: ${categoryLabel(goalCategory)}\nGoal in their words: "${goalDescription}"`;
      const result = await callOpenAIJSON(systemPrompt, userPrompt) as { questions?: Array<{ question?: string; options?: string[] }> };
      const questions = (result.questions ?? [])
        .filter((q) => !!q.question?.trim())
        .map((q) => ({ question: q.question!.trim(), options: (q.options ?? []).filter((o) => !!o?.trim()) }));
      return NextResponse.json({ questions });
    }

    // ── Feasibility check — runs after Step 3, before generation. Never
    // blocks; only surfaces a supportive heads-up for an extreme timeframe.
    if (mode === "feasibility") {
      const qaText = answers.length > 0
        ? answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")
        : "No additional answers provided.";

      const systemPrompt = `You are a supportive, honest coach reviewing someone's goal and timeframe before their program is built. Your ONLY job is to flag if the stated timeframe is extremely aggressive or unrealistic for the goal — not to judge the goal itself, and not to be discouraging.

If the timeframe is reasonable — even if ambitious — respond with no concern.

If it's extremely aggressive (for example: quitting a long-standing habit "cold turkey" in a single day, learning a real skill in just a few days, or a major physical change in an unrealistically short window), write a short message (2-4 sentences) that:
1. Acknowledges what they're going for, in a warm, non-judgmental way.
2. Briefly explains in plain, general, practical language why that specific timeframe is unusually hard — NEVER give specific medical dosing, withdrawal management, or clinical treatment advice of any kind.
3. If the goal is health-related (e.g. quitting smoking, vaping, drinking, or a similar habit), you may mention that gradually stepping down over 1-2 weeks is often more successful than stopping abruptly, in only general terms, and suggest they could also talk to a doctor if it's affecting their health — but do not go further into medical territory than that.
4. Ends on an encouraging, practical note — never tell them not to try, never block them.

Respond with valid JSON exactly matching this schema:
{ "concern": "the message here, or null if the timeframe is reasonable" }`;
      const userPrompt = `Goal category: ${categoryLabel(goalCategory)}
Goal in their words: "${goalDescription}"

Answers:
${qaText}`;
      const result = await callOpenAIJSON(systemPrompt, userPrompt) as { concern?: string | null };
      return NextResponse.json({ concern: result.concern?.trim() || null });
    }

    // ── Full program generation (preview only — not persisted) ─────────────
    if (mode === "generate") {
      const today = new Date().toISOString().split("T")[0];
      const currentCount = profile?.goal_program_gen_count ?? 0;
      const currentDate  = profile?.goal_program_gen_date ?? null;
      const todayCount   = currentDate === today ? currentCount : 0;

      if (todayCount >= DAILY_GENERATION_LIMIT) {
        return NextResponse.json(
          { error: `You've generated ${DAILY_GENERATION_LIMIT} programs today. Try again tomorrow.` },
          { status: 429 },
        );
      }

      const qaText = answers.length > 0
        ? answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")
        : "No additional answers provided.";

      const timeframeInstruction = safeTargetWeeks
        ? `The user has exactly ${safeTargetWeeks} weeks for this goal — the phases' "weeks" values MUST sum to exactly ${safeTargetWeeks}. Adjust phase count and length to fit that (even a single short phase for a very tight timeframe, or more/longer phases for a longer one) rather than defaulting to the usual phase structure below.`
        : `No specific timeframe was given. If their answers state one anyway, honor it. Otherwise default to a realistic total of 8-12 weeks across all phases, unless the goal clearly needs longer or shorter.`;

      const systemPrompt = `You are an expert coach designing a multi-week, phased habit-building program to help someone reach a personal goal. By default, build a realistic, motivating, phased program using 2-4 phases of 2-6 weeks each — but that's only a starting point. ${timeframeInstruction} Each phase has EXACTLY one milestone per week and 2-4 daily/weekly habits to build during that phase.

The "milestones" array for each phase MUST contain exactly as many entries as that phase's "weeks" value — one milestone per week, in order, no more and no fewer. For example, a phase with "weeks": 5 must have exactly 5 milestones.

Write every phase title, focus sentence, milestone, habit name, and explanation in simple, plain, everyday language — the kind a teenager would understand immediately. Avoid jargon, technical terms, or vague abstractions (for example, say "practice" instead of "techniques", say "why this helps" instead of "rationale"). Keep everything concrete and easy to picture.

Respond with valid JSON exactly matching this schema:
{
  "programName": "short punchy program name",
  "programOverview": "2-3 sentence overview of the approach and why it works",
  "phases": [
    {
      "phase": 1,
      "title": "phase title",
      "weeks": 3,
      "focus": "1 sentence on what this phase focuses on",
      "milestones": ["milestone for week 1", "milestone for week 2", "milestone for week 3"],
      "habits": [
        { "name": "habit name", "frequency": "daily", "why": "1 sentence on why this habit matters for this phase" }
      ]
    }
  ]
}`;
      const userPrompt = `Goal category: ${categoryLabel(goalCategory)}
Goal in their words: "${goalDescription}"

Clarifying answers:
${qaText}

Design the full phased program now.`;

      const result = await callOpenAIJSON(systemPrompt, userPrompt) as {
        programName?: string; programOverview?: string;
        phases?: Array<{ phase: number; title: string; weeks: number; focus: string; milestones: string[]; habits: Array<{ name: string; frequency: "daily" | "weekly"; why: string }> }>;
      };

      const rawPhases = result.phases ?? [];
      if (safeTargetWeeks) normalizeTotalWeeks(rawPhases, safeTargetWeeks);

      const phases: ProgramPhase[] = rawPhases.map((p) => ({
        phase: p.phase,
        title: p.title,
        weeks: p.weeks,
        focus: p.focus,
        milestones: normalizePhaseMilestones(p.milestones ?? [], p.weeks).map((text) => ({ text, done: false })),
        habits: p.habits ?? [],
      }));

      // Increment the daily generation counter — generation (not saving) is the expensive AI step.
      await admin.from("profiles").update({
        goal_program_gen_count: todayCount + 1,
        goal_program_gen_date: today,
      }).eq("id", user.id);

      return NextResponse.json({
        program: {
          program_name: result.programName ?? "Your Program",
          program_overview: result.programOverview ?? "",
          phases,
        } satisfies ProgramPreview,
      });
    }

    // ── Persist an already-generated preview (no second AI call) ────────────
    if (mode === "save") {
      if (!program) return NextResponse.json({ error: "Missing program to save" }, { status: 400 });

      const totalWeeks = program.phases.reduce((sum, p) => sum + p.weeks, 0);
      const targetCompletionDate = new Date(Date.now() + totalWeeks * 7 * 86400000).toISOString();

      const { data: savedProgram, error: insertErr } = await supabase
        .from("goal_programs")
        .insert({
          user_id: user.id,
          goal_category: goalCategory,
          goal_description: goalDescription,
          program_name: program.program_name,
          program_overview: program.program_overview,
          phases: program.phases,
          current_phase: 1,
          current_week: 1,
          current_week_started_at: new Date().toISOString(),
          status: "active",
          started_at: new Date().toISOString(),
          target_completion_date: targetCompletionDate,
        })
        .select()
        .single();

      if (insertErr || !savedProgram) {
        return NextResponse.json({ error: insertErr?.message ?? "Couldn't save program" }, { status: 500 });
      }

      // Auto-add Phase 1 / Week 1 habits to the dashboard.
      const week1Habits = program.phases[0]?.habits ?? [];
      if (week1Habits.length > 0) {
        await supabase.from("habits").insert(
          week1Habits.map((h) => ({
            user_id: user.id,
            name: h.name,
            frequency: h.frequency,
            program_id: savedProgram.id,
            program_phase: 1,
            program_week: 1,
          })),
        );
      }

      return NextResponse.json({ program: savedProgram });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("[goal-program/create]", err);
    return NextResponse.json({ error: (err as Error).message ?? "AI service unavailable" }, { status: 500 });
  }
}
