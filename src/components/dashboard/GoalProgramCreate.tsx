"use client";

import { useState } from "react";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Target, Flag, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { GoalCategory, GoalProgram, ProgramPhase } from "@/types";
import { GOAL_CATEGORIES, CATEGORY_PLACEHOLDERS } from "@/lib/goalProgram";
import { useGoalValidation } from "@/hooks/useGoalValidation";
import { toast } from "@/components/ui/Toast";
import posthog from "posthog-js";

interface ProgramPreview {
  program_name: string;
  program_overview: string;
  phases: ProgramPhase[];
}

interface DynamicQuestion {
  question: string;
  options: string[];
}

const LOADING_TIPS = [
  "Designing your phases…",
  "Picking habits that actually move the needle…",
  "Setting realistic weekly milestones…",
  "Almost there…",
];

const SKILL_OPTIONS = [
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
] as const;

const DURATION_OPTIONS = [
  { value: "under_6mo", label: "Under 6 months" },
  { value: "6mo_2yr",   label: "6 months–2 years" },
  { value: "2_5yr",     label: "2–5 years" },
  { value: "5yr_plus",  label: "5+ years" },
] as const;

// Skill level only makes sense where there's a skill to develop. For
// ongoing situations (a habit, a mental-health struggle, a relationship),
// "how long has this been going on" is the relevant fixed question instead.
const CATEGORY_FIXED_QUESTION: Record<GoalCategory, { question: string; options: readonly { value: string; label: string }[] }> = {
  sport:         { question: "What's your current skill level?",      options: SKILL_OPTIONS },
  body:          { question: "What's your current skill level?",      options: SKILL_OPTIONS },
  academic:      { question: "What's your current skill level?",      options: SKILL_OPTIONS },
  build:         { question: "What's your current skill level?",      options: SKILL_OPTIONS },
  finance:       { question: "What's your current skill level?",      options: SKILL_OPTIONS },
  bad_habit:     { question: "How long have you had this habit?",     options: DURATION_OPTIONS },
  mental_health: { question: "How long has this been affecting you?", options: DURATION_OPTIONS },
  relationships: { question: "How long has this been going on?",      options: DURATION_OPTIONS },
};

