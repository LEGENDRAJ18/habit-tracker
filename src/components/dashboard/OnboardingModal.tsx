"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronRight, ArrowLeft, Loader2, Check, Bot, Shield, Users, Zap,
  GraduationCap, UserCheck, BookOpen, Smile,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PERSONAS, PERSONA_TO_USER_MODE, type PersonaId, type PersonaUserMode } from "@/lib/personas";
import posthog from "posthog-js";

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

// Step counts per mode (for progress dots)
const MODE_TOTAL_STEPS: Record<PersonaUserMode, number> = {
  student:  7,
  parent:   5,
  personal: 6,
};

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

// ─── Goal observation ─────────────────────────────────────────────────────────

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

// ─── Student Success Pack ─────────────────────────────────────────────────────

const STUDENT_HABITS = [
  { emoji: "📚", name: "Study 2 hours daily",            desc: "Deep focused study sessions",      duration_minutes: 25  },
  { emoji: "😴", name: "Sleep 8 hours",                  desc: "Recovery for peak performance",    duration_minutes: null },
  { emoji: "🏃", name: "Exercise 30 minutes",            desc: "Body and brain in sync",           duration_minutes: 30  },
  { emoji: "📵", name: "No phone 1 hour before bed",     desc: "Protect your sleep quality",       duration_minutes: null },
  { emoji: "📖", name: "Read 20 minutes",                desc: "Compound learning every day",      duration_minutes: 20  },
  { emoji: "📝", name: "Review notes daily",             desc: "Spaced repetition builds mastery", duration_minutes: 15  },
];

