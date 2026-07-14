"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, AlertCircle, AtSign, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import posthog from "posthog-js";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const USERNAME_RE = /^[a-zA-Z0-9_ .'\-]{3,30}$/;

// ─── Persona data ─────────────────────────────────────────────────────────────

type PersonaId =
  | "student"
  | "professional"
  | "athlete"
  | "breaking_bad_habits"
  | "entrepreneur"
  | "parent"
  | "wellness"
  | "just_improving";

const PERSONAS: { id: PersonaId; emoji: string; label: string; tagline: string }[] = [
  { id: "student",             emoji: "🎓", label: "Student",             tagline: "Crush your academic goals"              },
  { id: "professional",        emoji: "💼", label: "Professional",        tagline: "Level up your career & productivity"    },
  { id: "athlete",             emoji: "💪", label: "Athlete",             tagline: "Build peak physical performance"        },
  { id: "breaking_bad_habits", emoji: "🚫", label: "Breaking Bad Habits", tagline: "Quit what's holding you back"           },
  { id: "entrepreneur",        emoji: "🚀", label: "Entrepreneur",        tagline: "Build discipline & ship faster"         },
  { id: "parent",              emoji: "👨‍👩‍👧", label: "Parent",             tagline: "Model good habits for your family"     },
  { id: "wellness",            emoji: "🧘", label: "Wellness Seeker",     tagline: "Improve sleep, stress & mental health"  },
  { id: "just_improving",      emoji: "🌱", label: "Just Improving",      tagline: "Become a better version of yourself"   },
];

const PERSONA_TO_USER_MODE: Record<PersonaId, "student" | "parent" | "personal"> = {
  student:             "student",
  professional:        "personal",
  athlete:             "personal",
  breaking_bad_habits: "personal",
  entrepreneur:        "personal",
  parent:              "parent",
  wellness:            "personal",
  just_improving:      "personal",
};

const PERSONA_GOALS: Record<PersonaId, string[]> = {
  student:             ["Get into my dream university", "Improve my grades", "Build better study habits", "Reduce phone distraction", "Improve sleep & energy"],
  professional:        ["Be more productive", "Build a morning routine", "Read more", "Exercise consistently", "Manage stress better"],
  athlete:             ["Build strength & muscle", "Improve endurance", "Lose weight", "Recover faster", "Train consistently"],
  breaking_bad_habits: ["Quit smoking", "Reduce alcohol", "Less social media", "Stop procrastinating", "Cut out junk food"],
  entrepreneur:        ["Ship faster", "Wake up earlier", "Build deep work habits", "Exercise & stay sharp", "Read & learn daily"],
  parent:              ["Model healthy habits", "Exercise with my kids", "Reduce screen time", "Sleep better", "Manage stress"],
  wellness:            ["Sleep better", "Reduce anxiety", "Meditate daily", "Exercise more", "Eat healthier"],
  just_improving:      ["Build a morning routine", "Exercise regularly", "Read more", "Eat healthier", "Sleep better"],
};

const PERSONA_HABIT_SUGGESTIONS: Record<PersonaId, string[]> = {
  student:             ["Study 2 hours daily", "Read for 20 minutes", "No phone 1 hour before bed"],
  professional:        ["2 hours of deep work", "Morning planning session (15 min)", "Evening wind-down routine"],
  athlete:             ["Morning run (30 min)", "Evening stretching (15 min)", "Track daily nutrition"],
  breaking_bad_habits: ["Log craving instead of acting on it", "Replace cigarette break with a 5-min walk", "Track alcohol-free days"],
  entrepreneur:        ["1 hour focused building (before email)", "Wake up at 6am", "Daily reading (30 min)"],
  parent:              ["Morning family exercise (20 min)", "Phone-free dinner time", "10-min bedtime wind-down"],
  wellness:            ["10-min morning meditation", "In bed by 10:30 PM", "5-min evening journaling"],
  just_improving:      ["Morning routine (wake up on time)", "Exercise 30 minutes", "Read for 20 minutes"],
};

