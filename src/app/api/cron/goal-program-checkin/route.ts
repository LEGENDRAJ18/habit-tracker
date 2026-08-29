// Daily Goal Program cadence + struggle-detection + AI proposal generation
// (Stages 1-3). Never mutates phases/current_week/current_phase/habits —
// the only writes are last_nudged_at (Stage 1 idempotency) and
// pending_adjustment (Stage 3's generated proposal, read-only in the UI
// until Stage 4 adds accept/decline). The user still drives all real
// progress entirely via "Mark complete".
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushNotify } from "@/lib/pushNotify";
import { callOpenAIJSON } from "@/lib/openai";
import type { PendingAdjustment, ProgramPhase } from "@/types";

const OVERDUE_DAYS = 7;
const COMPLETION_WINDOW_DAYS = 7;
const COMPLETION_THRESHOLD = 0.5;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

interface HabitCompletion {
  id: string;
  name: string;
  completedCount: number;
}

// Per-habit completion counts over the trailing week, across this program's
// CURRENT active habits only (retired-phase habits are already
// is_active: false, so this naturally scopes to the current phase). Returns
// null for programs under a week old or with no active habits — not
// enough signal either way, and nothing to build a proposal from.
async function getCompletionSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  programId: string,
  startedAt: string,
  now: Date,
): Promise<HabitCompletion[] | null> {
  const programAgeDays = (now.getTime() - new Date(startedAt).getTime()) / 86_400_000;
  if (programAgeDays < COMPLETION_WINDOW_DAYS) return null;

  const { data: activeHabits } = await admin
    .from("habits")
    .select("id, name")
    .eq("program_id", programId)
    .eq("is_active", true);
  if (!activeHabits || activeHabits.length === 0) return null;

  const windowStart = new Date(now.getTime() - COMPLETION_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: logs } = await admin
    .from("habit_logs")
    .select("habit_id")
    .in("habit_id", activeHabits.map((h) => h.id))
    .neq("outcome", "failed")
    .gte("completed_at", windowStart);

  const counts = new Map<string, number>();
  for (const log of logs ?? []) {
    counts.set(log.habit_id, (counts.get(log.habit_id) ?? 0) + 1);
  }

  return activeHabits.map((h) => ({ id: h.id, name: h.name, completedCount: counts.get(h.id) ?? 0 }));
}

function isLowCompletion(snapshot: HabitCompletion[] | null): boolean {
  if (!snapshot || snapshot.length === 0) return false;
  const totalCompleted = snapshot.reduce((s, h) => s + h.completedCount, 0);
  const possible = snapshot.length * COMPLETION_WINDOW_DAYS;
  return possible > 0 && totalCompleted / possible < COMPLETION_THRESHOLD;
}

// Calls the AI once to propose ONE concrete adjustment, given real
// per-habit completion data and phase timing. Never applies anything —
// Stage 4 adds the accept/decline path. Returns null (storing nothing) if
// the AI call fails or its response doesn't validate cleanly against the
// active habits actually on this program — fails open, retried on the
// next cron run since pending_adjustment stays unset.
async function generateProposal(
  program: { program_name: string; goal_description: string; current_phase: number; current_week: number; phases: ProgramPhase[] },
  snapshot: HabitCompletion[],
  reasons: string[],
): Promise<PendingAdjustment | null> {
  const phase = program.phases.find((p) => p.phase === program.current_phase);
  if (!phase) return null;

  const habitLines = snapshot
    .map((h) => `- ${h.name}: ${h.completedCount}/${COMPLETION_WINDOW_DAYS} days (${Math.round((h.completedCount / COMPLETION_WINDOW_DAYS) * 100)}%)`)
    .join("\n");

  const systemPrompt = `You are a supportive, honest coach reviewing why someone's Goal Program phase has been hard, so you can suggest ONE concrete, small adjustment to help. This reasoning will be shown to them directly as a message from their coach — write it speaking to them directly ("you've...", "this phase..."), not about them in the third person.

You have exactly two possible adjustments — pick whichever ONE fits their specific situation, don't hedge between both:
1. "extend_phase" — give them more time on the CURRENT phase before moving to the next one. Use this when the phase broadly feels too fast for where they are, not just one habit.
2. "deactivate_habit" — pause ONE specific habit that's clearly dragging completion down, while leaving the rest of the phase as-is. Use this when most habits are going fine but one specific habit is the real sticking point — its completion should be clearly worse than the others.

Respond with valid JSON exactly matching this schema:
{
  "type": "extend_phase" | "deactivate_habit",
  "reasoning": "2-3 sentences, warm and specific — reference what's actually been happening, not generic encouragement",
  "habitName": "the exact habit name to pause, copied exactly from the list below — REQUIRED if type is deactivate_habit, omit entirely otherwise",
  "extraWeeks": 1 or 2 — REQUIRED if type is extend_phase, omit entirely otherwise
}`;

  const userPrompt = `Program: "${program.program_name}" (goal: ${program.goal_description})
Currently on Phase ${program.current_phase} ("${phase.title}", ${phase.weeks} weeks total) — week ${program.current_week} within this phase. Phase focus: ${phase.focus}

Why this got flagged:
${reasons.join("\n")}

Per-habit completion over the last ${COMPLETION_WINDOW_DAYS} days:
${habitLines}

Suggest ONE adjustment now.`;

  let result: { type?: string; reasoning?: string; habitName?: string; extraWeeks?: number };
  try {
    result = await callOpenAIJSON(systemPrompt, userPrompt) as typeof result;
  } catch (err) {
    console.error("[cron/goal-program-checkin] proposal generation failed", err);
    return null;
  }

  if (!result.reasoning?.trim()) return null;

  if (result.type === "deactivate_habit") {
    const matched = snapshot.find((h) => h.name.trim() === result.habitName?.trim());
    if (!matched) return null;
    return {
      type: "deactivate_habit",
      reasoning: result.reasoning.trim(),
      habit_id: matched.id,
      habit_name: matched.name,
      proposed_at: new Date().toISOString(),
    };
  }

  if (result.type === "extend_phase") {
    const extraWeeks = Math.min(2, Math.max(1, Math.round(Number(result.extraWeeks)) || 1));
    return {
      type: "extend_phase",
      reasoning: result.reasoning.trim(),
      extra_weeks: extraWeeks,
      proposed_at: new Date().toISOString(),
    };
  }

  return null;
}

