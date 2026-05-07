"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight, ArrowLeft, Loader2, Check, Bot, Shield, Users, Zap,
} from "lucide-react";
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

const CONFETTI_COLORS = [
  "#8b5cf6","#a78bfa","#c4b5fd","#fbbf24","#f59e0b",
  "#e879f9","#60a5fa","#34d399","#fb923c","#f472b6","#ffffff",
];

const TOTAL_STEPS = 5;

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
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: "-12px",
          width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius: p.isCircle ? "50%" : "2px", opacity: 0.9,
          ["--rot" as string]: `${p.rot}deg`,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in both`,
        }} />
      ))}
    </div>
  );
}

function OptionCard({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
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

// ─── Goal observation (shown in real-time as goals are selected) ─────────────

const GOAL_PAIR_OBS: Record<string, string> = {
  "fitness+mental":     "💡 These two reinforce each other directly — exercise reduces cortisol as effectively as some medications. You've picked the highest-synergy combination.",
  "fitness+sleep":      "💡 Powerful combination — fitness and sleep form a feedback loop. Users who improve both together see 40% better results than those working on just one.",
  "fitness+learn":      "💡 Physical exercise measurably improves memory retention by 20–30%. Your fitness habit will literally make your learning habit more effective.",
  "learn+productive":   "💡 Natural pairing — structured learning and deep work share the same neural state. Top performers almost universally combine these two goals.",
  "mental+sleep":       "💡 Smart focus — sleep quality is the #1 driver of mental wellness. Improving both simultaneously targets the root cause, not just the symptoms.",
  "productive+sleep":   "💡 Sleep deprivation cuts cognitive performance by up to 40%. Fixing sleep is the single highest-leverage productivity move you can make.",
  "mental+productive":  "💡 This combination targets the anxiety-distraction loop that kills focus. Rare to see someone identify both root causes at once.",
  "fitness+productive": "💡 Morning exercise floods your brain with dopamine and norepinephrine for 4–6 hours — one of the most evidence-backed productivity strategies.",
  "learn+mental":       "💡 Learning new skills is one of the most effective antidepressants. Progress from both goals creates compounding momentum.",
  "learn+sleep":        "💡 Sleep consolidates everything you learn during the day. You're instinctively optimising for how memory actually works.",
};

const GOAL_SINGLE_OBS: Record<string, string> = {
  fitness:    "💪 Fitness habits have the highest 90-day retention of any goal category. Physical progress you can see keeps motivation high.",
  learn:      "📚 People who habit-track their learning read 3× more and retain 40% more of what they study compared to those who don't.",
  mental:     "🧘 Mental wellness habits often become the anchor habit — the one that makes every other habit easier to maintain.",
  productive: "⚡ Productivity habits compound fast. Most users see measurable output improvements within the first 2 weeks.",
  sleep:      "😴 Sleep is the #1 leverage point — improving sleep quality lifts every other habit's completion rate by 20–35%.",
  custom:     "🎯 Goals with personal meaning have the strongest long-term adherence. The AI will tailor everything to yours.",
};

function getGoalObservation(ids: string[]): string | null {
  if (ids.length === 0) return null;
  if (ids.length === 1) return GOAL_SINGLE_OBS[ids[0]] ?? null;
  const nonCustom = ids.filter((id) => id !== "custom").sort();
  if (nonCustom.length >= 2) {
    const pair = GOAL_PAIR_OBS[nonCustom.slice(0, 2).join("+")];
    if (pair) return pair;
  }
  if (ids.filter((id) => id !== "custom").length >= 3) {
    return "🎯 Ambitious set of goals — the AI will help you sequence these so you don't overwhelm yourself in week 1. One anchor habit is the key.";
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props { onComplete: () => void; }

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep]             = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [saving, setSaving]         = useState(false);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const hasCustom  = selectedIds.includes("custom");
  const canFinish  = selectedIds.length > 0 && (!hasCustom || customGoal.trim() !== "");

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const goalLabels = selectedIds.map((id) => {
          if (id === "custom") return customGoal.trim() || "Custom goal";
          return GOALS.find((g) => g.id === id)?.label ?? id;
        });
        await supabase.from("profiles").update({
          onboarding_completed: true,
          goals: goalLabels,
          goal:  goalLabels[0] ?? null,
        }).eq("id", user.id);
      }
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const dots = (
    <div className="flex gap-2 justify-center mb-10">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <div key={s} className={`h-1 rounded-full transition-all duration-500 ${
          s === step ? "w-8 bg-violet-500" : s < step ? "w-4 bg-violet-700/60" : "w-4 bg-slate-800"
        }`} />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#09090f] flex flex-col items-center justify-center px-4 py-10 overflow-auto">
      <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-purple-700/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {step > 1 && step < TOTAL_STEPS && (
          <button type="button" onClick={back}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}

        {dots}

        <div key={step} style={{ animation: "stepIn 0.28s ease-out both" }}>

          {/* ── Step 1: You're about to join the 8% ──────────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🔥
              </div>

              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight tracking-tight">
                You&apos;re about to<br />join the 8%
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                92% of people abandon their habits within 7 days.<br />
                <span className="text-violet-300 font-semibold">HabitAI exists to make sure you&apos;re not one of them.</span>
              </p>

              <div className="space-y-2.5 mb-8 text-left">
                {[
                  { icon: Bot,    color: "text-violet-400", bg: "bg-violet-900/30", title: "AI coaching",              desc: "Personalised guidance that adapts to your life" },
                  { icon: Shield, color: "text-blue-400",   bg: "bg-blue-900/30",   title: "Streak protection",         desc: "Miss a day — never lose your progress overnight" },
                  { icon: Users,  color: "text-emerald-400",bg: "bg-emerald-900/30",title: "Community accountability",  desc: "People who push you when motivation dips"        },
                  { icon: Zap,    color: "text-amber-400",  bg: "bg-amber-900/30",  title: "XP & levels",               desc: "Turn discipline into a game you actually enjoy"  },
                ].map(({ icon: Icon, color, bg, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 bg-[#0f0f1a] border border-violet-900/15 rounded-xl px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={next}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
                style={{ animation: "ctaPulse 2s ease-in-out 1.2s infinite" }}
              >
                I want to be in the 8% <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Your AI coach is ready ───────────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🤖
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Your AI coach<br />is ready
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                It analyses your habits, spots patterns, and delivers a <span className="text-violet-300 font-semibold">personalised weekly game plan</span> — tailored exactly to where you are.
              </p>

              <div className="bg-gradient-to-b from-violet-950/60 to-[#0f0f1a] border border-violet-600/30 rounded-2xl px-6 py-5 mb-8 text-left"
                   style={{ boxShadow: "0 0 40px rgba(139,92,246,0.1)" }}>
                <p className="text-xs text-violet-400 font-bold uppercase tracking-wider mb-3">What your AI coach does</p>
                {[
                  "Diagnoses which habits need attention",
                  "Suggests specific tweaks to boost streaks",
                  "Adapts your plan as your life changes",
                  "Celebrates wins so you stay motivated",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2.5 mb-2.5 last:mb-0">
                    <div className="w-4 h-4 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-violet-400 stroke-[2.5]" />
                    </div>
                    <p className="text-sm text-slate-300 leading-snug">{line}</p>
                  </div>
                ))}
              </div>

              <button type="button" onClick={next}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 3: Never lose your streak again ─────────────────────── */}
          {step === 3 && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🛡️
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Never lose your<br />streak again
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                Life happens. Travel, illness, emergencies — <span className="text-blue-300 font-semibold">Streak Shield</span> protects your streak when you have to miss a day.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { emoji: "🔥", stat: "21 days",  label: "Average streak on HabitAI"  },
                  { emoji: "🛡️", stat: "1 skip",   label: "Protected free every week"   },
                  { emoji: "📈", stat: "3×",        label: "More likely to reach 30 days" },
                  { emoji: "⚡", stat: "10 XP",     label: "Earned per habit completed"  },
                ].map(({ emoji, stat, label }) => (
                  <div key={label} className="bg-[#0f0f1a] border border-violet-900/20 rounded-xl px-4 py-3.5 text-center">
                    <div className="text-2xl mb-1.5 leading-none">{emoji}</div>
                    <p className="text-lg font-extrabold text-white leading-none">{stat}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{label}</p>
                  </div>
                ))}
              </div>

              <button type="button" onClick={next}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 4: Your squad keeps you honest ──────────────────────── */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                👥
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Your squad keeps<br />you honest
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                Invite friends, compare streaks, and compete on leaderboards. <span className="text-emerald-300 font-semibold">Accountability is the #1 predictor of long-term habit success.</span>
              </p>

              <div className="bg-[#0f0f1a] border border-emerald-700/25 rounded-2xl px-5 py-5 mb-8 text-left">
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-4">What friends unlock</p>
                {[
                  { emoji: "🏆", text: "Weekly leaderboards with your circle"       },
                  { emoji: "📣", text: "Streak shout-outs when you hit milestones"  },
                  { emoji: "💬", text: "Habit challenges you can do together"        },
                  { emoji: "🔔", text: "Nudge friends who are falling behind"        },
                ].map(({ emoji, text }) => (
                  <div key={text} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className="text-xl leading-none">{emoji}</span>
                    <p className="text-sm text-slate-300">{text}</p>
                  </div>
                ))}
              </div>

              <button type="button" onClick={next}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 5: Let's build something that lasts ─────────────────── */}
          {step === 5 && (
            <div className="relative">
              <Confetti />
              <div className="relative text-center mb-7">
                <div className="text-6xl mb-5 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  💪
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                  Let&apos;s build something<br />that lasts
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  What are you building towards? Pick as many as you like.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {GOALS.map((g) => (
                  <OptionCard key={g.id} selected={selectedIds.includes(g.id)} onClick={() => toggle(g.id)}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none flex-shrink-0">{g.emoji}</span>
                      <span className={`text-xs font-medium leading-snug ${selectedIds.includes(g.id) ? "text-violet-100" : "text-slate-300"}`}>
                        {g.label}
                      </span>
                      <SelectDot selected={selectedIds.includes(g.id)} />
                    </div>
                  </OptionCard>
                ))}
              </div>

              {/* Real-time AI observation based on selected goals */}
              {(() => {
                const obs = getGoalObservation(selectedIds);
                return obs ? (
                  <div
                    key={obs}
                    className="mt-3 p-3.5 rounded-xl bg-violet-950/50 border border-violet-600/25 text-left"
                    style={{ animation: "stepIn 0.25s ease-out both" }}
                  >
                    <p className="text-xs text-slate-300 leading-relaxed">{obs}</p>
                  </div>
                ) : null;
              })()}

              {hasCustom && (
                <input
                  autoFocus
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="Describe your goal…"
                  maxLength={80}
                  className="w-full bg-violet-950/40 border border-violet-700/40 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 mb-4 mt-2 transition-all"
                />
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving || !canFinish}
                  className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-base flex items-center justify-center gap-2 shadow-xl shadow-violet-900/50"
                  style={canFinish ? { animation: "ctaPulse 2s ease-in-out infinite" } : undefined}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <>I&apos;m ready. Let&apos;s go! <ChevronRight className="w-5 h-5" /></>
                  }
                </button>
                {!canFinish && (
                  <p className="text-[11px] text-slate-600 text-center mt-2">
                    {selectedIds.length === 0 ? "Pick at least one goal to continue" : "Enter your custom goal above"}
                  </p>
                )}
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
        @keyframes bouncePop {
          0%   { transform: scale(0.5);  opacity: 0; }
          60%  { transform: scale(1.2);  opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5), 0 8px 32px rgba(139,92,246,0.35); }
          50%       { box-shadow: 0 0 0 8px rgba(139,92,246,0), 0 8px 32px rgba(139,92,246,0.35); }
        }
      `}</style>
    </div>
  );
}
