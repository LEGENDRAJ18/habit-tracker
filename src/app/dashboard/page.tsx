"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle2, Shield, Share2, Sparkles, Search, X } from "lucide-react";
import type { Plan } from "@/types";
import { useHabits } from "@/hooks/useHabits";
import { useProfile } from "@/hooks/useProfile";
import { FREE_HABIT_LIMIT } from "@/types";
import DashboardNav from "@/components/dashboard/DashboardNav";
import HabitCard from "@/components/dashboard/HabitCard";
import AddHabitModal from "@/components/dashboard/AddHabitModal";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import StreakBrokenModal from "@/components/dashboard/StreakBrokenModal";
import HabitRecommendations from "@/components/dashboard/HabitRecommendations";
import StatsBar from "@/components/dashboard/StatsBar";
import MilestoneCards from "@/components/dashboard/MilestoneCards";
import LevelUpModal from "@/components/dashboard/LevelUpModal";
import ShareAchievement from "@/components/dashboard/ShareAchievement";
import { useXP } from "@/hooks/useXP";
import { playSound } from "@/lib/sounds";
import { levelName } from "@/lib/xp";
import AIInsightModal from "@/components/dashboard/AIInsightModal";
import AICheckinCard from "@/components/dashboard/AICheckinCard";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import PromoBanner from "@/components/ui/PromoBanner";
import SmartNotification from "@/components/ui/SmartNotification";
import { toast } from "@/components/ui/Toast";
import HelpModal from "@/components/ui/HelpModal";
import OnboardingTour from "@/components/ui/OnboardingTour";
import HabitTemplatesModal from "@/components/dashboard/HabitTemplatesModal";

// ─── Greeting & quote ─────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const GOAL_SHORT: Record<string, string> = {
  "Get fit & healthy":     "fitness",
  "Learn & grow":          "learning",
  "Build mental wellness": "mental wellness",
  "Be more productive":    "productivity",
  "Improve sleep":         "sleep",
};

function formatGoalsLine(goals: string[]): string | null {
  if (goals.length === 0) return null;
  const short = goals.map((g) => GOAL_SHORT[g] ?? g.toLowerCase());
  if (short.length === 1) return `Ready to work on your ${short[0]} today?`;
  if (short.length === 2) return `Ready to work on your ${short[0]} and ${short[1]} today?`;
  return `Ready to work on your ${short[0]}, ${short[1]}, and ${short.length - 2} more today?`;
}

const QUOTES = [
  "Small daily improvements lead to remarkable results.",
  "You don't rise to your goals — you fall to your systems.",
  "The secret of getting ahead is getting started.",
  "Motivation gets you started. Habit keeps you going.",
  "You are what you repeatedly do.",
  "An investment in yourself pays the best interest.",
  "One day or day one — you decide.",
  "Progress, not perfection.",
  "Every expert was once a beginner.",
  "Discipline is choosing between what you want now and what you want most.",
  "Build the habit first. The results will follow.",
  "Success is the sum of small efforts repeated daily.",
  "The pain of discipline is lighter than the pain of regret.",
  "Don't wish for it — work for it.",
  "Your future self will thank you.",
];

function getDailyQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-violet-900/20 bg-[#0f0f1a] overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="w-6 h-6 rounded-full skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 skeleton rounded-full w-3/4" />
          <div className="h-2.5 skeleton rounded-full w-1/2 opacity-60" />
        </div>
        <div className="w-10 h-4 skeleton rounded-full" />
      </div>
      <div className="px-4 pb-3.5">
        <div className="h-1 skeleton rounded-full" />
      </div>
    </div>
  );
}

// ─── Quick stats row ──────────────────────────────────────────────────────────