async function runGoalProgramCheckin() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: programs, error } = await admin
    .from("goal_programs")
    .select("id, user_id, program_name, goal_description, current_phase, current_week, current_week_started_at, last_nudged_at, started_at, phases, pending_adjustment")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!programs || programs.length === 0) {
    return { checked: 0, nudged: 0, struggling: 0, proposed: 0, timestamp: now.toISOString() };
  }

  let nudged = 0;
  let strugglingCount = 0;
  let proposed = 0;
  for (const program of programs) {
    try {
      const weekStarted = new Date(program.current_week_started_at);
      const daysSince = (now.getTime() - weekStarted.getTime()) / 86_400_000;
      const stalled = daysSince >= OVERDUE_DAYS;

      let overdue = false;
      if (stalled) {
        const { data: checkin } = await admin
          .from("program_checkins")
          .select("id")
          .eq("program_id", program.id)
          .eq("week_number", program.current_week)
          .limit(1)
          .maybeSingle();
        overdue = !checkin;
      }

      const snapshot = await getCompletionSnapshot(admin, program.id, program.started_at, now);
      const lowCompletion = isLowCompletion(snapshot);

      // "Two consecutive missed check-ins" only makes sense once the
      // current week is itself already overdue with no check-in, and only
      // from week 2 onward — week 1 of a fresh phase gets a clean slate.
      let missedTwoInARow = false;
      if (overdue && program.current_week >= 2) {
        const { data: prevCheckin } = await admin
          .from("program_checkins")
          .select("id")
          .eq("program_id", program.id)
          .eq("week_number", program.current_week - 1)
          .limit(1)
          .maybeSingle();
        missedTwoInARow = !prevCheckin;
      }

      const struggling = lowCompletion || missedTwoInARow;

      // Generate a proposal at most once per unresolved struggle episode —
      // independent of the push-nudge idempotency below, since "have we
      // already proposed something" isn't a daily concern. Cleared by
      // complete-milestone on any real advance (a stale proposal about a
      // phase the user has since moved past would be confusing).
      if (struggling && !program.pending_adjustment && snapshot) {
        const reasons: string[] = [];
        if (lowCompletion) reasons.push("Completion across active habits has averaged under 50% over the last 7 days.");
        if (missedTwoInARow) reasons.push("No check-in was submitted for either of the last two weeks.");

        const proposal = await generateProposal(
          {
            program_name: program.program_name,
            goal_description: program.goal_description,
            current_phase: program.current_phase,
            current_week: program.current_week,
            phases: (program.phases as ProgramPhase[]) ?? [],
          },
          snapshot,
          reasons,
        );
        if (proposal) {
          await admin.from("goal_programs").update({ pending_adjustment: proposal }).eq("id", program.id);
          proposed++;
        }
      }

      if (!overdue && !struggling) continue;

      // Already nudged for this specific week cycle — current_week_started_at
      // only moves forward on a real transition (Stage 0), so this naturally
      // resets once the week actually advances.
      if (program.last_nudged_at && new Date(program.last_nudged_at) >= weekStarted) continue;

      const payload = struggling
        ? {
            title: "Rough patch?",
            body: `"${program.program_name}" has looked tough this week — we'll check in on this soon.`,
            tag: "goal_program_struggle",
            url: "/goal-program",
          }
        : {
            title: `Week ${program.current_week} check-in?`,
            body: `You're on Week ${program.current_week} of "${program.program_name}" — still on track?`,
            tag: "goal_program_nudge",
            url: "/goal-program",
          };

      await pushNotify(admin, program.user_id, payload, "general");

      await admin.from("goal_programs").update({ last_nudged_at: now.toISOString() }).eq("id", program.id);
      nudged++;
      if (struggling) strugglingCount++;
    } catch (err) {
      console.error("[cron/goal-program-checkin] failed for program", program.id, err);
    }
  }

  return { checked: programs.length, nudged, struggling: strugglingCount, proposed, timestamp: now.toISOString() };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runGoalProgramCheckin());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runGoalProgramCheckin());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