export default function GoalProgramCreate({ onCreated }: { onCreated: (program: GoalProgram) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [customModes, setCustomModes] = useState<boolean[]>([]);
  const [fixedAnswer, setFixedAnswer] = useState<string>("");
  const [preview, setPreview] = useState<ProgramPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [checkingFeasibility, setCheckingFeasibility] = useState(false);
  const [feasibilityConcern, setFeasibilityConcern] = useState<string | null>(null);

  const fixedQuestion = CATEGORY_FIXED_QUESTION[category ?? "sport"];
  const goalValidation = useGoalValidation(description, 700);

  const cycleTips = () => {
    const id = setInterval(() => setTipIdx((i) => (i + 1) % LOADING_TIPS.length), 1400);
    return id;
  };

  const goToQuestions = async () => {
    if (!category || !description.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/goal-program/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "questions", goalCategory: category, goalDescription: description }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't generate questions", "error"); return; }
      const qs: DynamicQuestion[] = data.questions ?? [];
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      // No options came back for a question — skip straight to free text for
      // that one rather than rendering an empty chip row (same rule HabitChipPicker
      // uses when there's nothing to pick from).
      setCustomModes(qs.map((q) => q.options.length === 0));
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const buildAnswers = () => [
    ...(fixedAnswer
      ? [{ question: fixedQuestion.question, answer: fixedQuestion.options.find((o) => o.value === fixedAnswer)?.label ?? fixedAnswer }]
      : []),
    ...questions.map((q, i) => ({ question: q.question, answer: answers[i] ?? "" })),
  ];

  const generateProgram = async () => {
    setStep(5);
    const tipTimer = cycleTips();
    try {
      const res = await fetch("/api/goal-program/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          goalCategory: category,
          goalDescription: description,
          answers: buildAnswers(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't generate your program", "error"); setStep(3); return; }
      setPreview(data.program);
      setStep(6);
    } finally {
      clearInterval(tipTimer);
    }
  };

  // Runs before generation — flags an extremely aggressive timeframe (without
  // blocking) so the user can choose to adjust it or proceed anyway. Fails
  // open: if this check itself errors, proceed straight to generation rather
  // than block program creation on a nice-to-have.
  const runFeasibilityCheck = async () => {
    setStep(4);
    setCheckingFeasibility(true);
    setFeasibilityConcern(null);
    try {
      const res = await fetch("/api/goal-program/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "feasibility",
          goalCategory: category,
          goalDescription: description,
          answers: buildAnswers(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.concern) {
        await generateProgram();
        return;
      }
      setFeasibilityConcern(data.concern);
      setCheckingFeasibility(false);
    } catch {
      await generateProgram();
    }
  };

  const startProgram = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await fetch("/api/goal-program/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "save", goalCategory: category, goalDescription: description, program: preview }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't start your program", "error"); return; }
      toast("Program started — Week 1 habits added to your dashboard 🎉", "success", undefined, 4000);
      posthog.capture("goal_program_created", { goal_category: category });
      onCreated(data.program);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-violet-500" : "bg-violet-950/60"}`} />
        ))}
      </div>

      {/* Step 1 — category */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-1">What do you want to achieve?</h2>
          <p className="text-sm text-slate-400 mb-4">Pick the area closest to your goal.</p>
          <div className="grid grid-cols-2 gap-3">
            {GOAL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.id); setFixedAnswer(""); setStep(2); }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-violet-900/25 bg-[#0f0f1a] hover:border-violet-600/50 hover:bg-violet-950/20 transition-all text-center"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-xs font-semibold text-slate-200 leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — description */}
      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-lg font-bold text-white mb-1">Tell me about your goal</h2>
          <p className="text-sm text-slate-400 mb-4">Be specific — timeframe, current level, what &ldquo;done&rdquo; looks like.</p>
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={600}
            placeholder={category ? CATEGORY_PLACEHOLDERS[category] : "e.g. I want to run a 5K in under 30 minutes by the end of the summer. I currently can jog about 10 minutes without stopping."}
            spellCheck="true" autoCorrect="on"
            className={`w-full bg-violet-950/30 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70 resize-none ${
              goalValidation.status === "not_a_goal" ? "border-red-600/50" :
              goalValidation.status === "too_vague"  ? "border-amber-600/50" :
              goalValidation.status === "good"       ? "border-emerald-600/40" : "border-violet-700/40"
            }`}
          />

          {/* AI goal-quality feedback — guidance only, never blocks Continue */}
          {goalValidation.status === "validating" && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1 py-1">
              <Sparkles className="w-3 h-3 animate-pulse text-violet-500 flex-shrink-0" />
              <span className="text-[10px] text-slate-400">Checking…</span>
            </div>
          )}
          {goalValidation.status === "good" && (
            <div className="mt-1.5 flex items-start gap-2 bg-emerald-950/40 border border-emerald-600/30 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-emerald-300 leading-snug">{goalValidation.message}</p>
            </div>
          )}
          {goalValidation.status === "too_vague" && (
            <div className="mt-1.5 flex items-start gap-2 bg-amber-950/40 border border-amber-600/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-amber-300 leading-snug">{goalValidation.message}</p>
            </div>
          )}
          {goalValidation.status === "not_a_goal" && (
            <div className="mt-1.5 flex items-start gap-2 bg-red-950/40 border border-red-600/30 rounded-lg px-3 py-2">
              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-red-300 leading-snug">{goalValidation.message}</p>
            </div>
          )}

          <button
            disabled={!description.trim() || busy}
            onClick={goToQuestions}
            className="w-full mt-4 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Continue
          </button>
        </div>
      )}

      {/* Step 3 — clarifying questions */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-lg font-bold text-white mb-1">A few quick questions</h2>
          <p className="text-sm text-slate-400 mb-4">This helps tailor the program to your situation.</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-violet-300 mb-1.5">{fixedQuestion.question}</p>
              <div className="flex flex-wrap gap-2">
                {fixedQuestion.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFixedAnswer(o.value)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                      fixedAnswer === o.value
                        ? "border-violet-500/60 bg-violet-600/15 ring-1 ring-violet-500/25 text-violet-100"
                        : "border-violet-900/30 bg-[#0f0f1a] text-slate-300 hover:border-violet-700/50 hover:bg-violet-950/30"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {questions.map((q, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-violet-300 mb-1.5">{q.question}</p>
                {!customModes[i] ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((prev) => prev.map((a, idx) => (idx === i ? opt : a)))}
                        className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                          answers[i] === opt
                            ? "border-violet-500/60 bg-violet-600/15 ring-1 ring-violet-500/25 text-violet-100"
                            : "border-violet-900/30 bg-[#0f0f1a] text-slate-300 hover:border-violet-700/50 hover:bg-violet-950/30"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomModes((prev) => prev.map((c, idx) => (idx === i ? true : c)));
                        setAnswers((prev) => prev.map((a, idx) => (idx === i ? "" : a)));
                      }}
                      className="px-3 py-2 rounded-full text-xs font-medium border border-dashed border-violet-800/40 text-slate-400 hover:text-slate-300 hover:border-violet-700/50 transition-all"
                    >
                      Something else…
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      autoFocus
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))}
                      className="w-full bg-violet-950/30 border border-violet-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70"
                      placeholder="Your answer…"
                      spellCheck="true" autoCorrect="on"
                    />
                    {q.options.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomModes((prev) => prev.map((c, idx) => (idx === i ? false : c)));
                          setAnswers((prev) => prev.map((a, idx) => (idx === i ? "" : a)));
                        }}
                        className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors"
                      >
                        ← Pick from options instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            disabled={!fixedAnswer}
            onClick={runFeasibilityCheck}
            className="w-full mt-4 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Generate my program
          </button>
        </div>
      )}

      {/* Step 4 — feasibility check, then either straight through to
          generation or a supportive heads-up if the timeframe is extreme */}
      {step === 4 && (
        <div className="py-10 flex flex-col items-center justify-center text-center gap-4">
          {checkingFeasibility ? (
            <>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-violet-900/40" />
                <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Checking your plan…</h2>
            </>
          ) : feasibilityConcern && (
            <div className="w-full text-left space-y-4">
              <div className="flex items-center gap-2 justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <h2 className="text-lg font-bold text-white">Quick gut check</h2>
              </div>
              <div className="bg-amber-950/20 border border-amber-700/30 rounded-2xl p-4">
                <p className="text-sm text-slate-300 leading-relaxed">{feasibilityConcern}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setFeasibilityConcern(null); setStep(2); }}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Adjust my timeframe
                </button>
                <button
                  onClick={generateProgram}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  Continue anyway
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5 — loading */}
      {step === 5 && (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-900/40" />
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Building your program</h2>
            <p className="text-sm font-medium text-slate-300">{LOADING_TIPS[tipIdx]}</p>
          </div>
        </div>
      )}

      {/* Step 6 — preview */}
      {step === 6 && preview && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1.5">Your Program</p>
            <h2 className="text-xl font-bold text-white">{preview.program_name}</h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{preview.program_overview}</p>
          </div>

          <div className="space-y-3">
            {preview.phases.map((phase) => (
              <div key={phase.phase} className="rounded-2xl border border-violet-900/25 bg-[#0f0f1a] p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {phase.phase}
                  </span>
                  <p className="text-sm font-bold text-white">{phase.title}</p>
                  <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{phase.weeks} wk{phase.weeks > 1 ? "s" : ""}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{phase.focus}</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {phase.habits.map((h) => (
                    <span key={h.name} title={h.why} className="text-[11px] font-medium text-violet-300 bg-violet-950/40 border border-violet-800/30 px-2 py-1 rounded-full">
                      {h.name}
                    </span>
                  ))}
                </div>

                <div className="space-y-1">
                  {phase.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Flag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      {m.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setFeasibilityConcern(null); setStep(1); }}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Start over
            </button>
            <button
              disabled={busy}
              onClick={startProgram}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Start my program
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
