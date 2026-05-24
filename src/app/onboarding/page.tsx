"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, AlertCircle, AtSign, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import { friendlyError } from "@/lib/friendlyError";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/i;

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

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#7c3aed", "#a78bfa", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#f472b6"];

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left:     `${Math.random() * 100}%`,
      delay:    `${Math.random() * 3}s`,
      duration: `${2.5 + Math.random() * 2.5}s`,
      color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size:     `${5 + Math.random() * 8}px`,
      radius:   Math.random() > 0.5 ? "50%" : "2px",
    })),
  []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left:         p.left,
            width:        p.size,
            height:       p.size,
            background:   p.color,
            borderRadius: p.radius,
            animation:    `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-300 font-medium">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-xs text-violet-400 font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 — Welcome ─────────────────────────────────────────────────────────

function Step1Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center max-w-sm w-full px-4">
      <div className="flex justify-center mb-8">
        <div
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700
                     flex items-center justify-center shadow-2xl shadow-violet-900/60 logo-pulse"
        >
          <span className="text-5xl">✨</span>
        </div>
      </div>

      <h1 className="text-4xl font-black mb-3 leading-tight">
        Welcome to{" "}
        <span className="text-violet-400">HabitAI!</span>{" "}🎉
      </h1>
      <p className="text-xl text-slate-200 mb-2">
        You just made the best decision of your day.
      </p>
      <p className="text-slate-400 mb-10">
        Let&apos;s set you up in 60 seconds 🚀
      </p>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r
                   from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                   text-white font-bold text-lg rounded-2xl shadow-xl shadow-violet-900/50
                   transition-all hover:scale-105"
      >
        Let&apos;s Go! <ArrowRight className="w-5 h-5" />
      </button>

      <p className="mt-5 text-xs text-slate-400">No credit card · Free forever</p>
    </div>
  );
}

// ─── Step 2 — Focus categories ────────────────────────────────────────────────

function Step2Categories({
  selected,
  onChange,
  onNext,
}: {
  selected: string[];
  onChange: (cats: string[]) => void;
  onNext: () => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);

  return (
    <div className="w-full max-w-lg px-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black mb-2 text-white">What do you want to work on? ✨</h2>
        <p className="text-slate-300">Pick as many areas as you like</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {CATEGORIES.map((cat) => {
          const active = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={`relative flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                active
                  ? "bg-violet-600/20 border-violet-500/60 shadow-lg shadow-violet-900/30"
                  : "bg-[#0c0c18]/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
              }`}
            >
              <span className="text-2xl shrink-0">{cat.emoji}</span>
              <span className="text-sm font-semibold text-white leading-snug">{cat.label}</span>
              {active && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500
                                flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600
                   hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl
                   transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
      >
        {selected.length > 0
          ? `Continue with ${selected.length} selected`
          : "Skip for now"}{" "}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Step 3 — Username ────────────────────────────────────────────────────────

function Step3Username({
  username,
  setUsername,
  checking,
  available,
  userId,
  onNext,
}: {
  username: string;
  setUsername: (v: string) => void;
  checking: boolean;
  available: boolean | null;
  userId: string | null;
  onNext: () => void;
}) {
  const isValidFormat = USERNAME_RE.test(username);
  const canContinue   = isValidFormat && available === true;

  return (
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2 text-white">Choose your username 😎</h2>
        <p className="text-slate-300">This is how friends will find you on HabitAI</p>
      </div>

      <div className="bg-[#0c0c18]/90 backdrop-blur-xl border border-violet-800/25 rounded-3xl p-7 shadow-2xl">
        <div className="relative group mb-2">
          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600
                             group-focus-within:text-violet-400 transition-colors pointer-events-none" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="your_username"
            maxLength={20}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full pl-11 pr-10 py-3.5 bg-[#13131f] border border-violet-900/40 rounded-2xl
                       text-white text-sm placeholder-slate-700 focus:border-violet-500/70 focus:outline-none
                       focus:ring-2 focus:ring-violet-500/15 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            {!checking && isValidFormat && available === true  && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {!checking && isValidFormat && available === false && <AlertCircle  className="w-4 h-4 text-red-400"     />}
          </div>
        </div>

        <div className="min-h-[1.25rem] mb-6">
          {!username && (
            <p className="text-[11px] text-slate-400">3–20 characters · letters, numbers, underscores</p>
          )}
          {username && !isValidFormat && (
            <p className="text-[11px] text-red-400">3–20 chars, letters, numbers, underscores only</p>
          )}
          {isValidFormat && !checking && available === false && (
            <p className="text-[11px] text-red-400">That username is already taken</p>
          )}
          {isValidFormat && !checking && available === true && (
            <p className="text-[11px] text-emerald-400">Username available!</p>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600
                     hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2
                     shadow-xl shadow-violet-900/40"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={onNext}
        className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}

// ─── Step 4 — Avatar ──────────────────────────────────────────────────────────

function Step4Avatar({
  avatarId,
  setAvatarId,
  onNext,
}: {
  avatarId: AvatarId;
  setAvatarId: (id: AvatarId) => void;
  onNext: () => void;
}) {
  return (
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2 text-white">Pick your vibe 🎨</h2>
        <p className="text-slate-300">Choose an avatar that represents you</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {AVATARS.map((av) => {
          const active = avatarId === av.id;
          return (
            <button
              key={av.id}
              type="button"
              onClick={() => setAvatarId(av.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                active
                  ? "border-violet-500 bg-violet-600/15 shadow-lg shadow-violet-900/30 scale-105"
                  : "border-slate-800 bg-[#0c0c18]/60 hover:border-slate-700 hover:scale-102"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${av.bg}
                            flex items-center justify-center shadow-lg`}
              >
                <span className={`text-3xl leading-none ${av.animClass}`}>{av.emoji}</span>
              </div>
              <span className="text-xs text-slate-300 font-medium">{av.name}</span>
              {active && (
                <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600
                   hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl
                   transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-900/40"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Step 5 — First habit ─────────────────────────────────────────────────────

function Step5Habit({
  suggestions,
  chosenHabit,
  setChosenHabit,
  onComplete,
  saving,
  error,
}: {
  suggestions: string[];
  chosenHabit: string | null;
  setChosenHabit: (h: string | null) => void;
  onComplete: (habit: string | null) => void;
  saving: boolean;
  error: string | null;
}) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const finalHabit = showCustom ? (custom.trim() || null) : chosenHabit;

  return (
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black mb-2 text-white">Add your first habit! 💪</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          Users who add a habit right now are{" "}
          <span className="text-violet-400 font-semibold">3× more likely</span> to stick with it
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {suggestions.length > 0 ? suggestions.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => { setChosenHabit(h); setShowCustom(false); }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
              chosenHabit === h && !showCustom
                ? "border-violet-500/60 bg-violet-600/20 shadow-lg shadow-violet-900/30"
                : "border-slate-800 bg-[#0c0c18]/80 hover:border-slate-700"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              chosenHabit === h && !showCustom ? "border-violet-500 bg-violet-500" : "border-slate-600"
            }`}>
              {chosenHabit === h && !showCustom && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-white">{h}</span>
          </button>
        )) : (
          // Fallback when no categories selected
          ["Morning workout (30 min)", "Read for 20 minutes", "10-min meditation"].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => { setChosenHabit(h); setShowCustom(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                chosenHabit === h && !showCustom
                  ? "border-violet-500/60 bg-violet-600/20 shadow-lg shadow-violet-900/30"
                  : "border-slate-800 bg-[#0c0c18]/80 hover:border-slate-700"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                chosenHabit === h && !showCustom ? "border-violet-500 bg-violet-500" : "border-slate-600"
              }`}>
                {chosenHabit === h && !showCustom && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium text-white">{h}</span>
            </button>
          ))
        )}

        {/* Custom habit */}
        <button
          type="button"
          onClick={() => { setShowCustom(true); setChosenHabit(null); }}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
            showCustom
              ? "border-violet-500/60 bg-violet-600/20"
              : "border-slate-800 border-dashed bg-[#0c0c18]/60 hover:border-slate-600"
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            showCustom ? "border-violet-500 bg-violet-500" : "border-slate-600"
          }`}>
            {showCustom && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm font-medium text-slate-300">Add my own habit…</span>
        </button>

        {showCustom && (
          <input
            autoFocus
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Drink 2L of water daily"
            maxLength={80}
            className="w-full px-4 py-3.5 bg-[#13131f] border border-violet-900/40 rounded-2xl
                       text-white text-sm placeholder-slate-700 focus:border-violet-500/70 focus:outline-none
                       focus:ring-2 focus:ring-violet-500/15 transition-all"
          />
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950/40 border border-red-700/35 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <button
        onClick={() => onComplete(finalHabit)}
        disabled={saving}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600
                   hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2
                   shadow-xl shadow-violet-900/40"
      >
        {saving ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Setting up your account…</>
        ) : (
          <>Let&apos;s Start! 🚀</>
        )}
      </button>

      {!saving && (
        <button
          onClick={() => onComplete(null)}
          className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}

// ─── Step 6 — Done ────────────────────────────────────────────────────────────

function Step6Done({
  displayName,
  avatarId,
  onDone,
}: {
  displayName: string;
  avatarId: AvatarId;
  onDone: () => void;
}) {
  const av = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  return (
    <div className="text-center max-w-sm w-full px-4">
      {/* Big avatar */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br shadow-2xl shadow-violet-900/60
                          ring-4 ring-violet-500/40 ring-offset-4 ring-offset-[#09090f]
                          flex items-center justify-center overflow-hidden"
               style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
          >
            <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${av.bg} flex items-center justify-center`}>
              <span className={`text-6xl leading-none ${av.animClass}`}>{av.emoji}</span>
            </div>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl bg-violet-500/20 blur-2xl -z-10 scale-150" />
        </div>
      </div>

      <h1 className="text-4xl font-black mb-3">
        You&apos;re all set,{" "}
        <span className="text-violet-400">{displayName}!</span>{" "}🎉
      </h1>
      <p className="text-xl text-slate-200 mb-2">Your journey starts NOW.</p>
      <p className="text-slate-300 mb-10">
        Build streaks, earn XP, and crush your goals — one day at a time.
      </p>

      <button
        onClick={onDone}
        className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r
                   from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                   text-white font-bold text-lg rounded-2xl shadow-xl shadow-violet-900/50
                   transition-all hover:scale-105"
      >
        Go to my Dashboard <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