const PERSONA_CATEGORY_PRESELECTS: Record<PersonaId, CategoryId[]> = {
  student:             ["learning", "career", "sleep"],
  athlete:             ["fitness", "nutrition", "sleep"],
  professional:        ["career", "fitness", "mindfulness"],
  entrepreneur:        ["career", "fitness", "sleep"],
  breaking_bad_habits: ["breaking", "mindfulness", "sleep"],
  wellness:            ["mindfulness", "sleep", "fitness"],
  parent:              ["fitness", "relationships", "mindfulness"],
  just_improving:      ["fitness", "sleep", "career"],
};

// ─── Category data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "fitness",       label: "Fitness & Health",        emoji: "💪" },
  { id: "learning",      label: "Learning & Education",    emoji: "📚" },
  { id: "mindfulness",   label: "Mindfulness & Wellbeing", emoji: "🧘" },
  { id: "sleep",         label: "Sleep & Recovery",        emoji: "😴" },
  { id: "nutrition",     label: "Nutrition & Diet",        emoji: "🍎" },
  { id: "career",        label: "Career & Productivity",   emoji: "💼" },
  { id: "finance",       label: "Finance & Saving",        emoji: "💰" },
  { id: "relationships", label: "Relationships & Social",  emoji: "🤝" },
  { id: "creativity",    label: "Creativity & Hobbies",    emoji: "🎨" },
  { id: "breaking",      label: "Breaking Bad Habits",     emoji: "🚫" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

const HABIT_SUGGESTIONS: Record<CategoryId, string[]> = {
  fitness:       ["Morning workout (30 min)", "Walk 8,000 steps daily", "Drink 2L of water"],
  learning:      ["Read for 20 minutes", "Practice a skill for 1 hour", "Watch an educational video"],
  mindfulness:   ["10-min morning meditation", "Daily journaling", "5-min breathing exercise"],
  sleep:         ["In bed by 10:30 PM", "No screens 1 hr before bed", "Get 8 hours of sleep"],
  nutrition:     ["Eat 5 fruits & veggies", "Cook a meal at home", "No junk food today"],
  career:        ["2 hours of deep work", "Review your daily goals", "Learn one new thing"],
  finance:       ["Track all expenses", "Save $10 today", "No impulse purchases"],
  relationships: ["Call a friend or family member", "Express gratitude to someone", "Quality time with loved ones"],
  creativity:    ["Sketch or doodle for 10 min", "Write 300 words", "Play or listen to music"],
  breaking:      ["No social media before noon", "Reduce screen time by 1 hr", "Replace bad habit with a good one"],
};

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-5 pb-3 flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < step - 1
              ? "w-6 h-2 bg-violet-500"
              : i === step - 1
              ? "w-8 h-2 bg-violet-400"
              : "w-2 h-2 bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 1 — Persona selection ───────────────────────────────────────────────

function PersonaStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: PersonaId | null;
  onSelect: (id: PersonaId) => void;
  onNext: () => void;
}) {
  return (
    <div className="w-full max-w-lg px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-black mb-2 text-white leading-tight">
          Who are you? ✨
        </h1>
        <p className="text-slate-400 text-sm">Pick the one that fits you best</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {PERSONAS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`relative flex flex-col gap-1 p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-95 ${
                active
                  ? "bg-violet-600/20 border-violet-500/60 shadow-md shadow-violet-900/30"
                  : "bg-[#0c0c18]/80 border-slate-800 hover:border-violet-800/50 hover:bg-violet-950/20"
              }`}
            >
              <span className="text-2xl mb-0.5 leading-none">{p.emoji}</span>
              <span className="text-sm font-bold text-white leading-snug">{p.label}</span>
              <span className="text-[11px] text-slate-400 leading-snug">{p.tagline}</span>
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 active:scale-[0.98]"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
      {!selected && (
        <p className="text-center text-xs text-slate-600 mt-3">Pick one to continue</p>
      )}
    </div>
  );
}

// ─── Step 2 — Goal selection (persona-aware, multi-select) ───────────────────

