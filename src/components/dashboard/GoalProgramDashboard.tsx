"use client";

import { useMemo, useState } from "react";
import { Flag, Loader2, Star, TrendingDown, CheckCircle2, Pause, Play, Ban } from "lucide-react";
import type { GoalProgram, Habit, ProgramCheckin } from "@/types";
import { toast } from "@/components/ui/Toast";
import CenteredModal from "@/components/ui/CenteredModal";
import posthog from "posthog-js";

interface Props {
  program: GoalProgram;
  checkins: ProgramCheckin[];
  habits: Habit[];
  historicalLogs: Array<{ habit_id: string; completed_at: string }>;
  isCompletedToday: (habitId: string) => boolean;
  onProgramUpdated: (program: GoalProgram) => void;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

const WENT_WELL_OPTIONS = [
  "Stayed consistent",
  "Built a routine",
  "Felt more confident",
  "Saw real progress",
  "Had good support",
];

const WAS_HARD_OPTIONS = [
  "Hard to find time",
  "Lost motivation",
  "Life got busy",
  "Didn't see progress yet",
  "Forgot / lost track",
];

// Tap-to-pick chip field with an "Other" fallback that reveals free text only
// when tapped — same mechanics as the Goal Program creation flow's dynamic
// questions and HabitChipPicker.
function CheckinChipField({
  label, options, value, onChange, customMode, onToggleCustom,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  customMode: boolean;
  onToggleCustom: (v: boolean) => void;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-slate-400 mb-1.5 block">{label}</label>
      {!customMode ? (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                value === opt
                  ? "border-violet-500/60 bg-violet-600/15 ring-1 ring-violet-500/25 text-violet-100"
                  : "border-violet-900/30 bg-[#0f0f1a] text-slate-300 hover:border-violet-700/50 hover:bg-violet-950/30"
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { onToggleCustom(true); onChange(""); }}
            className="px-3 py-2 rounded-full text-xs font-medium border border-dashed border-violet-800/40 text-slate-400 hover:text-slate-300 hover:border-violet-700/50 transition-all"
          >
            Other…
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            maxLength={300}
            spellCheck="true" autoCorrect="on"
            className="w-full bg-violet-950/30 border border-violet-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70 resize-none"
          />
          <button
            type="button"
            onClick={() => { onToggleCustom(false); onChange(""); }}
            className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors"
          >
            ← Pick from options instead
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalProgramDashboard({
  program, checkins, habits, historicalLogs, isCompletedToday, onProgramUpdated,
}: Props) {
  const [completing, setCompleting] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [rating, setRating] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [wasHard, setWasHard] = useState("");
  const [wentWellCustom, setWentWellCustom] = useState(false);
  const [wasHardCustom, setWasHardCustom] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const phase = program.phases.find((p) => p.phase === program.current_phase);
  const milestone = phase?.milestones[program.current_week - 1];
  const totalWeeks = program.phases.reduce((s, p) => s + p.weeks, 0);
  const weeksDone = program.phases.filter((p) => p.phase < program.current_phase).reduce((s, p) => s + p.weeks, 0) + (program.current_week - 1);
  const progressPct = totalWeeks > 0 ? Math.min(100, Math.round((weeksDone / totalWeeks) * 100)) : 0;

  const programHabits = useMemo(() => habits.filter((h) => h.program_id === program.id), [habits, program.id]);
  const programHabitIds = useMemo(() => new Set(programHabits.map((h) => h.id)), [programHabits]);

  const todayCompletionRate = programHabits.length > 0
    ? Math.round((programHabits.filter((h) => isCompletedToday(h.id)).length / programHabits.length) * 100)
    : 0;

  // "Life got busy?" intervention: completion rate under 60% for the last 3 days
  const needsIntervention = useMemo(() => {
    if (programHabits.length === 0) return false;
    const dateSet = new Map<string, number>();
    for (const log of historicalLogs) {
      if (!programHabitIds.has(log.habit_id)) continue;
      const d = log.completed_at.split("T")[0];
      dateSet.set(d, (dateSet.get(d) ?? 0) + 1);
    }
    const days = [daysAgo(1), daysAgo(2), daysAgo(3)];
    const rates = days.map((d) => (dateSet.get(d) ?? 0) / programHabits.length);
    return rates.every((r) => r < 0.6);
  }, [historicalLogs, programHabitIds, programHabits.length]);

  const latestCheckin = checkins[0];

  const markMilestoneComplete = async () => {
    if (!phase) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/goal-program/complete-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: phase.phase, milestoneIndex: program.current_week - 1 }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't update milestone", "error"); return; }
      posthog.capture("goal_program_milestone_completed", {
        phase: phase.phase,
        milestone_index: program.current_week - 1,
        program_completed: !!data.completed,
      });
      onProgramUpdated(data.program);
      if (data.completed) toast("🎉 Program complete — incredible work!", "success", undefined, 5000);
      else if (data.advancedToNextPhase) toast("Phase complete! Moving to the next phase.", "success", undefined, 3500);
      else toast("Milestone marked complete", "success", undefined, 2000);
    } finally {
      setCompleting(false);
    }
  };

  const submitCheckin = async () => {
    if (rating === 0) { toast("Pick a rating first", "warning"); return; }
    setCheckinSubmitting(true);
    try {
      const res = await fetch("/api/goal-program/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, whatWentWell: wentWell, whatWasHard: wasHard }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't submit check-in", "error"); return; }
      toast("Check-in saved", "success", undefined, 2500);
      setShowCheckin(false);
      setRating(0); setWentWell(""); setWasHard(""); setWentWellCustom(false); setWasHardCustom(false);
      // Optimistically prepend — parent re-fetches on next load
      checkins.unshift(data.checkin);
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const updateStatus = async (status: "paused" | "active" | "abandoned") => {
    setStatusBusy(true);
    try {
      const res = await fetch("/api/goal-program/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't update program", "error"); return; }
      onProgramUpdated(data.program);
      toast(status === "abandoned" ? "Program abandoned" : status === "paused" ? "Program paused" : "Program resumed", "success");
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-violet-600/25 bg-gradient-to-br from-violet-950/50 to-[#0f0f1a] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">{program.program_name}</h1>
            <p className="text-xs text-slate-400 mt-1">Phase {program.current_phase} of {program.phases.length} · Week {program.current_week}{phase ? ` of ${phase.weeks}` : ""}</p>
          </div>
          {program.status === "active" ? (
            <button disabled={statusBusy} onClick={() => updateStatus("paused")} className="flex-shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-300 transition-colors">
              <Pause className="w-3 h-3" /> Pause
            </button>
          ) : program.status === "paused" ? (
            <button disabled={statusBusy} onClick={() => updateStatus("active")} className="flex-shrink-0 flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">
              <Play className="w-3 h-3" /> Resume
            </button>
          ) : null}
        </div>
        <div className="mt-3 w-full h-2 bg-violet-950/60 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{progressPct}% through the program</p>
      </div>

      {program.status === "paused" && (
        <div className="rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4 text-sm text-amber-300">
          This program is paused — habits stay on your dashboard, but progress tracking is on hold.
        </div>
      )}

      {/* Intervention */}
      {needsIntervention && program.status === "active" && (
        <div className="rounded-2xl border border-amber-600/30 bg-amber-950/20 p-4 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-300">Life got busy? Let&apos;s adjust.</p>
            <p className="text-xs text-slate-400 mt-1">Your program habits have been under 60% for the last 3 days. Consider pausing until you have more bandwidth, or check in below for a nudge.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => updateStatus("paused")} className="text-xs font-semibold text-amber-300 hover:text-amber-200">Pause program</button>
              <span className="text-slate-400">·</span>
              <button onClick={() => setShowCheckin(true)} className="text-xs font-semibold text-amber-300 hover:text-amber-200">Check in</button>
            </div>
          </div>
        </div>
      )}

      {/* Current milestone — some already-saved programs can have a week
          with no milestone at this index (generated before milestone counts
          were guaranteed to match week counts); still let the user advance. */}
      {phase && (
        <div className="rounded-2xl border border-violet-900/25 bg-[#0f0f1a] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flag className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
              {milestone ? "This week's milestone" : `Week ${program.current_week}`}
            </p>
          </div>
          <p className="text-sm text-white mb-3">
            {milestone ? milestone.text : "No specific milestone this week — just keep at it."}
          </p>
          {milestone?.done ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </span>
          ) : (
            <button
              disabled={completing}
              onClick={markMilestoneComplete}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60"
            >
              {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {milestone ? "Mark complete" : "Continue to next week"}
            </button>
          )}
        </div>
      )}

      {/* This week's habit completion */}
      {programHabits.length > 0 && (
        <div className="rounded-2xl border border-violet-900/25 bg-[#0f0f1a] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400">Today&apos;s program habits</p>
            <span className="text-xs font-bold text-violet-400">{todayCompletionRate}%</span>
          </div>
          <div className="w-full h-1.5 bg-violet-950/60 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${todayCompletionRate}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {programHabits.map((h) => (
              <span key={h.id} className={`text-[11px] font-medium px-2 py-1 rounded-full border ${
                isCompletedToday(h.id) ? "text-emerald-300 bg-emerald-950/30 border-emerald-700/30" : "text-slate-400 bg-white/5 border-white/10"
              }`}>
                {h.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI encouragement */}
      {latestCheckin?.ai_response && (
        <div className="rounded-2xl border border-violet-900/25 bg-[#0f0f1a] p-4">
          <p className="text-xs font-semibold text-violet-400 mb-1.5">Your coach says</p>
          <p className="text-sm text-slate-300 leading-relaxed">{latestCheckin.ai_response}</p>
        </div>
      )}

      {/* Weekly check-in CTA */}
      {program.status === "active" && (
        <button
          onClick={() => setShowCheckin(true)}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-violet-300 border border-violet-700/40 hover:bg-violet-950/30 transition-all"
        >
          Weekly check-in
        </button>
      )}

      {program.status !== "abandoned" && (
        <button
          disabled={statusBusy}
          onClick={() => updateStatus("abandoned")}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          <Ban className="w-3 h-3" /> Abandon program
        </button>
      )}

      {showCheckin && (
        <CenteredModal onClose={() => setShowCheckin(false)}>
          <div className="w-full max-w-sm bg-[#0f0f1a] border border-violet-900/30 rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-3">Week {program.current_week} check-in</h3>
            <p className="text-xs text-slate-400 mb-1.5">How did this week go?</p>
            <div className="flex gap-1.5 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}>
                  <Star className={`w-7 h-7 transition-colors ${n <= rating ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                </button>
              ))}
            </div>
            <CheckinChipField
              label="What went well?"
              options={WENT_WELL_OPTIONS}
              value={wentWell}
              onChange={setWentWell}
              customMode={wentWellCustom}
              onToggleCustom={setWentWellCustom}
            />
            <CheckinChipField
              label="What was hard?"
              options={WAS_HARD_OPTIONS}
              value={wasHard}
              onChange={setWasHard}
              customMode={wasHardCustom}
              onToggleCustom={setWasHardCustom}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCheckin(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
              <button disabled={checkinSubmitting} onClick={submitCheckin} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                {checkinSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
        </CenteredModal>
      )}
    </div>
  );
}