function OnboardingFlow() {
  const router = useRouter();

  // ── Auth / initial load ──────────────────────────────────────────────────
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId]           = useState<string | null>(null);

  // ── Step state ───────────────────────────────────────────────────────────
  const [step, setStep]           = useState(1);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");

  // ── Step 2 ───────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<string[]>([]);

  // ── Step 3 ───────────────────────────────────────────────────────────────
  const [username, setUsername]   = useState("");
  const [checking, setChecking]   = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 4 ───────────────────────────────────────────────────────────────
  const [avatarId, setAvatarId] = useState<AvatarId>("ghost");

  // ── Step 5 ───────────────────────────────────────────────────────────────
  const [chosenHabit, setChosenHabit] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  // ── Step 6 ───────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");

  // ── Check auth + onboarding status ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, username, avatar_id")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) { router.replace("/dashboard"); return; }

      setUserId(user.id);
      if (profile?.username)  setUsername(profile.username);
      if (profile?.avatar_id) setAvatarId(profile.avatar_id as AvatarId);
      setLoadingAuth(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Username availability check ──────────────────────────────────────────
  useEffect(() => {
    if (!username || !USERNAME_RE.test(username)) {
      setAvailable(null); setChecking(false); return;
    }
    setChecking(true); setAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/friends/search?username=${encodeURIComponent(username)}`);
        const data = await res.json() as { user?: { id: string } | null };
        // Available if no one owns it, or if the current user already owns it
        setAvailable(!data.user || data.user.id === userId);
      } catch { setAvailable(null); }
      finally  { setChecking(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, userId]);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goNext = () => { setDirection("fwd");  setStep((s) => s + 1); };
  const goBack = () => { setDirection("back"); setStep((s) => s - 1); };

  // ── Complete onboarding ──────────────────────────────────────────────────
  const complete = async (habit: string | null) => {
    setSaving(true); setSaveError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileUpdate: Record<string, unknown> = {
        id:                   user.id,
        goals:                categories,
        avatar_id:            avatarId,
        onboarding_completed: true,
      };
      if (username.trim()) profileUpdate.username = username.toLowerCase().trim();

      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert(profileUpdate, { onConflict: "id" });
      if (dbErr) throw new Error(friendlyError(dbErr.message));

      if (habit) {
        await supabase.from("habits").insert({
          user_id:   user.id,
          name:      habit,
          frequency: "daily",
        });
      }

      const name = username.trim() || user.email?.split("@")[0] || "Champion";
      setDisplayName(name);
      setDirection("fwd");
      setStep(6);
    } catch (e) {
      setSaveError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Habit suggestions from selected categories ───────────────────────────
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const cat of categories) {
      const s = HABIT_SUGGESTIONS[cat as CategoryId]?.[0];
      if (s && !seen.has(s)) { seen.add(s); out.push(s); }
      if (out.length >= 3) break;
    }
    return out;
  }, [categories]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  const showProgressBar = step >= 1;
  const showBack        = step >= 2 && step <= 5;

  return (
    <div className="min-h-screen bg-[#09090f] text-white overflow-hidden relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute rounded-full bg-violet-700/20 blur-[130px]"
             style={{ width: 640, height: 640, top: "-12%", left: "-10%" }} />
        <div className="absolute rounded-full bg-purple-600/15 blur-[100px]"
             style={{ width: 520, height: 520, bottom: "-18%", right: "-8%" }} />
      </div>

      {/* Confetti on welcome and done screens */}
      {(step === 1 || step === 6) && <Confetti />}

      {/* Progress bar */}
      {showProgressBar && <ProgressBar step={step} />}

      {/* Back button */}
      {showBack && (
        <button
          onClick={goBack}
          className="fixed top-14 left-4 z-50 flex items-center gap-1.5 text-sm
                     text-slate-300 hover:text-white transition-colors p-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Step content — key forces remount/animation on each step change */}
      <div
        key={`step-${step}`}
        className={`relative z-10 min-h-screen flex items-center justify-center
          ${step >= 1 && step <= 5 ? "pt-16" : "pt-0"}
          ${direction === "fwd" ? "step-slide-in" : "step-slide-in-left"}`}
      >
        {step === 1 && <Step1Welcome onNext={goNext} />}

        {step === 2 && (
          <Step2Categories selected={categories} onChange={setCategories} onNext={goNext} />
        )}

        {step === 3 && (
          <Step3Username
            username={username}
            setUsername={(v) => { setUsername(v); setAvailable(null); }}
            checking={checking}
            available={available}
            userId={userId}
            onNext={goNext}
          />
        )}

        {step === 4 && (
          <Step4Avatar avatarId={avatarId} setAvatarId={setAvatarId} onNext={goNext} />
        )}

        {step === 5 && (
          <Step5Habit
            suggestions={suggestions}
            chosenHabit={chosenHabit}
            setChosenHabit={setChosenHabit}
            onComplete={complete}
            saving={saving}
            error={saveError}
          />
        )}

        {step === 6 && (
          <Step6Done
            displayName={displayName}
            avatarId={avatarId}
            onDone={() => router.push("/dashboard")}
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
