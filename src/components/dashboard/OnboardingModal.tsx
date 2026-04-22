"use client";

import { useState, useMemo } from "react";
import { Sparkles, ChevronRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Data ────────────────────────────────────────────────────────────────────

const GOALS = [
  { id: "fitness",    emoji: "🏋️", label: "Get fit & healthy"    },
  { id: "learn",      emoji: "📚", label: "Learn & grow"          },
  { id: "mental",     emoji: "🧠", label: "Build mental wellness" },
  { id: "productive", emoji: "💰", label: "Be more productive"    },
  { id: "sleep",      emoji: "😴", label: "Improve sleep"         },
  { id: "custom",     emoji: "🎯", label: "Custom goal"           },
] as const;

const HABIT_COUNTS = [
  { id: "1-2", emoji: "🌱", label: "Just 1–2", sub: "Easy start — build the habit first" },
  { id: "3-5", emoji: "⚡", label: "3–5",      sub: "Balanced — steady daily growth"     },
  { id: "6+",  emoji: "🔥", label: "6+",       sub: "Full commitment — go all in"        },
] as const;

const REMINDER_TIMES = [
  { id: "morning",   emoji: "🌅", label: "Morning",   sub: "7–9 am"  },
  { id: "afternoon", emoji: "☀️", label: "Afternoon", sub: "12–2 pm" },
  { id: "evening",   emoji: "🌙", label: "Evening",   sub: "7–9 pm"  },
] as const;

const CONFETTI_COLORS = [
  "#8b5cf6","#a78bfa","#c4b5fd","#fbbf24","#f59e0b",
  "#e879f9","#60a5fa","#34d399","#fb923c","#f472b6","#ffffff",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 72 }, (_, i) => ({
        id: i,
        x: (i * 1.389) % 100,
        delay: (i * 0.041) % 3,
        duration: 2.4 + (i * 0.029) % 2.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + (i * 0.17) % 9,
        isCircle: i % 4 !== 0,
        rot: (i * 43) % 360,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-12px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            opacity: 0.9,
            ["--rot" as string]: `${p.rot}deg`,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in both`,
          }}
        />
      ))}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200 ${
        selected
          ? "border-violet-500/60 bg-violet-600/18 shadow-sm shadow-violet-950/40 ring-1 ring-violet-500/25"
          : "border-violet-900/20 bg-[#0f0f1a] hover:border-violet-700/35 hover:bg-violet-950/30"
      }`}
    >
      {children}
    </button>
  );
}

