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
    if (phaseIdx === -1 || !phases[phaseIdx].milestones[milestoneIndex]) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    phases[phaseIdx] = {
      ...phases[phaseIdx],
      milestones: phases[phaseIdx].milestones.map((m, i) => (i === milestoneIndex ? { ...m, done: true } : m)),
    };

    const phaseComplete = phases[phaseIdx].milestones.every((m) => m.done);
    const isLastPhase = phaseIdx === phases.length - 1;

    let currentPhase = program.current_phase;
    let currentWeek = program.current_week;
    let status = program.status;
    const habitsToAdd: Array<{ name: string; frequency: "daily" | "weekly" }> = [];

    if (phaseComplete && isLastPhase) {
      status = "completed";
    } else if (phaseComplete) {
      currentPhase = phase + 1;
      currentWeek = 1;
      const nextPhase = phases[phaseIdx + 1];
      if (nextPhase) habitsToAdd.push(...nextPhase.habits.map((h) => ({ name: h.name, frequency: h.frequency })));
    } else {
      currentWeek = Math.min(phases[phaseIdx].weeks, program.current_week + 1);
    }

    const { data: updated, error } = await supabase
      .from("goal_programs")
      .update({
        phases,
        current_phase: currentPhase,
        current_week: currentWeek,
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

    return NextResponse.json({ program: updated, advancedToNextPhase: phaseComplete && !isLastPhase, completed: status === "completed" });
  } catch (err) {
    console.error("[goal-program/complete-milestone]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Couldn't complete milestone" }, { status: 500 });
  }
}
