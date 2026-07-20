import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenAIJSON } from "@/lib/openai";
import { categoryLabel } from "@/lib/goalProgram";
import type { GoalCategory, ProgramPhase } from "@/types";

const DAILY_GENERATION_LIMIT = 3;

interface QAPair { question: string; answer: string }
interface ProgramPreview {
  program_name: string;
  program_overview: string;
  phases: ProgramPhase[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, goal_program_gen_count, goal_program_gen_date")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_tier !== "pro") {
      return NextResponse.json({ error: "AI Goal Program is a Pro feature." }, { status: 403 });
    }

    const body = await request.json() as {
      mode?: "questions" | "generate" | "save";
      goalCategory?: GoalCategory;
      goalDescription?: string;
      answers?: QAPair[];
      program?: ProgramPreview;
    };
    const { mode = "questions", goalCategory, goalDescription, answers = [], program } = body;

    if (!goalCategory || !goalDescription?.trim()) {
      return NextResponse.json({ error: "Missing goal category or description" }, { status: 400 });
    }

    // ── Clarifying questions ────────────────────────────────────────────────
    if (mode === "questions") {
      const systemPrompt = `You are an expert coach helping someone plan a multi-week habit program to reach a personal goal. Ask 3-4 short clarifying questions that will help you tailor the program to their exact situation (current level, time available, constraints, past attempts). Respond with valid JSON:
{ "questions": ["question 1", "question 2", "question 3"] }`;
      const userPrompt = `Goal category: ${categoryLabel(goalCategory)}\nGoal in their words: "${goalDescription}"`;
      const result = await callOpenAIJSON(systemPrompt, userPrompt) as { questions?: string[] };
      return NextResponse.json({ questions: result.questions ?? [] });
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

      const systemPrompt = `You are an expert coach designing a multi-week, phased habit-building program to help someone reach a personal goal. Build a realistic, motivating, phased program (2-4 phases, each 2-6 weeks, total program length reasonable for the goal). Each phase has 2-4 milestones (one roughly per week) and 2-4 daily/weekly habits to build during that phase. Respond with valid JSON exactly matching this schema:
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

      const phases: ProgramPhase[] = (result.phases ?? []).map((p) => ({
        phase: p.phase,
        title: p.title,
        weeks: p.weeks,
        focus: p.focus,
        milestones: (p.milestones ?? []).map((text) => ({ text, done: false })),
        habits: p.habits ?? [],
      }));

      // Increment the daily generation counter — generation (not saving) is the expensive AI step.
      await supabase.from("profiles").update({
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
