"use client";

import { useState, useMemo } from "react";
import {
  Sparkles, ChevronRight, ArrowLeft, Loader2, Check,
  Bot, Shield, Users, Clock, MapPin, Timer,
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

const IDENTITY_SUFFIX: Record<string, string> = {
  fitness:    "prioritizes their health every single day",
  learn:      "grows a little smarter every single day",
  mental:     "protects their peace of mind every single day",
  productive: "makes the most of every single day",
  sleep:      "wakes up rested and energized every single day",
  custom:     "",
};

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

const WHERE_OPTIONS = [
  "Home", "Bedroom", "Gym", "Office", "Kitchen", "Outdoors", "On commute",
] as const;

const DURATION_OPTIONS = [
  "5 min", "10 min", "20 min", "30 min", "1 hr+",
] as const;

const CONFETTI_COLORS = [
  "#8b5cf6","#a78bfa","#c4b5fd","#fbbf24","#f59e0b",
  "#e879f9","#60a5fa","#34d399","#fb923c","#f472b6","#ffffff",
];

const TOTAL_STEPS = 7;

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

function NextButton({ onClick, disabled = false, children }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
    >
      {children}
    </button>
  );
}

function PillToggle({ options, value, onChange }: {
  options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            value === o
              ? "bg-violet-600/25 border-violet-500/60 text-violet-200"
              : "bg-[#0f0f1a] border-violet-900/25 text-slate-500 hover:border-violet-700/40 hover:text-slate-300"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props { onComplete: () => void; }

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep]             = useState(1);
  const [goal, setGoal]             = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [habitCount, setHabitCount] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  // implementation intentions
  const [implWhen, setImplWhen]         = useState("");
  const [implWhere, setImplWhere]       = useState("");
  const [implDuration, setImplDuration] = useState("");
  const [saving, setSaving]             = useState(false);

  const selectedGoal = GOALS.find((g) => g.id === goal);
  const goalEmoji    = selectedGoal?.emoji ?? "🎯";
  const goalLabel    = goal === "custom"
    ? (customGoal.trim() || "Your goal")
    : (selectedGoal?.label ?? "");

  const identitySuffix = goal === "custom"
    ? (customGoal.trim() || "builds powerful habits every day")
    : (IDENTITY_SUFFIX[goal] ?? "builds powerful habits every day");

  const canProceed =
    step === 1 ? true
    : step === 2 ? goal !== "" && (goal !== "custom" || customGoal.trim() !== "")
    : step === 3 ? true   // identity — no input
    : step === 4 ? habitCount !== ""
    : step === 5 ? reminderTime !== ""
    : step === 6 ? true   // implementation intentions — optional
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
          onboarding_completed:    true,
          goal:                    goalLabel,
          habit_count_preference:  habitCount,
          reminder_time:           reminderTime,
          implementation_when:     implWhen || null,
          implementation_where:    implWhere || null,
          implementation_duration: implDuration || null,
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

          {/* ── Step 1: Stats-driven welcome ─────────────────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-7 shadow-2xl shadow-violet-900/50">
                <Sparkles className="w-9 h-9 text-white" />
              </div>

              {/* Stat hook */}
              <div className="bg-violet-950/40 border border-violet-700/30 rounded-2xl px-5 py-4 mb-6 text-left">
                <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">Did you know?</p>
                <p className="text-white font-semibold text-base leading-snug mb-1">
                  92% of people fail their habits within 7 days.
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  HabitAI users average <span className="text-violet-300 font-semibold">34 days</span>. Here&apos;s why&hellip;
                </p>
              </div>

              {/* 3 reasons */}
              <div className="space-y-2.5 mb-8 text-left">
                {[
                  { icon: Bot,    color: "text-violet-400", bg: "bg-violet-900/30", title: "AI coaching",            desc: "Personalised guidance that adapts to your life" },
                  { icon: Shield, color: "text-blue-400",   bg: "bg-blue-900/30",   title: "Streak protection",       desc: "Miss a day — never lose your progress overnight" },
                  { icon: Users,  color: "text-emerald-400",bg: "bg-emerald-900/30",title: "Community accountability",desc: "People who push you forward when motivation dips" },
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
                className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 text-sm"
              >
                Join the 8% <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Goal ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">What&apos;s your main goal?</h2>
              <p className="text-slate-400 text-sm mb-6">We&apos;ll personalise your entire experience around it.</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {GOALS.map((g) => (
                  <OptionCard key={g.id} selected={goal === g.id} onClick={() => setGoal(g.id)}>
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
                <input autoFocus value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="Describe your goal…" maxLength={80}
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

          {/* ── Step 3: Identity framing ──────────────────────────────────── */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 border border-violet-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-950/40">
                <span className="text-3xl leading-none">{goalEmoji}</span>
              </div>

              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-4">
                Your new identity
              </p>

              {/* The statement */}
              <div className="bg-gradient-to-b from-violet-950/60 to-[#0f0f1a] border border-violet-600/30 rounded-2xl px-6 py-6 mb-6"
                   style={{ boxShadow: "0 0 40px rgba(139,92,246,0.12)" }}>
                <p className="text-slate-400 text-sm mb-2 leading-relaxed">From this day forward&hellip;</p>
                <p className="text-2xl font-extrabold text-white leading-tight">
                  You are becoming{" "}
                  <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    someone who
                  </span>
                </p>
                <p className="text-xl font-bold text-white/90 mt-1 leading-snug">
                  {identitySuffix}.
                </p>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                Identity-based habits are 3× more likely to stick. Every action you take is a vote for the person you&apos;re becoming.
              </p>

              <NextButton onClick={next}>
                This is me <ChevronRight className="w-4 h-4" />
              </NextButton>
            </div>
          )}

          {/* ── Step 4: Habit count ──────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">How many to start?</h2>
              <p className="text-slate-400 text-sm mb-6">Small wins build momentum. You can always add more later.</p>
              <div className="space-y-2.5 mb-8">
                {HABIT_COUNTS.map((h) => (
                  <OptionCard key={h.id} selected={habitCount === h.id} onClick={() => setHabitCount(h.id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none flex-shrink-0">{h.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${habitCount === h.id ? "text-violet-100" : "text-slate-200"}`}>{h.label}</p>
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

          {/* ── Step 5: Reminder time ────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">Best time for reminders?</h2>
              <p className="text-slate-400 text-sm mb-6">Pick when you&apos;re most likely to check in.</p>
              <div className="space-y-2.5 mb-8">
                {REMINDER_TIMES.map((r) => (
                  <OptionCard key={r.id} selected={reminderTime === r.id} onClick={() => setReminderTime(r.id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none flex-shrink-0">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${reminderTime === r.id ? "text-violet-100" : "text-slate-200"}`}>{r.label}</p>
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

          {/* ── Step 6: Implementation intentions ───────────────────────── */}
          {step === 6 && (
            <div>
              {/* Stat banner */}
              <div className="flex items-center gap-2.5 bg-emerald-950/30 border border-emerald-700/30 rounded-xl px-4 py-3 mb-6">
                <span className="text-lg leading-none">📈</span>
                <p className="text-xs text-emerald-300 leading-snug">
                  <span className="font-bold">Research shows:</span> people who plan when and where to act are{" "}
                  <span className="font-bold text-emerald-200">91% more likely</span> to follow through.
                </p>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1.5">Plan your habit routine</h2>
              <p className="text-slate-400 text-sm mb-7">All optional — but the more specific, the better.</p>

              {/* WHEN */}
              <div className="mb-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  <Clock className="w-3.5 h-3.5 text-violet-400" /> When will you do your habits?
                </label>
                <input type="time" value={implWhen}
                  onChange={(e) => setImplWhen(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white transition-all"
                />
              </div>

              {/* WHERE */}
              <div className="mb-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" /> Where will you do them?
                </label>
                <PillToggle options={WHERE_OPTIONS} value={implWhere} onChange={setImplWhere} />
              </div>

              {/* HOW LONG */}
              <div className="mb-8">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  <Timer className="w-3.5 h-3.5 text-violet-400" /> How long per session?
                </label>
                <PillToggle options={DURATION_OPTIONS} value={implDuration} onChange={setImplDuration} />
              </div>

              <NextButton onClick={next}>
                {implWhen || implWhere || implDuration ? "Lock it in" : "Skip for now"}
                {" "}<ChevronRight className="w-4 h-4" />
              </NextButton>
            </div>
          )}

          {/* ── Step 7: All set ───────────────────────────────────────────── */}
          {step === 7 && (
            <div className="relative text-center">
              <Confetti />
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-7 shadow-xl shadow-violet-950/40"
                     style={{ boxShadow: "0 0 40px 8px rgba(139,92,246,0.18)" }}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
                    <Check className="w-8 h-8 text-white stroke-[2.5]" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">You&apos;re all set!</h2>
                <p className="text-slate-400 text-sm mb-8">Your transformation starts now. Stay consistent — every single day counts.</p>

                <div className="flex items-center gap-3 bg-[#0f0f1a] border border-violet-800/30 rounded-2xl px-5 py-4 mb-8 text-left">
                  <span className="text-3xl leading-none flex-shrink-0">{goalEmoji}</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Your identity</p>
                    <p className="text-sm font-semibold text-violet-100 leading-snug">
                      Someone who {identitySuffix}
                    </p>
                  </div>
                  <div className="ml-auto w-6 h-6 rounded-full bg-violet-600/25 border border-violet-500/35 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-violet-400 stroke-[2.5]" />
                  </div>
                </div>

                <button type="button" onClick={handleFinish} disabled={saving}
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