function StudentPack({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function loadPack() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase.from("habits").select("name").eq("user_id", user.id);
      const existingNames = new Set((existing ?? []).map((h: { name: string }) => h.name));
      const toInsert = STUDENT_HABITS
        .filter((h) => !existingNames.has(h.name))
        .map((h) => ({
          user_id: user.id,
          name: h.name,
          description: h.desc,
          frequency: "daily" as const,
          duration_minutes: h.duration_minutes ?? null,
        }));
      if (toInsert.length > 0) await supabase.from("habits").insert(toInsert);
      setDone(true);
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-b from-emerald-950/60 to-[#0f0f1a] border border-emerald-600/30 rounded-2xl p-5 text-left">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl leading-none">🎓</span>
            <div>
              <p className="text-sm font-bold text-emerald-300">Pack loaded!</p>
              <p className="text-xs text-slate-500">{STUDENT_HABITS.length} habits added to your dashboard</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {STUDENT_HABITS.map((h) => (
              <div key={h.name} className="flex items-center gap-2 text-xs text-slate-400">
                <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="flex-1">{h.name}</span>
                {h.duration_minutes && (
                  <span className="text-[9px] text-violet-400/60">⏳{h.duration_minutes}m</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button type="button" onClick={onNext}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="bg-gradient-to-br from-violet-950/60 via-[#0f0f1a] to-indigo-950/30 border border-violet-500/30 rounded-2xl p-5 text-left cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        style={{ boxShadow: "0 0 30px rgba(139,92,246,0.12)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl leading-none">🎓</span>
            <div>
              <p className="text-base font-bold text-white">Student Success Pack</p>
              <p className="text-xs text-violet-400">{STUDENT_HABITS.length} science-backed habits · One click setup</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2 py-0.5 rounded-full flex-shrink-0">FREE</span>
        </div>
        {expanded && (
          <div className="mt-3 space-y-2 pt-3 border-t border-violet-800/30">
            {STUDENT_HABITS.map((h) => (
              <div key={h.name} className="flex items-center gap-2.5">
                <span className="text-base leading-none">{h.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{h.name}</p>
                  <p className="text-[10px] text-slate-600">{h.desc}</p>
                </div>
                {h.duration_minutes && (
                  <span className="text-[9px] font-semibold text-violet-400/70 bg-violet-950/50 border border-violet-800/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    ⏳ {h.duration_minutes}m
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={() => void loadPack()} disabled={loading}
        className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🎓</span>}
        {loading ? "Loading…" : "Load Student Success Pack"}
      </button>
      <button type="button" onClick={onSkip}
        className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
      >
        Skip — I{"'"}ll set up my own habits
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props { onComplete: () => void; }

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep]               = useState(1);
  const [persona, setPersona]         = useState<PersonaId | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customGoal, setCustomGoal]   = useState("");
  const [dreamUni, setDreamUni]       = useState("");
  const [saving, setSaving]           = useState(false);

  const userMode: PersonaUserMode | null = persona ? PERSONA_TO_USER_MODE[persona] : null;
  const totalSteps = userMode ? MODE_TOTAL_STEPS[userMode] : 7;

  useEffect(() => {
    posthog.capture("onboarding_started");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const hasCustom  = selectedIds.includes("custom");
  const needsGoals = userMode === "student" || userMode === "personal" || userMode === null;
  const canFinish  = !needsGoals || (selectedIds.length > 0 && (!hasCustom || customGoal.trim() !== ""));

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  // For parent, skip habit steps and jump to final
  const handlePersonaNext = (id: PersonaId) => {
    setPersona(id);
    posthog.capture("persona_selected", { persona: id });
    next();
  };

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
        const update: Record<string, unknown> = {
          onboarding_completed: true,
          persona,
          user_mode: userMode ?? "personal",
          ...(goalLabels.length > 0 ? { goals: goalLabels, goal: goalLabels[0] } : {}),
          ...(dreamUni.trim() ? { dream_university: dreamUni.trim() } : {}),
        };
        await supabase.from("profiles").update(update).eq("id", user.id);
        posthog.capture("onboarding_completed", {
          persona,
          goal_count: goalLabels.length,
          has_first_habit: false, // this fallback flow has no first-habit step
        });
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
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className={`h-1 rounded-full transition-all duration-500 ${
          s === step ? "w-8 bg-violet-500" : s < step ? "w-4 bg-violet-700/60" : "w-4 bg-slate-800"
        }`} />
      ))}
    </div>
  );

  // Final step index varies by mode
  const finalStep = totalSteps;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090f] flex flex-col items-center justify-center px-4 py-10 overflow-auto">
      <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-purple-700/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {step > 1 && step < finalStep && (
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

          {/* ── Step 2: Who are you? Mode selection ──────────────────────── */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <div className="text-5xl mb-5 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  👋
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                  Who are you? ✨
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Pick the one that fits you best — your dashboard, AI coaching, and habit suggestions all personalise to it.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePersonaNext(p.id)}
                    className="relative flex flex-col gap-1 p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-95 bg-[#0c0c18]/80 border-slate-800 hover:border-violet-800/50 hover:bg-violet-950/20"
                  >
                    <span className="text-2xl mb-0.5 leading-none">{p.emoji}</span>
                    <span className="text-sm font-bold text-white leading-snug">{p.label}</span>
                    <span className="text-[11px] text-slate-400 leading-snug">{p.tagline}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Mode-specific setup ───────────────────────────────── */}
          {step === 3 && userMode === "student" && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🎓
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                What&apos;s your<br />dream university?
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                HabitAI will build a personalised habit plan around your application timeline — completely free, and totally unique to you.
              </p>
              <input
                autoFocus
                value={dreamUni}
                onChange={(e) => setDreamUni(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                placeholder="e.g. Oxford, Harvard, MIT…"
                maxLength={80}
                className="w-full bg-violet-950/40 border border-violet-700/40 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 mb-4 transition-all"
              />
              {dreamUni.trim() && (
                <div className="mb-5 p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-700/30 text-left" style={{ animation: "stepIn 0.25s ease-out both" }}>
                  <p className="text-xs text-indigo-300 leading-relaxed">
                    🎓 Your <span className="font-semibold text-white">{dreamUni.trim()}</span> journey starts now — your dashboard will track every day toward your application deadline.
                  </p>
                </div>
              )}
              <button type="button" onClick={next}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
              >
                {dreamUni.trim() ? "Let's do this" : "Skip for now"} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && userMode === "parent" && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                👨‍👩‍👧
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Invite your child<br />to connect
              </h1>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Once your child signs up and links their account, you&apos;ll see their habit completions in real-time from your dashboard.
              </p>
              <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-2xl p-5 mb-6 text-left">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">As a parent you can:</p>
                {[
                  { emoji: "🟢", text: "See when your child completes all habits (green)" },
                  { emoji: "🟡", text: "Know when they've done some habits (yellow)" },
                  { emoji: "🔴", text: "Get alerted when they've done none (red)" },
                  { emoji: "💬", text: "Send encouraging messages directly" },
                  { emoji: "📊", text: "View their weekly progress summary" },
                ].map(({ emoji, text }) => (
                  <div key={text} className="flex items-center gap-3 mb-2.5 last:mb-0">
                    <span className="text-lg leading-none flex-shrink-0">{emoji}</span>
                    <p className="text-sm text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
              <button type="button" onClick={next}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/40"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && userMode === "personal" && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🙋
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Your AI coach<br />is ready
              </h1>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                It analyses your habits, spots patterns, and delivers a <span className="text-violet-300 font-semibold">personalised weekly game plan</span> — tailored exactly to where you are.
              </p>
              <div className="space-y-2.5 mb-7 text-left">
                {[
                  { emoji: "🎯", title: "Fitness & health",     desc: "Run, sleep, hydrate — track what moves the needle" },
                  { emoji: "💰", title: "Productivity",          desc: "Deep work, no-phone mornings, evening planning"     },
                  { emoji: "🧠", title: "Mental wellness",       desc: "Meditation, journaling, gratitude practice"          },
                  { emoji: "📈", title: "Finance & learning",    desc: "Daily reading, saving habits, skill-building"        },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 bg-[#0f0f1a] border border-violet-900/15 rounded-xl px-4 py-3">
                    <span className="text-xl leading-none flex-shrink-0">{emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={next}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
              >
                Let&apos;s go <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 4: Mode-specific pack / overview ─────────────────────── */}
          {step === 4 && (userMode === "student") && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🤖
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Your AI coach<br />is ready
              </h1>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                It analyses your habits, spots patterns, and delivers a <span className="text-violet-300 font-semibold">personalised weekly game plan</span> — tailored to your academic goals.
              </p>
              <StudentPack onNext={next} onSkip={next} />
            </div>
          )}

          {step === 4 && userMode === "parent" && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                📊
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Your monitoring<br />dashboard
              </h1>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                After your child links their account, you&apos;ll see this view in real-time — updated as they complete habits throughout the day.
              </p>
              <div className="space-y-3 text-left mb-7">
                {[
                  { icon: "🟢", label: "All habits done",   desc: "Your child is on track — celebrate with an encouragement message", bg: "bg-emerald-950/40", border: "border-emerald-700/30" },
                  { icon: "🟡", label: "Some habits done",  desc: "A gentle nudge might be all they need to finish strong",           bg: "bg-amber-950/40",   border: "border-amber-700/30" },
                  { icon: "🔴", label: "No habits done yet",desc: "Send a motivating message — one tap from your dashboard",          bg: "bg-red-950/30",     border: "border-red-700/25" },
                ].map(({ icon, label, desc, bg, border }) => (
                  <div key={label} className={`flex items-start gap-3 ${bg} border ${border} rounded-xl px-4 py-3`}>
                    <span className="text-xl leading-none flex-shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={next}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/40"
              >
                Got it <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 4 && userMode === "personal" && (
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

          {/* ── Step 5 ────────────────────────────────────────────────────── */}
          {step === 5 && (userMode === "student") && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                🛡️
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Never lose your<br />streak again
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                Exam season, illness, off days — <span className="text-blue-300 font-semibold">Streak Shield</span> protects your streak so one bad day doesn&apos;t undo weeks of progress.
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

          {/* Parent final step */}
          {step === 5 && userMode === "parent" && (
            <div className="relative">
              <Confetti />
              <div className="relative text-center">
                <div className="text-6xl mb-5 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  👨‍👩‍👧
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
                  You&apos;re all set!
                </h1>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Your parent dashboard is ready. Invite your child from the dashboard to start monitoring their progress.
                </p>
                <div className="bg-emerald-950/30 border-emerald-700/30 border rounded-2xl p-5 mb-7 text-left">
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 text-emerald-400">What happens next</p>
                  {[
                    "Go to your dashboard to find your invite link",
                    "Share it with your child — they sign up with their own account",
                    "Once they accept, their habits appear in your monitoring view",
                  ].map((t) => (
                    <div key={t} className="flex items-start gap-2.5 mb-2 last:mb-0">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                      <p className="text-sm text-slate-300 leading-snug">{t}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-base flex items-center justify-center gap-2 shadow-xl bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Go to my dashboard <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 5 && userMode === "personal" && (
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
                  { emoji: "🏆", text: "Weekly leaderboards with your circle"              },
                  { emoji: "⚔️", text: "Habit Battles — 7-day duels against a friend"      },
                  { emoji: "📣", text: "Streak shout-outs when you hit milestones"         },
                  { emoji: "💬", text: "Habit challenges you can do together"               },
                  { emoji: "🔔", text: "Nudge friends who are falling behind"               },
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

          {/* ── Step 6 ────────────────────────────────────────────────────── */}
          {step === 6 && userMode === "student" && (
            <div className="text-center">
              <div className="text-6xl mb-6 leading-none" style={{ animation: "bouncePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                👥
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                Your squad keeps<br />you honest
              </h1>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                Compare streaks with classmates, run Habit Battles, and keep each other accountable through exam season.
              </p>
              <div className="bg-[#0f0f1a] border border-emerald-700/25 rounded-2xl px-5 py-5 mb-8 text-left">
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-4">Study squad features</p>
                {[
                  { emoji: "🏆", text: "Class leaderboard — who studied most this week?"  },
                  { emoji: "⚔️", text: "Habit Battles — challenge a classmate for 7 days" },
                  { emoji: "📣", text: "Streak shout-outs when you hit milestones"         },
                  { emoji: "🔔", text: "Nudge study partners who are falling behind"       },
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

          {step === 6 && userMode === "personal" && (
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
              {(() => {
                const obs = getGoalObservation(selectedIds);
                return obs ? (
                  <div key={obs} className="mt-3 p-3.5 rounded-xl bg-violet-950/50 border border-violet-600/25 text-left" style={{ animation: "stepIn 0.25s ease-out both" }}>
                    <p className="text-xs text-slate-300 leading-relaxed">{obs}</p>
                  </div>
                ) : null;
              })()}
              {hasCustom && (
                <input autoFocus value={customGoal} onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="Describe your goal…" maxLength={80}
                  className="w-full bg-violet-950/40 border border-violet-700/40 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 mb-4 mt-2 transition-all"
                />
              )}
              <div className="mt-5">
                <button type="button" onClick={handleFinish} disabled={saving || !canFinish}
                  className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-base flex items-center justify-center gap-2 shadow-xl shadow-violet-900/50"
                  style={canFinish ? { animation: "ctaPulse 2s ease-in-out infinite" } : undefined}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>I&apos;m ready. Let&apos;s go! <ChevronRight className="w-5 h-5" /></>}
                </button>
                {!canFinish && (
                  <p className="text-[11px] text-slate-600 text-center mt-2">
                    {selectedIds.length === 0 ? "Pick at least one goal to continue" : "Enter your custom goal above"}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2.5 bg-violet-950/40 border border-violet-800/25 rounded-xl px-4 py-2.5">
                  <span className="text-lg leading-none">🧬</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    After 30 days, unlock your <span className="text-violet-300 font-semibold">Habit DNA</span> — your full behavioral fingerprint with personality tags and shareable card.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2.5 bg-emerald-950/30 border border-emerald-700/25 rounded-xl px-4 py-2.5">
                  <span className="text-lg leading-none">🎉</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    You&apos;ve unlocked a <span className="text-emerald-300 font-semibold">7-day Plus trial</span> — experience all Plus features free. No credit card needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 7: Student final (Goals + finish) ────────────────────── */}
          {step === 7 && userMode === "student" && (
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
              {(() => {
                const obs = getGoalObservation(selectedIds);
                return obs ? (
                  <div key={obs} className="mt-3 p-3.5 rounded-xl bg-violet-950/50 border border-violet-600/25 text-left" style={{ animation: "stepIn 0.25s ease-out both" }}>
                    <p className="text-xs text-slate-300 leading-relaxed">{obs}</p>
                  </div>
                ) : null;
              })()}
              {hasCustom && (
                <input autoFocus value={customGoal} onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="Describe your goal…" maxLength={80}
                  className="w-full bg-violet-950/40 border border-violet-700/40 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 mb-4 mt-2 transition-all"
                />
              )}
              <div className="mt-5">
                <button type="button" onClick={handleFinish} disabled={saving || !canFinish}
                  className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-base flex items-center justify-center gap-2 shadow-xl shadow-violet-900/50"
                  style={canFinish ? { animation: "ctaPulse 2s ease-in-out infinite" } : undefined}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>I&apos;m ready. Let&apos;s go! <ChevronRight className="w-5 h-5" /></>}
                </button>
                {!canFinish && (
                  <p className="text-[11px] text-slate-600 text-center mt-2">
                    {selectedIds.length === 0 ? "Pick at least one goal to continue" : "Enter your custom goal above"}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2.5 bg-indigo-950/40 border border-indigo-800/25 rounded-xl px-4 py-2.5">
                  <span className="text-lg leading-none">🎓</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {dreamUni.trim()
                      ? `Your ${dreamUni} journey starts now — every habit you complete brings you one step closer.`
                      : "Every habit you complete builds toward your university application and beyond."}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2.5 bg-emerald-950/30 border border-emerald-700/25 rounded-xl px-4 py-2.5">
                  <span className="text-lg leading-none">🎉</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    You&apos;ve unlocked a <span className="text-emerald-300 font-semibold">7-day Plus trial</span> — experience all Plus features free. No credit card needed.
                  </p>
                </div>
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
