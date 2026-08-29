// Accept or decline the AI-generated proposal from Stage 3
// (goal_programs.pending_adjustment). This is the only place either type
// of adjustment actually mutates a live program — everything upstream
// (the cadence cron) only ever reads and proposes.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_MILESTONE_TEXT } from "@/lib/goalProgram";
import type { PendingAdjustment, ProgramMilestone, ProgramPhase } from "@/types";

// Pads a phase's existing milestones up to a new (larger) length, appending
// generic filler entries — unlike the generation-time normalizer, this
// preserves each existing milestone's done state rather than discarding it,
// since accepting "extend_phase" mid-phase can be applied after some of
// this phase's weeks are already marked complete.
function padMilestones(milestones: ProgramMilestone[], targetLength: number): ProgramMilestone[] {
  if (milestones.length >= targetLength) return milestones;
  const padded = [...milestones];
  while (padded.length < targetLength) {
    padded.push({ text: FALLBACK_MILESTONE_TEXT, done: false });
  }
  return padded;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { action?: "accept" | "decline" };
    const { action } = body;
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: program } = await supabase
      .from("goal_programs")
      .select("id, current_phase, phases, pending_adjustment")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!program) return NextResponse.json({ error: "No active program" }, { status: 404 });

    const adjustment = program.pending_adjustment as PendingAdjustment | null;
    if (!adjustment || adjustment.status !== "pending") {
      return NextResponse.json({ error: "No pending adjustment to respond to" }, { status: 404 });
    }

    if (action === "decline") {
      const { data: updated, error } = await supabase
        .from("goal_programs")
        .update({
          pending_adjustment: { ...adjustment, status: "declined", resolved_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq("id", program.id)
        .select()
        .single();

      if (error || !updated) return NextResponse.json({ error: error?.message ?? "Couldn't decline adjustment" }, { status: 500 });
      return NextResponse.json({ program: updated });
    }

    // ── Accept ────────────────────────────────────────────────────────────
    const resolvedAdjustment: PendingAdjustment = { ...adjustment, status: "accepted", resolved_at: new Date().toISOString() };

    if (adjustment.type === "deactivate_habit") {
      if (adjustment.habit_id) {
        // No-op if the habit no longer exists or was already deactivated —
        // fail open rather than block the accept on a stale reference.
        await supabase.from("habits").update({ is_active: false }).eq("id", adjustment.habit_id).eq("user_id", user.id);
      }

      const { data: updated, error } = await supabase
        .from("goal_programs")
        .update({ pending_adjustment: resolvedAdjustment, updated_at: new Date().toISOString() })
        .eq("id", program.id)
        .select()
        .single();

      if (error || !updated) return NextResponse.json({ error: error?.message ?? "Couldn't apply adjustment" }, { status: 500 });
      return NextResponse.json({ program: updated });
    }

    // extend_phase
    const phases = (program.phases as ProgramPhase[]) ?? [];
    const phaseIdx = phases.findIndex((p) => p.phase === program.current_phase);
    if (phaseIdx === -1) {
      return NextResponse.json({ error: "Current phase not found" }, { status: 404 });
    }

    const extraWeeks = Math.min(2, Math.max(1, Math.round(Number(adjustment.extra_weeks)) || 1));
    const newWeeks = phases[phaseIdx].weeks + extraWeeks;
    phases[phaseIdx] = {
      ...phases[phaseIdx],
      weeks: newWeeks,
      milestones: padMilestones(phases[phaseIdx].milestones, newWeeks),
    };

    const { data: updated, error } = await supabase
      .from("goal_programs")
      .update({ phases, pending_adjustment: resolvedAdjustment, updated_at: new Date().toISOString() })
      .eq("id", program.id)
      .select()
      .single();

    if (error || !updated) return NextResponse.json({ error: error?.message ?? "Couldn't apply adjustment" }, { status: 500 });
    return NextResponse.json({ program: updated });
  } catch (err) {
    console.error("[goal-program/respond-adjustment]", err);
    return NextResponse.json({ error: (err as Error).message ?? "Couldn't respond to adjustment" }, { status: 500 });
  }
}
