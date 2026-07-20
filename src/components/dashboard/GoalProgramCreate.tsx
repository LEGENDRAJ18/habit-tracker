"use client";

import { useState } from "react";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Target, Flag } from "lucide-react";
import type { GoalCategory, GoalProgram, ProgramPhase } from "@/types";
import { GOAL_CATEGORIES } from "@/lib/goalProgram";
import { toast } from "@/components/ui/Toast";

interface ProgramPreview {
  program_name: string;
  program_overview: string;
  phases: ProgramPhase[];
}

const LOADING_TIPS = [
  "Designing your phases…",
  "Picking habits that actually move the needle…",
  "Setting realistic weekly milestones…",
  "Almost there…",
];

export default function GoalProgramCreate({ onCreated }: { onCreated: (program: GoalProgram) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [preview, setPreview] = useState<ProgramPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

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
      const qs: string[] = data.questions ?? [];
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const generateProgram = async () => {
    setStep(4);
    const tipTimer = cycleTips();
    try {
      const res = await fetch("/api/goal-program/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          goalCategory: category,
          goalDescription: description,
          answers: questions.map((q, i) => ({ question: q, answer: answers[i] ?? "" })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Couldn't generate your program", "error"); setStep(3); return; }
      setPreview(data.program);
      setStep(5);
    } finally {
      clearInterval(tipTimer);
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
      onCreated(data.program);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-violet-500" : "bg-violet-950/60"}`} />
        ))}
      </div>

      {/* Step 1 — category */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-1">What do you want to achieve?</h2>
          <p className="text-sm text-slate-500 mb-4">Pick the area closest to your goal.</p>
          <div className="grid grid-cols-2 gap-3">
            {GOAL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.id); setStep(2); }}
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
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-lg font-bold text-white mb-1">Tell me about your goal</h2>
          <p className="text-sm text-slate-500 mb-4">Be specific — timeframe, current level, what &ldquo;done&rdquo; looks like.</p>
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={600}
            placeholder="e.g. I want to run a 5K in under 30 minutes by the end of the summer. I currently can jog about 10 minutes without stopping."
            className="w-full bg-violet-950/30 border border-violet-700/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70 resize-none"
          />
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
          <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-lg font-bold text-white mb-1">A few quick questions</h2>
          <p className="text-sm text-slate-500 mb-4">This helps tailor the program to your situation.</p>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-violet-300 mb-1">{q}</p>
                <input
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))}
                  className="w-full bg-violet-950/30 border border-violet-700/40 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/70"
                  placeholder="Your answer…"
                />
              </div>
            ))}
          </div>
          <button
            onClick={generateProgram}
            className="w-full mt-4 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Generate my program
          </button>
        </div>
      )}

      {/* Step 4 — loading */}
      {step === 4 && (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-900/40" />
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
          </div>
          <p className="text-sm font-medium text-slate-300">{LOADING_TIPS[tipIdx]}</p>
        </div>
      )}

      {/* Step 5 — preview */}
      {step === 5 && preview && (
        <div className="space-y-4">
          <div className="text-center">
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
                  <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">{phase.weeks} wk{phase.weeks > 1 ? "s" : ""}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{phase.focus}</p>

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
                      <Flag className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      {m.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
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
