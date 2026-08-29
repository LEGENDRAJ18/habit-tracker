import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProgramPhase } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { phase?: number; milestoneIndex?: number };
    const { phase, milestoneIndex } = body;
    if (phase == null || milestoneIndex == null) {
      return NextResponse.json({ error: "Missing phase or milestoneIndex" }, { status: 400 });
    }

    const { data: program } = await supabase
      .from("goal_programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!program) return NextResponse.json({ error: "No active program" }, { status: 404 });

    const phases = (program.phases as ProgramPhase[]) ?? [];
    const phaseIdx = phases.findIndex((p) => p.phase === phase);
    if (phaseIdx === -1) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Some already-saved programs (generated before milestone counts were
    // guaranteed to match week counts) can have a week with no milestone at
    // this index. Mark it done if it exists, but don't require one to exist
    // — a week isn't required to have a milestone to be advanced past.
    const hasMilestone = !!phases[phaseIdx].milestones[milestoneIndex];
    if (hasMilestone) {
      phases[phaseIdx] = {
        ...phases[phaseIdx],
        milestones: phases[phaseIdx].milestones.map((m, i) => (i === milestoneIndex ? { ...m, done: true } : m)),
      };
    }

    // Phase completion is driven by the phase's "weeks" value, not by
    // whether every milestone is done — the milestones array isn't
    // guaranteed to have one entry per week for older programs, so tying
    // completion to it either ends a phase early (too few milestones) or
    // strands the user (too many, with no further milestone to mark).
    const isLastWeekOfPhase = milestoneIndex + 1 >= phases[phaseIdx].weeks;
    const isLastPhase = phaseIdx === phases.length - 1;

    let currentPhase = program.current_phase;
    let currentWeek = program.current_week;
    let currentWeekStartedAt = program.current_week_started_at;
    let status = program.status;
    // A stale proposal about a phase/week the user has since moved past on
    // their own would be confusing — clear it on any real advance.
    let pendingAdjustment = program.pending_adjustment;
    const habitsToAdd: Array<{ name: string; frequency: "daily" | "weekly" }> = [];

    if (isLastWeekOfPhase && isLastPhase) {
      status = "completed";
    } else if (isLastWeekOfPhase) {
      currentPhase = phase + 1;
      currentWeek = 1;
      currentWeekStartedAt = new Date().toISOString();
      pendingAdjustment = null;
      const nextPhase = phases[phaseIdx + 1];
      if (nextPhase) habitsToAdd.push(...nextPhase.habits.map((h) => ({ name: h.name, frequency: h.frequency })));
    } else {
      currentWeek = program.current_week + 1;
      currentWeekStartedAt = new Date().toISOString();
      pendingAdjustment = null;
    }

    const { data: updated, error } = await supabase
      .from("goal_programs")
      .update({
        phases,
        current_phase: currentPhase,
        current_week: currentWeek,
        current_week_started_at: currentWeekStartedAt,
        pending_adjustment: pendingAdjustment,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", program.id)
      .select()
      .single();

    if (error || !updated) return NextResponse.json({ error: error?.message ?? "Couldn't update program" }, { status: 500 });

    if (habitsToAdd.length > 0) {
      await supabase.from("habits").insert(
        habitsToAdd.map((h) => ({
          user_id: user.id,
          name: h.name,
          frequency: h.frequency,
          program_id: program.id,
          program_phase: currentPhase,
          program_week: 1,
        })),
      );
    }

    // Retire the just-completed phase's habits so they stop accumulating on
    // the dashboard — soft-archive only (is_active: false), habit_logs and
    // streak history are untouched. Only on a real phase transition, not on
    // final program completion (the last phase's habits can reasonably keep
    // going as the user's new baseline).
    const advancedToNextPhase = isLastWeekOfPhase && !isLastPhase;
    let retiredHabitCount = 0;
    if (advancedToNextPhase) {
      const { data: retired } = await supabase
        .from("habits")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("program_id", program.id)
        .eq("program_phase", phase)
        .select("id");
      retiredHabitCount = retired?.length ?? 0;
    }

    return NextResponse.json({ program: updated, advancedToNextPhase, retiredHabitCount, completed: status === "completed" });
  } catch (err) {
    console.error("[goal-program/complete-milestone]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Couldn't complete milestone" }, { status: 500 });
  }
}