function QuickStats({
  completedCount, totalHabits, bestStreak, totalXP,
}: {
  completedCount: number;
  totalHabits: number;
  bestStreak: number;
  totalXP: number;
}) {
  const [showXPInfo, setShowXPInfo] = useState(false);
  const pct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold leading-none text-violet-400" style={{ animation: "countUp 0.5s ease-out both" }}>{pct}%</p>
          <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-medium">Today · done</p>
        </div>

        <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold leading-none text-orange-400" style={{ animation: "countUp 0.5s ease-out both" }}>{bestStreak}d</p>
          <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-medium">Streak · best</p>
        </div>

        <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-lg font-bold leading-none text-amber-400" style={{ animation: "countUp 0.5s ease-out both" }}>
              {totalXP.toLocaleString()}
            </p>
            <button
              onClick={() => setShowXPInfo(true)}
              className="w-3.5 h-3.5 rounded-full bg-slate-700/60 text-slate-500 hover:text-white hover:bg-slate-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 transition-colors leading-none"
              title="How XP works"
            >
              ?
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider font-medium">XP · earned</p>
        </div>
      </div>

      {showXPInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowXPInfo(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl shadow-violet-950/50 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-5">How XP works 💡</h3>
            <div className="space-y-3 mb-5">
              {([
                {
                  icon: "✅", label: "Valid habit completed",   xp: "10 XP",
                  desc: "Specific, actionable habits",
                  color: "text-emerald-300", border: "border-emerald-800/30", bg: "bg-emerald-950/20",
                },
                {
                  icon: "⚠️", label: "Partial habit completed", xp: "5 XP",
                  desc: 'Vague habits like "be healthy"',
                  color: "text-amber-300",  border: "border-amber-800/30",  bg: "bg-amber-950/20",
                },
                {
                  icon: "❌", label: "Invalid habit completed", xp: "0 XP",
                  desc: "Nonsense or inappropriate habits",
                  color: "text-red-300",    border: "border-red-800/30",    bg: "bg-red-950/20",
                },
              ] as const).map(({ icon, label, xp, desc, color, border, bg }) => (
                <div key={label} className={`flex items-start gap-3 ${bg} border ${border} rounded-xl px-4 py-3`}>
                  <span className="text-lg leading-none flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white leading-snug">{label}</p>
                      <span className={`text-xs font-bold ${color} flex-shrink-0`}>{xp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-violet-300 font-medium text-center mb-5">
              Make your habits specific to earn maximum XP!
            </p>
            <button
              onClick={() => setShowXPInfo(false)}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ completed, total, tier }: { completed: number; total: number; tier: Plan }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const size = 76;
  const stroke = 6.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  const palette =
    tier === "pro"
      ? { from: "#f59e0b", to: "#fbbf24", glow: "rgba(245,158,11,0.45)", text: "text-amber-400" }
      : tier === "plus"
      ? { from: "#8b5cf6", to: "#e879f9", glow: "rgba(139,92,246,0.45)", text: "text-violet-400" }
      : { from: "#7c3aed", to: "#8b5cf6", glow: "rgba(124,58,237,0.4)",  text: "text-violet-400" };

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="habitRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to}   />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(109,40,217,0.12)"
          strokeWidth={stroke}
        />
        {/* Arc */}
        {total > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="url(#habitRingGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.75s cubic-bezier(0.4,0,0.2,1)",
              filter: `drop-shadow(0 0 5px ${palette.glow})`,
            }}
          />
        )}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-lg font-bold leading-none ${palette.text}`}>{pct}%</span>
        <span className="text-[10px] text-slate-600 leading-none mt-0.5">done</span>
      </div>
    </div>
  );
}

// ─── All-done celebration ─────────────────────────────────────────────────────

function AllDoneCelebration({
  onDismiss,
  onShare,
}: {
  onDismiss: () => void;
  onShare: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ animation: "celebIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-[#0f0f1a] border border-violet-700/30 rounded-3xl px-10 py-8 text-center shadow-2xl shadow-violet-950/60 max-w-xs mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-4 leading-none">🔥</div>
          <h3 className="text-2xl font-bold text-white mb-1.5">All done!</h3>
          <p className="text-sm text-violet-300 mb-4">Streak continues. Keep it up!</p>
          <button
            onClick={onShare}
            className="w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 font-medium rounded-xl text-sm transition-all mb-4 flex items-center justify-center gap-2"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share your win
          </button>
          {/* Auto-dismiss progress bar */}
          <div className="h-0.5 bg-violet-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full origin-left"
              style={{ animation: "celebProgress 5s linear both" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const { habits, loading, error, completedCount, toggleHabit, deleteHabit, removeHabitOptimistic, restoreHabit, commitDeleteHabit, isCompletedToday, addHabit, renameHabit, getStreakInfo, hasBrokenStreak, getStreak, getHabitStrength } =
    useHabits();
  const { tier, profileLoading, onboardingCompleted, goals, freezeAvailable, freezeProtectedDate, applyFreeze, signedUpAt } = useProfile();
  const { xp, level, achievements, totalCompletions, justLeveledUp, isDailyAchieved, onHabitCompleted, checkMilestones, dismissLevelUp } = useXP();

  // Persisted across tab navigation via sessionStorage so remounts don't re-show the modal.
  // Also guarded by: onboardingCompleted (Supabase), signedUpAt < 1h, and habits.length === 0.
  const [onboardingDone, setOnboardingDone] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        !!localStorage.getItem("habitai_onboarding_done") ||
        !!sessionStorage.getItem("habitai_onboarding_done")
      );
    }
    return false;
  });

  const MS_1H = 60 * 60 * 1000;
  const isNewUser = !signedUpAt || (Date.now() - new Date(signedUpAt).getTime()) < MS_1H;
  const showOnboarding =
    !profileLoading &&
    !loading &&
    !onboardingCompleted &&
    !onboardingDone &&
    isNewUser &&
    habits.length === 0;

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<import("@/components/dashboard/UpgradeModal").UpgradeReason>("habits");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [showCelebration, setShowCelebration]   = useState(false);
  const [showStreakBroken, setShowStreakBroken] = useState(false);
  const [showReOnboard, setShowReOnboard]       = useState(false);
  const [shareData, setShareData] = useState<{ type: "streak" | "level" | "daily"; value: number; tier?: string } | null>(null);
  const [showAIInsight, setShowAIInsight] = useState(false);
  const [checkinHabit, setCheckinHabit]   = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const prevCompletedRef   = useRef<number | null>(null);
  const seenBreakModalRef  = useRef(false);
  const appliedFreezeRef   = useRef(false);

  const isPaid = tier === "plus" || tier === "pro";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    const checkout = params.get("checkout");
    if (upgrade === "success") setUpgradeSuccess(true);
    if (checkout === "plus" || checkout === "pro") {
      const priceId =
        checkout === "plus"
          ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
          : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.url) window.location.href = data.url;
        });
    }
  }, []);

  // Trigger all-done celebration when every habit becomes completed
  useEffect(() => {
    if (loading || habits.length === 0) return;
    const prev = prevCompletedRef.current;
    if (prev !== null && prev < habits.length && completedCount === habits.length) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5200);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, habits.length, loading]);

  // Per-habit streak info with freeze awareness
  const streakInfoMap = useMemo(() => {
    const map = new Map<string, { streak: number; freezeApplied: boolean; newFreezeUsed: boolean }>();
    for (const habit of habits) {
      map.set(habit.id, getStreakInfo(habit.id, isPaid, freezeAvailable, freezeProtectedDate));
    }
    return map;
  }, [habits, getStreakInfo, isPaid, freezeAvailable, freezeProtectedDate]);

  const bestStreak = useMemo(
    () => Math.max(0, ...habits.map((h) => getStreak(h.id))),
    [habits, getStreak],
  );

  const anyFreezeApplied  = useMemo(() => Array.from(streakInfoMap.values()).some((i) => i.freezeApplied),  [streakInfoMap]);
  const anyNewFreezeUsed  = useMemo(() => Array.from(streakInfoMap.values()).some((i) => i.newFreezeUsed),  [streakInfoMap]);

  // Persist freeze to DB the first time a fresh freeze is detected this session
  useEffect(() => {
    if (!anyNewFreezeUsed || appliedFreezeRef.current) return;
    appliedFreezeRef.current = true;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    applyFreeze(yesterday);
  }, [anyNewFreezeUsed, applyFreeze]);

  // Show streak-broken modal once per session for free users
  useEffect(() => {
    if (loading || isPaid || seenBreakModalRef.current) return;
    if (habits.some((h) => hasBrokenStreak(h.id))) {
      seenBreakModalRef.current = true;
      setShowStreakBroken(true);
    }
  }, [loading, isPaid, habits, hasBrokenStreak]);

  // Check milestones whenever completed count or streak changes
  useEffect(() => {
    if (loading || habits.length === 0) return;
    checkMilestones(completedCount, habits.length, bestStreak).then((newly) => {
      if (newly.has("streak_30")) {
        playSound("streak");
        setShareData({ type: "streak", value: 30 });
      } else if (newly.has("streak_7")) {
        playSound("streak");
        setShareData({ type: "streak", value: 7 });
      } else if (newly.size > 0) {
        playSound("milestone");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount, bestStreak, loading]);

  // Play level-up sound when justLeveledUp fires
  useEffect(() => {
    if (justLeveledUp !== null) playSound("levelup");
  }, [justLeveledUp]);

  // Daily check-in: detect missed habits from yesterday (once per day)
  useEffect(() => {
    if (loading || habits.length === 0) return;
    const todayKey = new Date().toISOString().split("T")[0];
    const lsKey    = `ai_checkin_dismissed_${todayKey}`;
    if (localStorage.getItem(lsKey)) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const missedYesterday = habits.find((h) => !getStreak(h.id) && h.created_at.split("T")[0] < yesterday);
    if (missedYesterday) setCheckinHabit(missedYesterday.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, habits.length]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleAddClick = useCallback(() => {
    if (!isPaid && habits.length >= FREE_HABIT_LIMIT) {
      setUpgradeReason("habits");
      setShowUpgrade(true);
    } else {
      setShowAdd(true);
    }
  }, [isPaid, habits.length]);

  // Keyboard shortcuts: N = add habit, A = mark first incomplete done
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleAddClick();
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        const first = habits.find((h) => !isCompletedToday(h.id));
        if (first) toggleHabit(first.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAddClick, habits, isCompletedToday, toggleHabit]);

  // Filtered habits for search
  const filteredHabits = useMemo(
    () =>
      search.trim()
        ? habits.filter((h) => h.name.toLowerCase().includes(search.toLowerCase().trim()))
        : habits,
    [habits, search],
  );

  return (
    <div className="min-h-screen bg-[#09090f]">
      <DashboardNav
        habitCount={habits.length}
        tier={tier}
        onUpgradeClick={() => setShowUpgrade(true)}
      />

      {!profileLoading && <PromoBanner tier={tier} />}

      <SmartNotification
        tier={tier}
        habitCount={habits.length}
        onUpgradeClick={() => setShowUpgrade(true)}
        onAIInsightClick={() => setShowAIInsight(true)}
      />

      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-8 pb-28 sm:pb-8 page-fade">
        {/* Upgrade success banner */}
        {upgradeSuccess && (
          <div className="flex items-center gap-3 bg-green-950/40 border border-green-800/40 rounded-xl p-4 mb-6">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              Welcome to your new plan! Your account has been upgraded.
            </p>
          </div>
        )}

        {/* Three-column layout: left sidebar (lg+), center, right sidebar (xl+) */}
        <div className="lg:grid lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px] lg:gap-6 lg:items-start">

        {/* ── Left sidebar (lg+) ────────────────────────────────────────── */}
        <LeftSidebar
          xp={xp}
          level={level}
          bestStreak={bestStreak}
          tier={tier}
          onUpgradeClick={() => setShowUpgrade(true)}
        />

        {/* ── Center column ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Mobile-only horizontal StatsBar */}
          <div className="lg:hidden">
            <StatsBar xp={xp} level={level} bestStreak={bestStreak} totalCompletions={totalCompletions} />
          </div>

        {/* Header */}
        <div className="mb-8">
          {/* Greeting */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{today}</p>
          <h1 className="text-2xl font-bold text-white mb-1">{getGreeting()} 👋</h1>
          {formatGoalsLine(goals) && (
            <p className="text-sm text-violet-300/80 font-medium mb-1">{formatGoalsLine(goals)}</p>
          )}
          <p className="text-sm text-slate-500 italic mb-5">&ldquo;{getDailyQuote()}&rdquo;</p>

          {/* Quick stats — only when habits exist */}
          {!loading && habits.length > 0 && (
            <QuickStats
              completedCount={completedCount}
              totalHabits={habits.length}
              bestStreak={bestStreak}
              totalXP={xp}
            />
          )}

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-white">Today&apos;s Habits</h2>
              </div>
              {habits.length > 0 && (
                <p className="text-sm text-slate-400 mt-1">
                  {completedCount === habits.length
                    ? "All done! Amazing work today 🎉"
                    : `${habits.length - completedCount} remaining`}
                </p>
              )}
              {/* Streak protection info for paid users */}
              {!loading && isPaid && habits.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {anyFreezeApplied && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-950/40 border border-blue-700/30 px-2 py-0.5 rounded-full">
                      <Shield className="w-3 h-3" />
                      Streak Protected
                    </span>
                  )}
                  <span className={`text-xs ${freezeAvailable ? "text-slate-500" : "text-slate-600"}`}>
                    {freezeAvailable ? "1 freeze available this week" : "0 freezes left this week"}
                  </span>
                </div>
              )}
            </div>
            {habits.length > 0 && (
              <ProgressRing completed={completedCount} total={habits.length} tier={tier} />
            )}
          </div>

          {/* Progress bar */}
          {habits.length > 0 && (
            <div className="mt-4 w-full h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-700"
                style={{ width: habits.length > 0 ? `${Math.round((completedCount / habits.length) * 100)}%` : "0%" }}
              />
            </div>
          )}
        </div>

        {/* Daily AI check-in card */}
        {checkinHabit && isPaid && (
          <AICheckinCard
            missedHabitName={checkinHabit}
            onDismiss={() => {
              setCheckinHabit(null);
              const todayKey = new Date().toISOString().split("T")[0];
              localStorage.setItem(`ai_checkin_dismissed_${todayKey}`, "1");
            }}
          />
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4 mb-6">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading — skeleton cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : habits.length === 0 ? (
          /* Empty state — inspiring */
          <div className="text-center py-16 page-fade">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-3xl bg-violet-600/10 border border-violet-600/20 rotate-6" />
              <div className="absolute inset-0 rounded-3xl bg-violet-600/15 border border-violet-600/25 -rotate-3" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/30 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                <span className="text-4xl">🌱</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start your journey</h2>
            <p className="text-slate-400 text-sm mb-2 max-w-xs mx-auto leading-relaxed">
              Every great habit starts with a single decision. Add your first habit and begin the compound effect.
            </p>
            <p className="text-xs text-violet-400/60 mb-8">Join 10,000+ people building better habits</p>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-violet-900/40 text-base min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              Add your first habit
            </button>
          </div>
        ) : (
          /* Habit list */
          <div className="space-y-3">
            {/* Add habit button — always at top */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddClick}
                data-tour="add-habit"
                aria-label={!isPaid && habits.length >= FREE_HABIT_LIMIT ? "Upgrade to add more habits" : "Add a new habit (press N)"}
                title={!isPaid && habits.length >= FREE_HABIT_LIMIT ? "Upgrade to add more" : "Add habit  ·  Press N"}
                className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed transition-all text-sm font-medium ${
                  !isPaid && habits.length >= FREE_HABIT_LIMIT
                    ? "border-violet-700/30 text-violet-500 hover:text-violet-400 hover:bg-violet-950/20"
                    : "border-violet-600/50 text-violet-400 hover:bg-violet-950/30 hover:border-violet-500/70"
                }`}
              >
                <Plus className="w-4 h-4" />
                {!isPaid && habits.length >= FREE_HABIT_LIMIT ? "Upgrade to add more habits" : "Add habit"}
                <kbd className="ml-auto text-[10px] text-violet-600 bg-violet-950/60 border border-violet-800/40 rounded px-1.5 py-0.5 hidden sm:block">N</kbd>
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                aria-label="Browse habit templates"
                title="Browse templates"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-violet-800/30 text-slate-500 hover:text-violet-300 hover:border-violet-700/50 hover:bg-violet-950/20 transition-all text-xs font-medium flex-shrink-0"
              >
                <span className="text-sm">✨</span>
                <span className="hidden sm:inline">Templates</span>
              </button>
            </div>

            {/* Search bar — shown when there are 3+ habits */}
            {habits.length >= 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter habits…"
                  aria-label="Filter habits by name"
                  className="w-full bg-violet-950/20 border border-violet-900/25 focus:border-violet-600/50 focus:outline-none focus:ring-1 focus:ring-violet-600/20 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-600 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Empty filter state */}
            {search.trim() && filteredHabits.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                No habits match &ldquo;{search}&rdquo;
              </p>
            )}

            {filteredHabits.map((habit) => {
              const info = streakInfoMap.get(habit.id) ?? { streak: 0, freezeApplied: false, newFreezeUsed: false };
              const stackParent = habit.stack_after_id ? habits.find((h) => h.id === habit.stack_after_id) : undefined;
              return (
              <HabitCard
                key={habit.id}
                habit={habit}
                completed={isCompletedToday(habit.id)}
                streak={info.streak}
                strength={getHabitStrength(habit.id)}
                isProtected={info.freezeApplied}
                stackAfterName={stackParent?.name}
                onToggle={() => toggleHabit(habit.id)}
                onDelete={() => {
                  const removed = removeHabitOptimistic(habit.id);
                  if (!removed) return;
                  let undone = false;
                  const dismiss = toast(
                    `"${removed.name}" deleted`,
                    "success",
                    {
                      label: "Undo",
                      onClick: () => {
                        undone = true;
                        restoreHabit(removed);
                      },
                    },
                    5000,
                  );
                  setTimeout(() => {
                    if (!undone) commitDeleteHabit(removed.id);
                    dismiss();
                  }, 5000);
                }}
                isEditing={editingHabitId === habit.id}
                onCompleted={() => {
                  const validity = habit.validity_score ?? "valid";
                  playSound("complete");
                  onHabitCompleted(validity);
                  if (validity === "invalid") {
                    toast(
                      `"${habit.name}" earns no XP — edit the name to earn points`,
                      "error",
                      { label: "Edit", onClick: () => setEditingHabitId(habit.id) },
                      5000,
                    );
                  }
                }}
                onRename={async (newName, validityScore) => {
                  await renameHabit(habit.id, newName, validityScore);
                  setEditingHabitId(null);
                }}
              />
              );
            })}

          </div>
        )}

        {/* Daily milestones — hidden on xl+ (right sidebar handles it) */}
        <div className="xl:hidden">
          {!loading && habits.length > 0 && (
            <MilestoneCards
              completedCount={completedCount}
              totalHabits={habits.length}
              bestStreak={bestStreak}
              isDailyAchieved={isDailyAchieved}
              hasStreak7={achievements.includes("streak_7")}
              hasStreak30={achievements.includes("streak_30")}
              onShare={(type, value) => setShareData({ type, value })}
            />
          )}
        </div>

        {/* Recommended habits */}
        {!loading && !profileLoading && onboardingCompleted && (
          <HabitRecommendations
            goals={goals}
            existingHabits={habits}
            canAddMore={isPaid || habits.length < FREE_HABIT_LIMIT}
            onAdd={(name, desc) => addHabit(name, desc, "daily")}
            onSetGoal={() => setShowReOnboard(true)}
            onUpgrade={() => setShowUpgrade(true)}
          />
        )}

        </div>{/* end left column */}

        {/* ── Right sidebar (xl only) ────────────────────────────────────── */}
        <div className="hidden xl:flex xl:flex-col gap-4 sticky top-20">

          {/* AI Insight — prominent card */}
          <div data-tour="ai-insight" className="relative overflow-hidden rounded-2xl border border-violet-600/30 bg-[#0c0c18]">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-[#0f0f1a] to-purple-950/60" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-12 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <p className="text-sm font-semibold text-white">AI Coaching</p>
              </div>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                Get personalised insights on your habits, streaks, and patterns.
              </p>
              <button
                onClick={() => setShowAIInsight(true)}
                aria-label={isPaid ? "Open AI coaching insight" : "Upgrade to unlock AI coaching"}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isPaid
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-violet-950/60 border border-violet-800/40 text-slate-500"
                }`}
                style={isPaid ? { boxShadow: "0 0 20px rgba(139,92,246,0.4)" } : undefined}
              >
                {isPaid ? "Analyse My Habits" : "Upgrade to Unlock"}
              </button>
              <p className="text-[10px] text-slate-600 text-center mt-2">
                {tier === "pro" ? "Unlimited insights · Pro" : isPaid ? "5 insights / day · Plus" : "Available on Plus & Pro"}
              </p>
            </div>
          </div>

          {/* Milestones */}
          {!loading && habits.length > 0 && (
            <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
              <MilestoneCards
                completedCount={completedCount}
                totalHabits={habits.length}
                bestStreak={bestStreak}
                isDailyAchieved={isDailyAchieved}
                hasStreak7={achievements.includes("streak_7")}
                hasStreak30={achievements.includes("streak_30")}
                sidebar
                onShare={(type, value) => setShareData({ type, value })}
              />
            </div>
          )}

          {/* Community card */}
          <a
            href="https://discord.gg/U3FFHFq3"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#0c0c18] border border-[#5865F2]/25 hover:border-[#5865F2]/50 rounded-2xl p-4 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#5865F2]/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#8891F7]" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">Community</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Join HabitAI users sharing tips, streaks, and accountability.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8891F7] group-hover:text-[#a5adf9] transition-colors">
              Join Discord — it&apos;s free
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </a>
        </div>
        </div>{/* end two-column grid */}

        {/* Floating add button on mobile */}
        {!loading && habits.length > 0 && (
          <button
            onClick={handleAddClick}
            aria-label="Add a new habit"
            title="Add habit"
            className="fixed bottom-20 right-4 sm:hidden w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-xl shadow-violet-900/40 flex items-center justify-center transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </main>

      {showAdd && (
        <AddHabitModal
          onClose={() => setShowAdd(false)}
          existingHabits={habits}
          onAdd={addHabit}
          goals={goals}
        />
      )}

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} reason={upgradeReason} />
      )}

      {(showOnboarding || showReOnboard) && (
        <OnboardingModal onComplete={() => {
          localStorage.setItem("habitai_onboarding_done", "1");
          sessionStorage.setItem("habitai_onboarding_done", "1");
          setOnboardingDone(true);
          setShowReOnboard(false);
        }} />
      )}

      {showCelebration && (
        <AllDoneCelebration
          onDismiss={() => setShowCelebration(false)}
          onShare={() => {
            setShowCelebration(false);
            setShareData({ type: "daily", value: bestStreak });
          }}
        />
      )}

      {showStreakBroken && (
        <StreakBrokenModal
          onUpgrade={() => { setShowStreakBroken(false); setShowUpgrade(true); }}
          onDismiss={() => setShowStreakBroken(false)}
          brokenHabitName={habits.find((h) => hasBrokenStreak(h.id))?.name}
          isPaid={isPaid}
        />
      )}

      {showAIInsight && (
        <AIInsightModal
          tier={tier}
          onClose={() => setShowAIInsight(false)}
          onUpgrade={() => { setShowAIInsight(false); setUpgradeReason("ai"); setShowUpgrade(true); }}
        />
      )}

      {justLeveledUp !== null && (
        <LevelUpModal
          newLevel={justLeveledUp}
          onDismiss={dismissLevelUp}
          onShare={() => {
            setShareData({ type: "level", value: justLeveledUp, tier: levelName(justLeveledUp) });
            dismissLevelUp();
          }}
        />
      )}

      {showTemplates && (
        <HabitTemplatesModal
          onClose={() => setShowTemplates(false)}
          existingHabits={habits}
          canAddMore={isPaid || habits.length < FREE_HABIT_LIMIT}
          onAdd={addHabit}
          onHitLimit={() => { setShowTemplates(false); setUpgradeReason("habits"); setShowUpgrade(true); }}
        />
      )}

      {shareData && (
        <ShareAchievement
          type={shareData.type}
          value={shareData.value}
          tier={shareData.tier}
          userStreak={bestStreak}
          userLevel={level}
          userXp={xp}
          onClose={() => setShareData(null)}
        />
      )}

      {/* Floating help button + FAQ modal */}
      <HelpModal />

      {/* First-visit onboarding tour (3 steps) */}
      {!loading && !profileLoading && (
        <OnboardingTour habitCount={habits.length} signedUpAt={signedUpAt} />
      )}
    </div>
  );
}