function SelectDot({ selected }: { selected: boolean }) {
  return (
    <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
      selected ? "border-violet-500 bg-violet-500" : "border-slate-700"
    }`}>
      {selected && <Check className="w-3 h-3 text-white stroke-[3]" />}
    </div>
  );
}

function NextButton({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep]               = useState(1);
  const [goal, setGoal]               = useState("");
  const [customGoal, setCustomGoal]   = useState("");
  const [habitCount, setHabitCount]   = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [saving, setSaving]           = useState(false);

  const selectedGoal  = GOALS.find((g) => g.id === goal);
  const goalLabel     = goal === "custom" ? (customGoal.trim() || "Your goal") : (selectedGoal?.label ?? "");
  const goalEmoji     = selectedGoal?.emoji ?? "🎯";

  const canProceed =
    step === 1 ? true
    : step === 2 ? goal !== "" && (goal !== "custom" || customGoal.trim() !== "")
    : step === 3 ? habitCount !== ""
    : step === 4 ? reminderTime !== ""
    : true;

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          onboarding_completed: true,
          goal: goalLabel,
          habit_count_preference: habitCount,
          reminder_time: reminderTime,
        }).eq("id", user.id);
      }
    } catch {
      // fail silently — modal still closes
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  // Step progress dots
  const TOTAL = 5;
  const dots = (
    <div className="flex gap-2 justify-center mb-10">
      {Array.from({ length: TOTAL }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={`h-1 rounded-full transition-all duration-500 ${
            s === step ? "w-8 bg-violet-500"
            : s < step  ? "w-4 bg-violet-700/60"
            :              "w-4 bg-slate-800"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#09090f] flex flex-col items-center justify-center px-4 py-10 overflow-auto">
      {/* Ambient glows */}
      <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-purple-700/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Back link */}
        {step > 1 && step < 5 && (
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}

        {dots}

        {/* Step content — key forces remount so CSS animation replays */}
        <div key={step} style={{ animation: "stepIn 0.28s ease-out both" }}>

          {/* ── Step 1: Welcome ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-7 shadow-2xl shadow-violet-900/50">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  habitAI
                </span>
              </h1>
              <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-xs mx-auto">
                Let&apos;s set you up for success in just a few quick steps.
              </p>
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 text-sm"
              >
                Get Started
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Goal ────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">What&apos;s your main goal?</h2>
              <p className="text-slate-400 text-sm mb-6">
                We&apos;ll personalise your experience around it.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {GOALS.map((g) => (
                  <OptionCard
                    key={g.id}
                    selected={goal === g.id}
                    onClick={() => setGoal(g.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none flex-shrink-0">{g.emoji}</span>
                      <span className={`text-xs font-medium leading-snug ${goal === g.id ? "text-violet-100" : "text-slate-300"}`}>
                        {g.label}
                      </span>
                    </div>
                  </OptionCard>
                ))}
              </div>
              {goal === "custom" && (
                <input
                  autoFocus
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="Describe your goal…"
                  maxLength={80}
                  className="w-full bg-violet-950/40 border border-violet-700/40 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 mb-4 transition-all"
                />
              )}
              <div className="mt-4">
                <NextButton onClick={next} disabled={!canProceed}>
                  Continue <ChevronRight className="w-4 h-4" />
                </NextButton>
              </div>
            </div>
          )}

          {/* ── Step 3: Habit count ──────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">How many to start?</h2>
              <p className="text-slate-400 text-sm mb-6">
                Small wins build momentum. You can always add more later.
              </p>
              <div className="space-y-2.5 mb-8">
                {HABIT_COUNTS.map((h) => (
                  <OptionCard
                    key={h.id}
                    selected={habitCount === h.id}
                    onClick={() => setHabitCount(h.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none flex-shrink-0">{h.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${habitCount === h.id ? "text-violet-100" : "text-slate-200"}`}>
                          {h.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{h.sub}</p>
                      </div>
                      <SelectDot selected={habitCount === h.id} />
                    </div>
                  </OptionCard>
                ))}
              </div>
              <NextButton onClick={next} disabled={!canProceed}>
                Continue <ChevronRight className="w-4 h-4" />
              </NextButton>
            </div>
          )}

          {/* ── Step 4: Reminder time ────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">Best time for reminders?</h2>
              <p className="text-slate-400 text-sm mb-6">
                Pick when you&apos;re most likely to check in.
              </p>
              <div className="space-y-2.5 mb-8">
                {REMINDER_TIMES.map((r) => (
                  <OptionCard
                    key={r.id}
                    selected={reminderTime === r.id}
                    onClick={() => setReminderTime(r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none flex-shrink-0">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${reminderTime === r.id ? "text-violet-100" : "text-slate-200"}`}>
                          {r.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.sub}</p>
                      </div>
                      <SelectDot selected={reminderTime === r.id} />
                    </div>
                  </OptionCard>
                ))}
              </div>
              <NextButton onClick={next} disabled={!canProceed}>
                Continue <ChevronRight className="w-4 h-4" />
              </NextButton>
            </div>
          )}

          {/* ── Step 5: You're all set ───────────────────────────────────── */}
          {step === 5 && (
            <div className="relative text-center">
              <Confetti />
              <div className="relative">
                {/* Success ring */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-7 shadow-xl shadow-violet-950/40"
                     style={{ boxShadow: "0 0 40px 8px rgba(139,92,246,0.18)" }}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
                    <Check className="w-8 h-8 text-white stroke-[2.5]" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">You&apos;re all set!</h2>
                <p className="text-slate-400 text-sm mb-8">Your journey to better habits starts now.</p>

                {/* Goal recap card */}
                <div className="flex items-center gap-3 bg-[#0f0f1a] border border-violet-800/30 rounded-2xl px-5 py-4 mb-8 text-left">
                  <span className="text-3xl leading-none flex-shrink-0">{goalEmoji}</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">
                      Your goal
                    </p>
                    <p className="text-sm font-semibold text-violet-100 leading-snug">{goalLabel}</p>
                  </div>
                  <div className="ml-auto w-6 h-6 rounded-full bg-violet-600/25 border border-violet-500/35 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-violet-400 stroke-[2.5]" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <>Start Tracking <ChevronRight className="w-4 h-4" /></>
                  }
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(var(--rot)); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(calc(var(--rot) + 600deg)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