function PersonaGoalStep({
  persona,
  selectedGoals,
  onToggle,
  onNext,
}: {
  persona: PersonaId;
  selectedGoals: string[];
  onToggle: (goal: string) => void;
  onNext: () => void;
}) {
  const goals        = PERSONA_GOALS[persona];
  const personaLabel = PERSONAS.find((p) => p.id === persona)?.label ?? "";

  return (
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black mb-2 text-white leading-tight">
          What are your goals? 🎯
        </h1>
        <p className="text-slate-400 text-sm">
          As a{" "}
          <span className="text-violet-300 font-semibold">{personaLabel}</span>
          {" "}— pick all that apply
        </p>
      </div>

      <div className="space-y-2.5 mb-6">
        {goals.map((goal) => {
          const active = selectedGoals.includes(goal);
          return (
            <button
              key={goal}
              type="button"
              onClick={() => onToggle(goal)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
                active
                  ? "border-violet-500/60 bg-violet-600/20 shadow-md shadow-violet-900/30"
                  : "border-slate-800 bg-[#0c0c18]/80 hover:border-violet-800/40 hover:bg-violet-950/20"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                active ? "border-violet-500 bg-violet-500" : "border-slate-600"
              }`}>
                {active && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium text-white">{goal}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={selectedGoals.length === 0}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 active:scale-[0.98]"
      >
        {selectedGoals.length > 0
          ? `Continue with ${selectedGoals.length} goal${selectedGoals.length > 1 ? "s" : ""}`
          : "Continue"}{" "}
        <ArrowRight className="w-4 h-4" />
      </button>
      {selectedGoals.length === 0 && (
        <p className="text-center text-xs text-slate-600 mt-3">Pick at least one goal to continue</p>
      )}
    </div>
  );
}

// ─── Step 3 — Goals (categories) ─────────────────────────────────────────────

function GoalsStep({
  selected,
  onChange,
  onNext,
  hasPersona,
}: {
  selected: string[];
  onChange: (cats: string[]) => void;
  onNext: () => void;
  hasPersona?: boolean;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);

  return (
    <div className="w-full max-w-lg px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-black mb-2 text-white leading-tight">
          What do you want to work on? ✨
        </h1>
        <p className="text-slate-400 text-sm">
          {hasPersona
            ? "We’ve picked some based on your profile — adjust as you like"
            : "Pick as many areas as you like"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {CATEGORIES.map((cat) => {
          const active = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={`relative flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-95 ${
                active
                  ? "bg-violet-600/20 border-violet-500/60 shadow-md shadow-violet-900/30"
                  : "bg-[#0c0c18]/80 border-slate-800 hover:border-violet-800/50 hover:bg-violet-950/20"
              }`}
            >
              <span className="text-xl shrink-0">{cat.emoji}</span>
              <span className="text-sm font-semibold text-white leading-snug">{cat.label}</span>
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 active:scale-[0.98]"
      >
        {selected.length > 0
          ? `Continue with ${selected.length} area${selected.length > 1 ? "s" : ""}`
          : "Continue"}{" "}
        <ArrowRight className="w-4 h-4" />
      </button>
      {selected.length === 0 && (
        <p className="text-center text-xs text-slate-600 mt-3">You can always set goals later</p>
      )}
    </div>
  );
}

// ─── Step 4 — Profile (username + avatar) ─────────────────────────────────────

function ProfileStep({
  username,
  setUsername,
  avatarId,
  setAvatarId,
  checking,
  available,
  onNext,
}: {
  username: string;
  setUsername: (v: string) => void;
  avatarId: AvatarId;
  setAvatarId: (id: AvatarId) => void;
  checking: boolean;
  available: boolean | null;
  onNext: () => void;
}) {
  const isValidFormat = USERNAME_RE.test(username);
  const usernameTaken = isValidFormat && !checking && available === false;
  const canContinue   = username.length === 0 || (isValidFormat && available !== false);

  return (
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black mb-2 text-white">Make it yours 🎨</h2>
        <p className="text-slate-400 text-sm">Both optional — you can always update these later</p>
      </div>

      {/* Username */}
      <div className="mb-5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Username <span className="text-slate-700 normal-case font-normal">(optional)</span>
        </label>
        <div className="relative group">
          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-violet-400 transition-colors pointer-events-none" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_ .'\-]/g, ""))}
            placeholder="your_username"
            maxLength={20}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full pl-11 pr-10 py-3 bg-[#13131f] border border-violet-900/30 rounded-xl text-white text-sm placeholder-slate-700 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking                                              && <Loader2      className="w-4 h-4 text-slate-500 animate-spin" />}
            {!checking && isValidFormat && available === true     && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {!checking && isValidFormat && available === false    && <AlertCircle  className="w-4 h-4 text-red-400" />}
          </div>
        </div>
        <div className="h-4 mt-1">
          {usernameTaken && <p className="text-[11px] text-red-400">Username already taken</p>}
          {!usernameTaken && isValidFormat && !checking && available === true && (
            <p className="text-[11px] text-emerald-400">Looks good!</p>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className="mb-6">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">
          Pick your avatar
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {AVATARS.map((av) => {
            const active = avatarId === av.id;
            return (
              <button
                key={av.id}
                type="button"
                onClick={() => setAvatarId(av.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 active:scale-95 ${
                  active
                    ? "border-violet-500 bg-violet-600/15 shadow-md shadow-violet-900/30 scale-[1.04]"
                    : "border-slate-800 bg-[#0c0c18]/60 hover:border-slate-700"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${av.bg} flex items-center justify-center shadow-md`}>
                  <span className={`text-2xl leading-none ${av.animClass}`}>{av.emoji}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{av.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 active:scale-[0.98]"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Step 5 — First habit (persona-aware suggestions) ────────────────────────

function HabitStep({
  suggestions,
  chosenHabit,
  setChosenHabit,
  onComplete,
  saving,
}: {
  suggestions: string[];
  chosenHabit: string | null;
  setChosenHabit: (h: string | null) => void;
  onComplete: (habit: string | null) => void;
  saving?: boolean;
}) {
  const [custom, setCustom]         = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const finalHabit = showCustom ? (custom.trim() || null) : chosenHabit;

  const displaySuggestions =
    suggestions.length > 0
      ? suggestions
      : ["Morning workout (30 min)", "Read for 20 minutes", "10-min meditation"];

  return (
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black mb-2 text-white">Start with one habit 💪</h2>
        <p className="text-slate-400 text-sm">
          Pick one to begin —{" "}
          <span className="text-violet-400 font-medium">3× more likely to stick</span> when you start now
        </p>
      </div>

      <div className="space-y-2.5 mb-5">
        {displaySuggestions.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => { setChosenHabit(h); setShowCustom(false); }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
              chosenHabit === h && !showCustom
                ? "border-violet-500/60 bg-violet-600/20 shadow-md shadow-violet-900/30"
                : "border-slate-800 bg-[#0c0c18]/80 hover:border-violet-800/40 hover:bg-violet-950/20"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              chosenHabit === h && !showCustom ? "border-violet-500 bg-violet-500" : "border-slate-600"
            }`}>
              {chosenHabit === h && !showCustom && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-white">{h}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => { setShowCustom(true); setChosenHabit(null); }}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
            showCustom
              ? "border-violet-500/60 bg-violet-600/20"
              : "border-dashed border-slate-800 bg-[#0c0c18]/60 hover:border-slate-600"
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            showCustom ? "border-violet-500 bg-violet-500" : "border-slate-600"
          }`}>
            {showCustom && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm font-medium text-slate-300">Write my own…</span>
        </button>

        {showCustom && (
          <input
            autoFocus
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Drink 2L of water daily"
            maxLength={80}
            className="w-full px-4 py-3 bg-[#13131f] border border-violet-900/30 rounded-xl text-white text-sm placeholder-slate-700 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all"
          />
        )}
      </div>

      <button
        onClick={() => onComplete(finalHabit)}
        disabled={saving}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40 active:scale-[0.98]"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : "Let’s go! 🚀"}
      </button>

      <button
        onClick={() => onComplete(null)}
        disabled={saving}
        className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Skip and add habits on my dashboard
      </button>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

function OnboardingFlow() {
  const router = useRouter();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId]           = useState<string | null>(null);
  const loadingAuthRef                = useRef(true);

  const [step,      setStep]      = useState(1);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");

  // Step 1 — persona
  const [persona, setPersona] = useState<PersonaId | null>(null);

  // Step 2 — persona goals (multi-select)
  const [personaGoals, setPersonaGoals] = useState<string[]>([]);

  // Step 3 — categories
  const [categories, setCategories] = useState<string[]>([]);

  // Step 4 — profile
  const [username,   setUsername]   = useState("");
  const [checking,   setChecking]   = useState(false);
  const [available,  setAvailable]  = useState<boolean | null>(null);
  const [avatarId,   setAvatarId]   = useState<AvatarId>("ghost");
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 5 — habit
  const [chosenHabit, setChosenHabit] = useState<string | null>(null);

  // Completion loading state
  const [saving, setSaving] = useState(false);

  // Tracks which persona's category defaults have been applied (avoids overwriting user edits on back-nav)
  const [preselectedForPersona, setPreselectedForPersona] = useState<PersonaId | null>(null);

  // ── Auth: getSession() reads from cached storage — no network round-trip ──
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (loadingAuthRef.current) router.replace("/auth/login");
    }, 5_000);

    (async () => {
      try {
        const supabase = createClient();

        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 4_500)
          ),
        ]);

        if (!session) { router.replace("/auth/login"); return; }

        const uid = session.user.id;
        setUserId(uid);
        loadingAuthRef.current = false;
        setLoadingAuth(false);

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, username, avatar_id")
          .eq("id", uid)
          .single();

        if (profile?.onboarding_completed) { router.replace("/dashboard"); return; }
        if (profile?.username)  setUsername(profile.username);
        if (profile?.avatar_id) setAvatarId(profile.avatar_id as AvatarId);
      } catch {
        router.replace("/auth/login");
      }
    })();

    return () => clearTimeout(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Username availability debounce ────────────────────────────────────────
  useEffect(() => {
    if (!username || !USERNAME_RE.test(username)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailable(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false); return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecking(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/friends/search?username=${encodeURIComponent(username)}`);
        const data = await res.json() as { user?: { id: string } | null };
        setAvailable(!data.user || data.user.id === userId);
      } catch { setAvailable(null); }
      finally  { setChecking(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, userId]);

  const goNext = () => { setDirection("fwd");  setStep((s) => s + 1); };
  const goBack = () => { setDirection("back"); setStep((s) => s - 1); };

  // ── Step 1 → 2: save persona + user_mode in background ───────────────────
  const handlePersonaNext = () => {
    if (userId && persona) {
      const sb = createClient();
      sb.from("profiles").update({
        persona,
        user_mode: PERSONA_TO_USER_MODE[persona],
      }).eq("id", userId).then();
    }
    goNext();
  };

  // ── Step 2 → 3: save primary goal in background; pre-select categories ───
  const handlePersonaGoalNext = () => {
    if (userId && personaGoals.length > 0) {
      const sb = createClient();
      sb.from("profiles").update({ goal: personaGoals[0] }).eq("id", userId).then();
    }
    if (persona && preselectedForPersona !== persona) {
      setCategories(PERSONA_CATEGORY_PRESELECTS[persona]);
      setPreselectedForPersona(persona);
    }
    goNext();
  };

  // ── Step 3 → 4: save category goals in background ────────────────────────
  const handleGoalsNext = () => {
    if (userId) {
      const sb = createClient();
      sb.from("profiles").update({ goals: categories }).eq("id", userId).then();
    }
    goNext();
  };

  // ── Step 4 → 5: save username/avatar in background ───────────────────────
  const handleProfileNext = () => {
    if (userId) {
      const sb = createClient();
      const updates: Record<string, unknown> = { avatar_id: avatarId };
      if (username.trim() && USERNAME_RE.test(username) && available !== false) {
        updates.username = username.toLowerCase().trim();
      }
      sb.from("profiles").update(updates).eq("id", userId).then();
    }
    goNext();
  };

  // ── Final step: await all DB writes, then navigate ────────────────────────
  const complete = async (habit: string | null) => {
    setSaving(true);

    console.log("[onboarding] complete() called", { habit, userId });

    const uid = userId;
    if (uid) {
      const sb = createClient();
      const profileUpdate: Record<string, unknown> = {
        id:                   uid,
        goals:                categories,
        avatar_id:            avatarId,
        onboarding_completed: true,
        ...(persona ? { persona, user_mode: PERSONA_TO_USER_MODE[persona] } : {}),
        ...(personaGoals.length > 0 ? { goal: personaGoals[0] } : {}),
      };
      if (username.trim() && USERNAME_RE.test(username) && available !== false) {
        profileUpdate.username = username.toLowerCase().trim();
      }

      const profileResult = await sb.from("profiles").upsert(profileUpdate, { onConflict: "id" });
      console.log("[onboarding] profile upsert result", profileResult);

      console.log("[onboarding] habit insert — will attempt?", !!habit, "| uid:", uid, "| habit value:", habit);
      if (habit) {
        const habitPayload = { user_id: uid, name: habit, frequency: "daily" };
        console.log("[onboarding] habit insert payload:", habitPayload);
        const habitResult = await sb.from("habits").insert(habitPayload);
        console.log("[onboarding] habit insert result — data:", habitResult.data, "| error:", habitResult.error);
      } else {
        console.log("[onboarding] habit is null — skipping insert");
      }
    } else {
      console.log("[onboarding] uid is null — skipping all DB writes");
    }

    posthog.capture("onboarding_completed", {
      has_username:    !!(username.trim()),
      avatar_id:       avatarId,
      persona,
      persona_goals:   personaGoals,
      categories,
      has_first_habit: !!habit,
    });

    localStorage.setItem("habitai_onboarding_done", "1");
    sessionStorage.setItem("habitai_onboarding_done", "1");
    router.push("/dashboard");
  };

  // ── Habit suggestions: persona-first, then category fallback ─────────────
  const suggestions = useMemo(() => {
    if (persona) return PERSONA_HABIT_SUGGESTIONS[persona];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const cat of categories) {
      const s = HABIT_SUGGESTIONS[cat as CategoryId]?.[0];
      if (s && !seen.has(s)) { seen.add(s); out.push(s); }
      if (out.length >= 3) break;
    }
    return out;
  }, [persona, categories]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-900/50 animate-pulse">
            <span className="text-2xl">✨</span>
          </div>
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white overflow-hidden relative">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute rounded-full bg-violet-700/20 blur-[130px]"
             style={{ width: 640, height: 640, top: "-12%", left: "-10%" }} />
        <div className="absolute rounded-full bg-purple-600/15 blur-[100px]"
             style={{ width: 520, height: 520, bottom: "-18%", right: "-8%" }} />
      </div>

      <ProgressDots step={step} />

      {step > 1 && (
        <button
          onClick={goBack}
          className="fixed top-12 left-4 z-50 flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors p-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <div
        key={`step-${step}`}
        className={`relative z-10 min-h-screen flex items-center justify-center pt-16 pb-8
          ${direction === "fwd" ? "step-slide-in" : "step-slide-in-left"}`}
      >
        {step === 1 && (
          <PersonaStep
            selected={persona}
            onSelect={(p) => { setPersona(p); setPersonaGoals([]); }}
            onNext={handlePersonaNext}
          />
        )}

        {step === 2 && persona && (
          <PersonaGoalStep
            persona={persona}
            selectedGoals={personaGoals}
            onToggle={(g) => setPersonaGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])}
            onNext={handlePersonaGoalNext}
          />
        )}

        {step === 3 && (
          <GoalsStep
            selected={categories}
            onChange={setCategories}
            onNext={handleGoalsNext}
            hasPersona={!!persona}
          />
        )}

        {step === 4 && (
          <ProfileStep
            username={username}
            setUsername={(v) => { setUsername(v); setAvailable(null); }}
            avatarId={avatarId}
            setAvatarId={setAvatarId}
            checking={checking}
            available={available}
            onNext={handleProfileNext}
          />
        )}

        {step === 5 && (
          <HabitStep
            suggestions={suggestions}
            chosenHabit={chosenHabit}
            setChosenHabit={setChosenHabit}
            onComplete={complete}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
  );
}
