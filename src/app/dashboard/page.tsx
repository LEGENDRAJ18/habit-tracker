"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle, CheckCircle2, Shield, Share2, Sparkles, Search, X, ClipboardList, Crown, Flame, Brain, Calendar, ChevronUp, Zap } from "lucide-react";
import type { Plan } from "@/types";
import { useHabits } from "@/hooks/useHabits";
import { useProfile } from "@/hooks/useProfile";
import { FREE_HABIT_LIMIT } from "@/types";
import HabitCard from "@/components/dashboard/HabitCard";
import AddHabitModal from "@/components/dashboard/AddHabitModal";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import StreakBrokenModal from "@/components/dashboard/StreakBrokenModal";
import HabitRecommendations from "@/components/dashboard/HabitRecommendations";
import MilestoneCards from "@/components/dashboard/MilestoneCards";
import LevelUpModal from "@/components/dashboard/LevelUpModal";
import ShareAchievement from "@/components/dashboard/ShareAchievement";
import { useXP } from "@/hooks/useXP";
import { playSound } from "@/lib/sounds";
import { levelName, levelEmoji, xpIntoLevel, xpSpanOfLevel, levelColorKey, type LevelColorKey } from "@/lib/xp";
import XPDetailSheet from "@/components/dashboard/XPDetailSheet";
import AICheckinCard from "@/components/dashboard/AICheckinCard";
import SmartNotification from "@/components/ui/SmartNotification";
import { toast } from "@/components/ui/Toast";
import OnboardingTour from "@/components/ui/OnboardingTour";
import HabitTemplatesModal from "@/components/dashboard/HabitTemplatesModal";
import WeeklyPlanCard from "@/components/dashboard/WeeklyPlanCard";
import FirstHabitWow from "@/components/dashboard/FirstHabitWow";
import FirstWeekCheckin from "@/components/dashboard/FirstWeekCheckin";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { useAIInsight } from "@/contexts/AIInsightContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotificationPermissionModal from "@/components/pwa/NotificationPermissionModal";
import { createClient } from "@/lib/supabase/client";
import MonthlyWrapped from "@/components/dashboard/MonthlyWrapped";
import HabitDNAModal from "@/components/dashboard/HabitDNAModal";
import CommitmentModal from "@/components/dashboard/CommitmentModal";
import MoodCheckin from "@/components/dashboard/MoodCheckin";
import ParentDashboard from "@/components/dashboard/ParentDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import FocusTimer from "@/components/dashboard/FocusTimer";
import FocusStatsWidget from "@/components/dashboard/FocusStatsWidget";
import FirstCompletionModal from "@/components/dashboard/FirstCompletionModal";
import WelcomeOverlay from "@/components/dashboard/WelcomeOverlay";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { Habit } from "@/types";
import posthog from "posthog-js";

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

// ─── Level color theme (mirrors DashboardNav's level→color mapping) ──────────

const LEVEL_COLORS: Record<LevelColorKey, { bar: string; text: string; ring: string; bg: string }> = {
  slate:   { bar: "from-slate-500 to-slate-400",   text: "text-slate-300",  ring: "ring-slate-600/50",   bg: "bg-slate-700/20"   },
  emerald: { bar: "from-emerald-500 to-teal-400",   text: "text-emerald-300", ring: "ring-emerald-600/50", bg: "bg-emerald-900/20" },
  blue:    { bar: "from-blue-500 to-cyan-400",      text: "text-blue-300",   ring: "ring-blue-600/50",    bg: "bg-blue-900/20"    },
  violet:  { bar: "from-violet-500 to-fuchsia-400", text: "text-violet-300", ring: "ring-violet-600/50",  bg: "bg-violet-900/20"  },
  amber:   { bar: "from-amber-400 to-yellow-300",   text: "text-amber-300",  ring: "ring-amber-500/60",   bg: "bg-amber-900/20"   },
  red:     { bar: "from-red-500 to-orange-400",     text: "text-red-300",    ring: "ring-red-600/60",     bg: "bg-red-900/20"     },
  gold:    { bar: "from-yellow-400 to-amber-300",   text: "text-yellow-200", ring: "ring-yellow-400/70",  bg: "bg-yellow-900/20"  },
};

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
  completedCount, totalHabits, bestStreak, totalXP, xpLoading, onOpenXP,
}: {
  completedCount: number;
  totalHabits: number;
  bestStreak: number;
  totalXP: number;
  xpLoading: boolean;
  onOpenXP: () => void;
}) {
  const pct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/35 to-[#0c0c18] border border-violet-700/30 rounded-xl px-3 py-2.5 text-center">
        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
        <p className="text-lg font-bold leading-none text-violet-300 tabular-nums" style={{ animation: "countUp 0.5s ease-out both" }}>{pct}%</p>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">Today · done</p>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-orange-900/35 to-[#0c0c18] border border-orange-700/30 rounded-xl px-3 py-2.5 text-center">
        <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
        <p className="text-lg font-bold leading-none text-orange-400 tabular-nums" style={{ animation: "countUp 0.5s ease-out both" }}>{bestStreak}d</p>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">Streak · best</p>
      </div>

      <button
        onClick={onOpenXP}
        className="relative overflow-hidden bg-gradient-to-br from-amber-900/30 to-[#0c0c18] border border-amber-700/30 hover:border-amber-500/50 rounded-xl px-3 py-2.5 text-center transition-all active:scale-95 group"
      >
        {xpLoading ? (
          <div className="h-5 w-12 skeleton rounded mx-auto" />
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold leading-none text-amber-400 tabular-nums" style={{ animation: "countUp 0.5s ease-out both" }}>{totalXP.toLocaleString()}</p>
          </>
        )}
        <p className="text-[10px] text-slate-500 group-hover:text-amber-300 mt-1 uppercase tracking-wider font-medium transition-colors">XP · tap ›</p>
      </button>
    </div>
  );
}

// ─── XP Level Bar (tappable) ─────────────────────────────────────────────────

function XPLevelBar({ xp, level, onClick }: { xp: number; level: number; onClick: () => void }) {
  const xpInto = xpIntoLevel(xp);
  const xpSpan = xpSpanOfLevel(xp);
  const pct    = xpSpan > 0 ? Math.min(100, Math.round((xpInto / xpSpan) * 100)) : 100;
  const s      = LEVEL_COLORS[levelColorKey(level)];
  return (
    <button
      data-tour="xp-bar"
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-[#0c0c18] border border-violet-900/25 hover:border-violet-600/45 rounded-xl px-3 py-2.5 mb-4 transition-all group active:scale-[0.99]"
    >
      <div className={`w-9 h-9 rounded-xl ${s.bg} ring-2 ${s.ring} flex items-center justify-center flex-shrink-0`}>
        <span className="text-base leading-none">{levelEmoji(level)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold text-white">Lv {level} · {levelName(level)}</p>
          <p className={`text-[10px] font-medium tabular-nums ${s.text}`}>{xpInto.toLocaleString()} / {xpSpan.toLocaleString()} XP</p>
        </div>
        <div className="h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-700`}
            style={{ width: `${pct}%`, boxShadow: "0 0 6px rgba(139,92,246,0.5)" }}
          />
        </div>
      </div>
      <span className="text-[13px] text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0 leading-none">›</span>
    </button>
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

// ─── Weekly progress bar ─────────────────────────────────────────────────────

function WeeklyProgressBar({ logs }: { logs: Pick<{ habit_id: string; completed_at: string }, "habit_id" | "completed_at">[] }) {
  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysFromMon + i);
    const key = d.toISOString().split("T")[0];
    return { key, label: ["M", "T", "W", "T", "F", "S", "S"][i], isToday: key === todayKey, isFuture: key > todayKey };
  });

  const completedDays = new Set(logs.map((l) => l.completed_at.split("T")[0]));
  const activeDays = weekDays.filter((d) => !d.isFuture && completedDays.has(d.key)).length;

  return (
    <div className="flex items-center gap-2.5 mt-3">
      <div className="flex items-center gap-1">
        {weekDays.map((d) => (
          <div
            key={d.key}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              d.isFuture
                ? "bg-slate-900/20 text-slate-800"
                : completedDays.has(d.key)
                ? "bg-violet-600 text-white shadow-sm shadow-violet-900/40"
                : d.isToday
                ? "bg-violet-950/60 border border-violet-700/40 text-violet-500"
                : "bg-slate-900/40 text-slate-700"
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-slate-600 font-medium whitespace-nowrap">{activeDays}/7 this week</span>
    </div>
  );
}

// ─── Celebration confetti ─────────────────────────────────────────────────────
const CELEB_CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 2.8) % 100}%`,
  delay: (i * 61) % 900,
  duration: 1300 + ((i * 113) % 700),
  size: 5 + (i % 4) * 2,
  color: ["#8b5cf6","#a78bfa","#fbbf24","#34d399","#60a5fa","#f472b6","#fb923c","#e879f9"][i % 8],
  isCircle: i % 3 === 0,
}));

// ─── All-done celebration ─────────────────────────────────────────────────────

function AllDoneCelebration({
  onDismiss,
  onShare,
  completedCount,
  bestStreak,
  xpToday,
}: {
  onDismiss: () => void;
  onShare: () => void;
  completedCount: number;
  bestStreak: number;
  xpToday: number;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
      style={{ animation: "celebIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {CELEB_CONFETTI.map((c, i) => (
        <div
          key={i}
          className="absolute top-0 pointer-events-none"
          style={{
            left: c.left,
            width: c.size, height: c.size,
            backgroundColor: c.color,
            borderRadius: c.isCircle ? "50%" : "2px",
            animation: `confettiFall ${c.duration}ms linear ${c.delay}ms both`,
            zIndex: 0,
          }}
        />
      ))}
      <div
        className="relative z-10 bg-[#0f0f1a] border border-violet-700/30 rounded-3xl px-8 py-8 text-center shadow-2xl shadow-violet-950/60 max-w-xs mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.3), 0 25px 60px rgba(0,0,0,0.6)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/12 to-transparent rounded-3xl" />
        <div className="relative">
          <div className="text-5xl mb-3 leading-none" style={{ animation: "checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 100ms both" }}>🔥</div>
          <h3 className="text-2xl font-black text-white mb-1">All done!</h3>
          <p className="text-sm text-violet-300 mb-4 font-medium">Streak continues. You showed up today.</p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-violet-950/40 rounded-xl py-2.5 border border-violet-800/20">
              <p className="text-lg font-bold text-violet-300 leading-none">{completedCount}</p>
              <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider">Done</p>
            </div>
            <div className="bg-orange-950/30 rounded-xl py-2.5 border border-orange-800/20">
              <p className="text-lg font-bold text-orange-300 leading-none">{bestStreak}d</p>
              <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider">Streak</p>
            </div>
            <div className="bg-amber-950/30 rounded-xl py-2.5 border border-amber-800/20">
              <p className="text-lg font-bold text-amber-300 leading-none">+{xpToday}</p>
              <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider">XP Today</p>
            </div>
          </div>

          <button
            onClick={onShare}
            className="w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 font-semibold rounded-xl text-sm transition-all mb-4 flex items-center justify-center gap-2"
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


// ─── Personalised empty state ─────────────────────────────────────────────────

const EMPTY_RECS: Record<string, { emoji: string; name: string; desc: string }[]> = {
  "Get fit & healthy": [
    { emoji: "🏃", name: "Morning Run",              desc: "Start the day with a 20-min run" },
    { emoji: "💧", name: "Drink 8 glasses of water", desc: "Stay hydrated throughout the day" },
    { emoji: "🧘", name: "10 min stretching",        desc: "Loosen up and prevent injuries" },
  ],
  "Learn & grow": [
    { emoji: "📖", name: "Read 20 pages",             desc: "Daily reading compounds into mastery" },
    { emoji: "🎯", name: "Practice a skill 30 min",   desc: "Deliberate practice beats talent" },
    { emoji: "📔", name: "Write in a journal",         desc: "Reflect and capture your thoughts" },
  ],
  "Build mental wellness": [
    { emoji: "🧘", name: "10 min meditation",         desc: "Clear your mind and reduce stress" },
    { emoji: "🙏", name: "Gratitude journal",          desc: "Write 3 things you're grateful for" },
    { emoji: "🌬️", name: "Deep breathing exercises",  desc: "4-7-8 breathing for calm focus" },
  ],
  "Be more productive": [
    { emoji: "📝", name: "Plan tomorrow tonight",     desc: "Set up for a winning next day" },
    { emoji: "📵", name: "No phone first 30 min",     desc: "Start the day distraction-free" },
    { emoji: "🍅", name: "Pomodoro work session",     desc: "25 min focused, 5 min break" },
  ],
  "Improve sleep": [
    { emoji: "📺", name: "No screens 1hr before bed", desc: "Wind down without blue light" },
    { emoji: "🌙", name: "Sleep by 10pm",              desc: "Consistent bedtime builds routine" },
    { emoji: "☕", name: "No caffeine after 2pm",      desc: "Protect your sleep quality" },
  ],
};

function getEmptyStateRecs(goals: string[]) {
  for (const goal of goals) {
    const recs = EMPTY_RECS[goal];
    if (recs) return { goal, recs };
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { habits, todayLogs, loading, isSyncing, error, completedCount, toggleHabit, deleteHabit, removeHabitOptimistic, restoreHabit, commitDeleteHabit, isCompletedToday, isFailedToday, markFailed, addHabit, renameHabit, getStreakInfo, hasBrokenStreak, getStreak, getHabitStrength, refetch, historicalLogs, completeHabitWithVerification, undoCompletion, addLaterReminder, skipHabitToday } =
    useHabits();
  const { tier, profileLoading, onboardingCompleted, goal, goals, freezeAvailable, freezeProtectedDate, applyFreeze, signedUpAt, dreamUniversity, userMode, username, persona, welcomeSeen, markWelcomeSeen, notifPromptLastAskedAt, markNotifPromptAsked } = useProfile();
  const { xp, level, achievements, totalCompletions, justLeveledUp, xpLoading, isDailyAchieved, onHabitCompleted, onDailyOpen, checkMilestones, dismissLevelUp } = useXP();
  const { openUpgradeModal } = useUpgrade();
  const { openAIInsight } = useAIInsight();
  const { showModal: showPushModal, allow: allowPush, dismiss: dismissPush, showAfterFirstCompletion } = usePushNotifications();

  // Update last_seen_at so streak-at-risk detection works
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", session.user.id);
      }
    });
  }, []);

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
  const isNewUser = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => !signedUpAt || (Date.now() - new Date(signedUpAt).getTime()) < MS_1H,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signedUpAt]
  );
  const journeyDay = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => signedUpAt ? Math.max(1, Math.round((Date.now() - new Date(signedUpAt).getTime()) / 86400000)) : 1,
    [signedUpAt]
  );
  const showOnboarding =
    !profileLoading &&
    !loading &&
    !onboardingCompleted &&
    !onboardingDone &&
    isNewUser &&
    habits.length === 0;

  // One-time welcome moment right after onboarding completes. Gated on the
  // `welcome_seen` profile flag (not localStorage) so it survives device
  // changes, and never fires for users who onboarded before this existed
  // (backfilled to welcome_seen=true in migration 014).
  const showWelcome = !profileLoading && onboardingCompleted && !welcomeSeen;
  const [highlightFirstHabit, setHighlightFirstHabit] = useState(false);

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [showCelebration, setShowCelebration]   = useState(false);
  const [showStreakBroken, setShowStreakBroken] = useState(false);
  const [showReOnboard, setShowReOnboard]       = useState(false);
  const [shareData, setShareData] = useState<{ type: "streak" | "level" | "daily"; value: number; tier?: string } | null>(null);
  const [checkinHabit, setCheckinHabit]   = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const prevCompletedRef     = useRef<number | null>(null);
  const seenBreakModalRef    = useRef(false);
  const appliedFreezeRef     = useRef(false);
  const prevHabitsLenRef     = useRef<number>(-1);
  const prevBestStreakRef    = useRef<number>(0);
  const prevXPRef            = useRef<number>(0);
  const loginBonusGivenRef   = useRef(false);

  const [showFirstCompletion,   setShowFirstCompletion]   = useState(false);
  const [firstHabitWowName,     setFirstHabitWowName]     = useState<string | null>(null);
  const [showFirstWeekCheckin,  setShowFirstWeekCheckin]  = useState(false);
  const [showMonthlyWrapped,    setShowMonthlyWrapped]    = useState(false);
  const [showHabitDNA,          setShowHabitDNA]          = useState(false);
  const [commitmentHabit, setCommitmentHabit] = useState<{ id: string; name: string; isPublic: boolean; commitmentText: string | null } | null>(null);
  const [focusHabit, setFocusHabit] = useState<Habit | null>(null);
  const [timerMinimized, setTimerMinimized] = useState(false);
  const [showXPSheet, setShowXPSheet] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [currentMood, setCurrentMood] = useState<number | null>(null);

  const isPaid = tier === "plus" || tier === "pro";

  // Back-to-top scroll detection
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // First habit wow moment — fires when habits transitions 0→1 (or on page load if within 15 min of signup)
  useEffect(() => {
    if (loading || profileLoading) return;
    const prev = prevHabitsLenRef.current;
    const curr = habits.length;
    if (curr === prev) return;
    prevHabitsLenRef.current = curr;

    if (curr !== 1) return;
    if (localStorage.getItem("habitai_first_wow")) return;
    if (!signedUpAt) return;
    const ageMs = Date.now() - new Date(signedUpAt).getTime();
    if (ageMs > 15 * 60 * 1000) return; // only within first 15 min

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFirstHabitWowName(habits[0]?.name ?? null);
  }, [habits, loading, profileLoading, signedUpAt]);

  // First week check-in — fires on day 3–7 if user has completions
  useEffect(() => {
    if (loading || profileLoading || !signedUpAt) return;
    if (totalCompletions < 1) return;
    if (localStorage.getItem("habitai_3day_checkin")) return;
    const ageMs = Date.now() - new Date(signedUpAt).getTime();
    const MS_3D = 3 * 24 * 60 * 60 * 1000;
    const MS_8D = 8 * 24 * 60 * 60 * 1000;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ageMs >= MS_3D && ageMs < MS_8D) setShowFirstWeekCheckin(true);
  }, [loading, profileLoading, signedUpAt, totalCompletions]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    const checkout = params.get("checkout");
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (prev !== null) {
      if (prev === 0 && completedCount === 1) {
        if (!localStorage.getItem("habitai_first_ever_completion")) {
          localStorage.setItem("habitai_first_ever_completion", "1");
          posthog.capture("first_habit_completed");
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setShowFirstCompletion(true);
        } else {
          toast("💪 First habit of the day done! Keep the momentum!", "success", undefined, 3000);
        }
      }
      if (prev < habits.length && completedCount === habits.length) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5200);
        // Speed Runner: all habits done before noon
        const nowH = new Date().getHours();
        if (nowH < 12) {
          const todayKey = new Date().toISOString().split("T")[0];
          if (!localStorage.getItem(`habitai_speed_runner_${todayKey}`)) {
            localStorage.setItem(`habitai_speed_runner_${todayKey}`, "1");
            setTimeout(() => toast("⚡ Speed Runner! All habits crushed before noon!", "success", undefined, 3500), 1500);
          }
        }
      }
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
    applyFreeze();
  }, [anyNewFreezeUsed, applyFreeze]);

  // Show streak-broken modal at most once per UTC day for free users
  useEffect(() => {
    if (loading || isPaid || seenBreakModalRef.current) return;
    if (habits.some((h) => hasBrokenStreak(h.id))) {
      const today = new Date().toISOString().split("T")[0];
      if (localStorage.getItem("habitai_break_modal_seen") === today) return;
      seenBreakModalRef.current = true;
      localStorage.setItem("habitai_break_modal_seen", today);
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Personal best streak toast
  useEffect(() => {
    if (loading || bestStreak === 0) return;
    if (prevBestStreakRef.current > 0 && bestStreak > prevBestStreakRef.current) {
      toast(`🔥 New personal best! ${bestStreak}-day streak!`, "success", undefined, 3500);
    }
    prevBestStreakRef.current = bestStreak;
  }, [bestStreak, loading]);

  // XP milestones toast
  const XP_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
  useEffect(() => {
    if (prevXPRef.current === 0) { prevXPRef.current = xp; return; }
    const milestone = XP_MILESTONES.find(m => prevXPRef.current < m && xp >= m);
    if (milestone) toast(`⚡ ${milestone.toLocaleString()} XP milestone reached!`, "success", undefined, 3500);
    prevXPRef.current = xp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  // Daily login bonus (+5 XP once per day)
  useEffect(() => {
    if (xpLoading || loading || loginBonusGivenRef.current) return;
    loginBonusGivenRef.current = true;
    onDailyOpen().then((got) => {
      if (got) toast("☀️ Daily login! +5 XP bonus", "success", undefined, 2500);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xpLoading, loading]);

  // Monthly Wrapped — auto-show on 1st of month for Pro users
  useEffect(() => {
    if (tier !== "pro" || loading) return;
    const today = new Date();
    if (today.getDate() !== 1) return;
    const key = `monthly_wrapped_shown_${today.getFullYear()}_${today.getMonth()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMonthlyWrapped(true);
  }, [tier, loading]);

  // Daily check-in: detect missed habits from yesterday (once per day)
  useEffect(() => {
    if (loading || habits.length === 0) return;
    const todayKey = new Date().toISOString().split("T")[0];
    const lsKey    = `ai_checkin_dismissed_${todayKey}`;
    if (localStorage.getItem(lsKey)) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const missedYesterday = habits.find((h) => !getStreak(h.id) && h.created_at.split("T")[0] < yesterday);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      openUpgradeModal("habits");
    } else {
      setShowAdd(true);
    }
  }, [isPaid, habits.length, openUpgradeModal]);

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

  // ── Mode-specific dashboard routing ───────────────────────────────────────
  if (!profileLoading && userMode === "parent") return <ParentDashboard />;
  if (!profileLoading && userMode === "teacher") return <TeacherDashboard />;

  return (
    <div className="bg-[#09090f]">
      {showPushModal && (
        <NotificationPermissionModal
          onAllow={allowPush}
          onDismiss={() => { dismissPush(); void markNotifPromptAsked(); }}
        />
      )}

      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-8 pb-nav page-fade">
        {/* ── Inline contextual banners ── */}
        <SmartNotification
          tier={tier}
          habitCount={habits.length}
          onUpgradeClick={() => openUpgradeModal("habits")}
          onAIInsightClick={() => openAIInsight()}
        />

        {/* Upgrade success banner */}
        {upgradeSuccess && (
          <div className="flex items-center gap-3 bg-green-950/40 border border-green-800/40 rounded-xl p-4 mb-6">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              Welcome to your new plan! Your account has been upgraded.
            </p>
          </div>
        )}

        {/* Two-column layout: center content + right sidebar (xl+) */}
        <div className="xl:grid xl:grid-cols-[1fr_280px] xl:gap-6 xl:items-start">

        {/* ── Center column ─────────────────────────────────────────────── */}
        <div className="min-w-0">

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950/45 via-[#0d0d1a] to-[#0d0d1a] border border-violet-800/25 p-5 mb-5 mt-4">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          {/* Greeting */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{today}</p>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-white">{getGreeting()} 👋</h1>
            {!loading && (
              <>
                <button
                  onClick={() => router.push("/calendar")}
                  title="View habit calendar"
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-75 ${
                    bestStreak > 0
                      ? "text-orange-300 bg-orange-950/40 border border-orange-700/30"
                      : "text-slate-500 bg-slate-900/40 border border-slate-700/30"
                  }`}
                >
                  <Flame className={`w-3 h-3 flex-shrink-0 ${bestStreak > 0 ? "text-orange-400" : "text-slate-600"}`} />
                  {bestStreak}d streak
                </button>
                {xpLoading ? (
                  <div className="h-5 w-24 skeleton rounded-full" />
                ) : (
                  <button
                    onClick={() => setShowXPSheet(true)}
                    title="View XP & level details"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-violet-300 bg-violet-950/40 border border-violet-700/30 hover:opacity-75 transition-opacity"
                  >
                    {levelEmoji(level)} Lv {level} {levelName(level)}
                  </button>
                )}
              </>
            )}
          </div>
          {!loading && bestStreak > 0 && (() => {
            const milestones = [7, 14, 30, 60, 100];
            const next = milestones.find((m) => m > bestStreak);
            if (!next) return null;
            const daysLeft = next - bestStreak;
            return (
              <p className="text-xs text-amber-400/70 font-medium mb-1">
                🎯 {daysLeft} more day{daysLeft !== 1 ? "s" : ""} to {next}-day streak
              </p>
            );
          })()}
          {userMode === "student" && dreamUniversity && signedUpAt ? (
            <p className="text-sm text-indigo-300/90 font-semibold mb-1">
              🎓 Your {dreamUniversity} journey — Day {journeyDay}
            </p>
          ) : formatGoalsLine(goals) ? (
            <p className="text-sm text-violet-300/80 font-medium mb-1">{formatGoalsLine(goals)}</p>
          ) : null}
          {/* Row 1: heading + action buttons */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Today&apos;s Habits
              {isSyncing && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" title="Syncing…" />
              )}
            </h2>
            <div className="ml-auto flex items-center gap-2">
              {isPaid && habits.length > 0 && (
                <button
                  onClick={() => setShowHabitDNA(true)}
                  title="Habit DNA"
                  aria-label="View your Habit DNA"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-violet-800/30 text-violet-400 hover:text-violet-200 hover:border-violet-600/50 hover:bg-violet-950/20 transition-all text-xs font-medium"
                >
                  <Brain className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">DNA</span>
                </button>
              )}
              {tier === "pro" && (
                <button
                  onClick={() => setShowMonthlyWrapped(true)}
                  title="Monthly Wrapped"
                  aria-label="View monthly wrapped"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-700/30 text-amber-400 hover:text-amber-200 hover:border-amber-600/50 hover:bg-amber-950/20 transition-all text-xs font-medium"
                >
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Wrapped</span>
                </button>
              )}
              <button
                onClick={handleAddClick}
                data-tour="add-habit"
                aria-label="Add a new habit (press N)"
                title="Add habit  ·  Press N"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-md shadow-violet-900/30 min-h-[40px]"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                Add Habit
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                aria-label="Browse habit templates"
                title="Browse templates"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-violet-800/30 text-slate-500 hover:text-violet-300 hover:border-violet-700/50 hover:bg-violet-950/20 transition-all text-xs font-medium"
              >
                <span>✨</span>
                <span className="hidden sm:inline">Templates</span>
              </button>
            </div>
          </div>
          {/* Row 2: subtitle + progress ring */}
          <div className="flex items-end justify-between">
            <div>
              {habits.length > 0 && (
                <p className="text-sm text-slate-400">
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
              <div className="hidden sm:block">
                <ProgressRing completed={completedCount} total={habits.length} tier={tier} />
              </div>
            )}
          </div>

          {/* Progress bar */}
          {habits.length > 0 && (
            <div data-tour="progress-bar" className="mt-4 w-full h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-700"
                style={{ width: habits.length > 0 ? `${Math.round((completedCount / habits.length) * 100)}%` : "0%" }}
              />
            </div>
          )}

          {/* Weekly progress bar */}
          {!loading && habits.length > 0 && <WeeklyProgressBar logs={historicalLogs} />}
        </div>
        </div>

        {/* Mood check-in */}
        {!loading && habits.length > 0 && <ErrorBoundary section="mood-checkin"><MoodCheckin onMoodSelected={setCurrentMood} /></ErrorBoundary>}

        {/* Daily AI check-in card */}
        {checkinHabit && isPaid && (
          <ErrorBoundary section="ai-checkin">
            <AICheckinCard
              missedHabitName={checkinHabit}
              onDismiss={() => {
                setCheckinHabit(null);
                const todayKey = new Date().toISOString().split("T")[0];
                localStorage.setItem(`ai_checkin_dismissed_${todayKey}`, "1");
              }}
            />
          </ErrorBoundary>
        )}

        {/* First habit wow moment */}
        {firstHabitWowName && (
          <FirstHabitWow
            habitName={firstHabitWowName}
            goals={goals}
            onDismiss={() => {
              setFirstHabitWowName(null);
              localStorage.setItem("habitai_first_wow", "1");
            }}
          />
        )}

        {/* First week check-in (day 3–7) */}
        {showFirstWeekCheckin && !firstHabitWowName && (
          <FirstWeekCheckin
            goals={goals}
            habitCount={habits.length}
            completionCount={totalCompletions}
            onDismiss={() => {
              setShowFirstWeekCheckin(false);
              localStorage.setItem("habitai_3day_checkin", "1");
            }}
          />
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center justify-between gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300 truncate">{error}</p>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-semibold text-white bg-red-700/60 hover:bg-red-600/60 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading — skeleton cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : habits.length === 0 ? (
          /* Empty state — personalised when goals are set, generic otherwise */
          (() => {
            const emptyRec = onboardingCompleted ? getEmptyStateRecs(goals) : null;
            return emptyRec ? (
              <div className="py-8 page-fade">
                <p className="text-xs text-violet-400/70 font-medium uppercase tracking-wider mb-2">
                  Based on your goal to {emptyRec.goal.toLowerCase()}
                </p>
                <h2 className="text-xl font-bold text-white mb-1">
                  Here are 3 habits that will make the biggest difference
                </h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Chosen for your goals — one click to add any of them.
                </p>

                <div className="space-y-2.5 mb-6">
                  {emptyRec.recs.map((rec) => (
                    <button
                      key={rec.name}
                      onClick={async () => { await addHabit(rec.name, rec.desc, "daily"); }}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#0f0f1a] border border-violet-900/20 hover:border-violet-600/40 hover:bg-violet-950/20 group transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-950/50 border border-violet-900/20 flex items-center justify-center text-xl flex-shrink-0 group-hover:border-violet-600/30 transition-colors">
                        {rec.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{rec.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{rec.desc}</p>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-violet-600/0 group-hover:bg-violet-600/20 flex items-center justify-center transition-all flex-shrink-0">
                        <Plus className="w-3.5 h-3.5 text-violet-400 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddClick}
                  className="text-sm text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
                >
                  Or add a custom habit →
                </button>
              </div>
            ) : (
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
                <p className="text-xs text-violet-400/60 mb-8">Your AI coach is ready when you are</p>
                <button
                  onClick={handleAddClick}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-violet-900/40 text-base min-h-[44px]"
                >
                  <Plus className="w-5 h-5" />
                  Add your first habit
                </button>
              </div>
            );
          })()
        ) : (
          /* Habit list */
          <div className="space-y-4">
            {/* Search bar — desktop only; mobile uses no filter */}
            {habits.length >= 3 && (
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter habits…"
                  aria-label="Filter habits by name"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
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

            {filteredHabits.map((habit, index) => {
              const info = streakInfoMap.get(habit.id) ?? { streak: 0, freezeApplied: false, newFreezeUsed: false };
              const stackParent = habit.stack_after_id ? habits.find((h) => h.id === habit.stack_after_id) : undefined;
              return (
              <ErrorBoundary key={habit.id} section="habit-card">
              <HabitCard
                key={habit.id}
                habit={habit}
                isTourTarget={index === 0}
                highlighted={highlightFirstHabit && index === 0}
                completed={isCompletedToday(habit.id)}
                failed={isFailedToday(habit.id)}
                streak={info.streak}
                strength={getHabitStrength(habit.id)}
                isProtected={info.freezeApplied}
                stackAfterName={stackParent?.name}
                tier={tier}
                logId={todayLogs.find((l) => l.habit_id === habit.id)?.id ?? null}
                allLogs={historicalLogs}
                onCommitment={() => setCommitmentHabit({
                  id: habit.id,
                  name: habit.name,
                  isPublic: habit.is_public ?? false,
                  commitmentText: habit.commitment_text ?? null,
                })}
                onUpgradePro={() => openUpgradeModal("pro_feature", tier === "plus")}
                onStartTimer={habit.duration_minutes ? () => { setFocusHabit(habit); setTimerMinimized(false); } : undefined}
                onSmartTimingToggle={async (enabled) => {
                  const res = await fetch(`/api/habits/${habit.id}/smart-timing`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled }),
                  });
                  if (res.ok) { refetch(); }
                }}
                onMarkFailed={() => void markFailed(habit.id)}
                onToggle={async () => {
                  try {
                    await toggleHabit(habit.id);
                  } catch {
                    toast("Couldn't update habit — please try again.", "error", undefined, 3000);
                  }
                }}
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
                onVerifiedComplete={async (result) => {
                  const res = await completeHabitWithVerification(habit.id, {
                    actualValue: result.actualValue ?? null,
                    verificationType: habit.verification_type ?? null,
                    reflectionText: result.reflectionText ?? null,
                    photoUrl: result.photoUrl ?? null,
                    completionQuality: result.completionQuality,
                    timerUsed: result.timerUsed ?? false,
                  });
                  return { error: res.error, logId: res.log?.id ?? null };
                }}
                onUndoComplete={(logId) => { void undoCompletion(habit.id, logId); }}
                onSkip={() => {
                  void skipHabitToday(habit.id).then(({ error }) => {
                    if (error) toast(error, "error", undefined, 3500);
                    else toast(`"${habit.name}" skipped for today`, "success", undefined, 2500);
                  });
                }}
                onLater={() => { void addLaterReminder(habit.id, habit.name); }}
                onCompleted={(opts) => {
                  const validity = habit.validity_score ?? "valid";
                  const qualityMultiplier = opts?.xpMultiplier ?? 1;
                  const photoBonus = opts?.photoBonus ?? false;
                  playSound("complete");

                  // Time-based micro-achievements (once per day each)
                  const nowH = new Date().getHours();
                  const todayKey = new Date().toISOString().split("T")[0];
                  if (nowH < 8 && !localStorage.getItem(`habitai_early_bird_${todayKey}`)) {
                    localStorage.setItem(`habitai_early_bird_${todayKey}`, "1");
                    setTimeout(() => toast("🐦 Early Bird! First habit before 8am!", "success", undefined, 3000), 500);
                  } else if (nowH >= 22 && !localStorage.getItem(`habitai_night_owl_${todayKey}`)) {
                    localStorage.setItem(`habitai_night_owl_${todayKey}`, "1");
                    setTimeout(() => toast("🦉 Night Owl! Grinding past 10pm!", "success", undefined, 3000), 500);
                  }
                  // Comeback Kid: first completion today after 3+ day break
                  if (completedCount === 0 && totalCompletions > 0 && !localStorage.getItem(`habitai_comeback_kid_${todayKey}`)) {
                    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
                    const hadRecent = historicalLogs.some((l) => {
                      const d = l.completed_at.split("T")[0];
                      return d >= threeDaysAgo && d < todayKey;
                    });
                    if (!hadRecent) {
                      localStorage.setItem(`habitai_comeback_kid_${todayKey}`, "1");
                      setTimeout(() => toast("🦅 Comeback Kid! Back after a break — let's go!", "success", undefined, 3500), 600);
                    }
                  }

                  const habitXP = habit.xp_value ?? 10;
                  const habitStreak = getStreak(habit.id);
                  onHabitCompleted(validity, habit.how_long, habitXP, habitStreak, qualityMultiplier, photoBonus).then(({ luckyBonus }) => {
                    if (luckyBonus) setTimeout(() => toast("🎰 Lucky bonus! +20 XP", "success", undefined, 2500), 300);
                  }).catch(() => {});

                  if (validity === "valid") {
                    const mult = habitStreak >= 30 ? 2 : habitStreak >= 7 ? 1.5 : 1;
                    const earned = Math.round(habitXP * mult * qualityMultiplier) + (photoBonus ? 10 : 0);
                    const multStr = mult > 1 ? ` (${mult}x streak!)` : "";
                    const qualityStr = qualityMultiplier < 1 ? " (partial credit)" : photoBonus ? " (+10 photo bonus)" : "";
                    toast(`✅ ${habit.name} — +${earned} XP${multStr}${qualityStr}`, "success", undefined, 2000);
                  } else if (validity === "partial") {
                    toast(`⚠️ ${habit.name} — +${Math.round((habit.xp_value ?? 10) * 0.5)} XP (make it more specific for full XP)`, "warning", undefined, 2500);
                  } else if (validity === "invalid") {
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
              </ErrorBoundary>
              );
            })}

          </div>
        )}

        {/* XP Level Bar + Quick stats — shown below habits so they're not the first thing seen */}
        {!loading && habits.length > 0 && (
          <div className="mt-5">
            {!xpLoading && <XPLevelBar xp={xp} level={level} onClick={() => setShowXPSheet(true)} />}
            {userMode === "student" && (
              <p className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-semibold mb-1">📚 Academic Performance Score</p>
            )}
            <QuickStats
              completedCount={completedCount}
              totalHabits={habits.length}
              bestStreak={bestStreak}
              totalXP={xp}
              xpLoading={xpLoading}
              onOpenXP={() => setShowXPSheet(true)}
            />
            {habits.some((h) => h.duration_minutes) && <ErrorBoundary section="focus-stats"><FocusStatsWidget /></ErrorBoundary>}
          </div>
        )}

        {/* Daily milestones — hidden on xl+ (right sidebar handles it) */}
        <div data-tour="daily-milestones" className="xl:hidden">
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

        {/* Recommended habits — mood-based (all tiers) or goal-based (PRO) */}
        {!loading && !profileLoading && onboardingCompleted && tier === "pro" && (
          <HabitRecommendations
            goals={goals}
            existingHabits={habits}
            canAddMore={true}
            isPro={true}
            mood={currentMood}
            onAdd={(name, desc) => addHabit(name, desc, "daily")}
            onSetGoal={() => setShowReOnboard(true)}
            onUpgrade={() => openUpgradeModal("pro_feature", true)}
          />
        )}
        {!loading && !profileLoading && onboardingCompleted && tier !== "pro" && currentMood != null && (
          <HabitRecommendations
            goals={goals}
            existingHabits={habits}
            canAddMore={habits.length < 999}
            isPro={false}
            mood={currentMood}
            onAdd={(name, desc) => addHabit(name, desc, "daily")}
            onSetGoal={() => setShowReOnboard(true)}
            onUpgrade={() => openUpgradeModal("pro_feature", true)}
          />
        )}
        {!loading && !profileLoading && onboardingCompleted && tier !== "pro" && habits.length >= 1 && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-[#0c0c18] border border-amber-800/20 rounded-2xl">
            <span className="text-xl flex-shrink-0">✨</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-white">AI Habit Recommendations</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-900/25 border border-amber-600/25 px-1.5 py-0.5 rounded-full">
                  <Crown className="w-2.5 h-2.5" />PRO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">AI-suggested habits tailored to your goals and completion patterns.</p>
            </div>
            <button
              onClick={() => openUpgradeModal("pro_feature", tier === "plus")}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-amber-300 border border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-950/20 rounded-xl transition-all whitespace-nowrap"
            >
              Unlock →
            </button>
          </div>
        )}

        </div>{/* end left column */}

        {/* ── Right sidebar (xl only) ────────────────────────────────────── */}
        <div className="hidden xl:flex xl:flex-col gap-4 sticky top-20 pb-4">

          {/* AI Insight — available to all users */}
          <div data-tour="ai-insight" className="relative overflow-hidden rounded-2xl bg-[#0c0c18] border border-violet-600/30">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-[#0f0f1a] to-purple-950/60" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full blur-3xl pointer-events-none bg-violet-500/20" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <p className="text-sm font-semibold text-white">AI Coaching</p>
                {tier === "pro" && (
                  <span className="ml-auto text-[10px] font-bold text-amber-300 bg-amber-900/25 border border-amber-600/30 px-2 py-0.5 rounded-full">PRO</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                {userMode === "student"
                  ? `Focus on your study habits${dreamUniversity ? ` — ${dreamUniversity} applications take consistency, not cramming.` : " — build the academic discipline that top universities look for."}`
                  : !xpLoading && (bestStreak > 0 || xp > 0)
                  ? `${bestStreak > 0 ? `${bestStreak}-day streak` : "Starting fresh"} · ${xp.toLocaleString()} XP earned. Your coach spots patterns across your habits and streaks to help you level up faster.`
                  : "Get personalised insights on your habits, streaks, and patterns — tailored to your goals."}
              </p>
              <button
                onClick={() => openAIInsight()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all"
                style={{ boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
              >
                Analyse My Habits
              </button>
              <p className="text-[10px] text-center mt-2">
                {tier === "pro"
                  ? <span className="text-slate-600">Unlimited insights · Pro</span>
                  : isPaid
                  ? <span className="text-slate-600">5 insights / day · Plus</span>
                  : <span className="text-slate-600">1 insight / day · Free</span>}
              </p>
            </div>
          </div>

          {/* Today's Progress card */}
          {!loading && habits.length > 0 && (() => {
            const pct = Math.round((completedCount / habits.length) * 100);
            const r = 26;
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - pct / 100);
            const ringColor = pct === 100 ? "#10b981" : pct >= 50 ? "#8b5cf6" : "#6d28d9";
            const motivational =
              pct === 0   ? "Start strong today! 💪" :
              pct < 50    ? "Keep going, you've got this! 🔥" :
              pct < 100   ? "Almost there, finish strong! ⚡" :
                            "Perfect day! Amazing work! 🎉";
            return (
              <div className="relative overflow-hidden rounded-2xl bg-[#0c0c18] border border-violet-900/20 p-4">
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none"
                  style={{ backgroundColor: ringColor, opacity: 0.1 }}
                />
                <p className="relative text-xs font-semibold text-slate-400 mb-3">Today&apos;s Progress</p>
                <div className="relative flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r={r} fill="none" stroke="#1e1b4b" strokeWidth="5" />
                      <circle
                        cx="32" cy="32" r={r}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${circ}`}
                        strokeDashoffset={`${offset}`}
                        transform="rotate(-90 32 32)"
                        style={{ transition: "stroke-dashoffset 0.6s ease", filter: `drop-shadow(0 0 5px ${ringColor}80)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 bg-orange-950/40 border border-orange-700/25 rounded-full px-2 py-1">
                      <span className="text-sm leading-none">🔥</span>
                      <span className="text-xs font-bold text-orange-300">{bestStreak} day{bestStreak !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-amber-950/40 border border-amber-700/25 rounded-full px-2 py-1 ml-1.5">
                      <span className="text-sm leading-none">⚡</span>
                      <span className="text-xs font-bold text-amber-300">{completedCount * 10} XP</span>
                    </div>
                    <p className="text-[10px] text-slate-600 pt-0.5">{completedCount}/{habits.length} habits done today</p>
                  </div>
                </div>
                <p className="relative text-[11px] text-violet-300/80 mt-3 font-medium">{motivational}</p>
              </div>
            );
          })()}

          {/* University Journey card */}
          {dreamUniversity && (() => {
            const appDeadline = new Date(new Date().getFullYear() + 2, 9, 1); // Oct 1 two years out
            const today_ = new Date();
            today_.setHours(0, 0, 0, 0);
            const daysSinceSignup = signedUpAt
              ? Math.max(1, Math.round((today_.getTime() - new Date(signedUpAt).getTime()) / 86400000))
              : 1;
            const daysUntil = Math.max(1, Math.round((appDeadline.getTime() - today_.getTime()) / 86400000));
            return (
              <div className="bg-gradient-to-br from-indigo-950/60 to-[#0c0c18] border border-indigo-600/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base leading-none">🎓</span>
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">University Journey</p>
                </div>
                <p className="text-sm font-semibold text-white leading-snug mb-1">
                  Your {dreamUniversity} journey
                </p>
                <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                  Day {daysSinceSignup} · {daysUntil.toLocaleString()} days until application deadline
                </p>
                <div className="mt-3 h-1.5 bg-indigo-950/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((daysSinceSignup / (daysSinceSignup + daysUntil)) * 100))}%` }}
                  />
                </div>
              </div>
            );
          })()}

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

          {/* Weekly Game Plan — Pro only, teaser for others */}
          {tier === "pro" ? (
            <ErrorBoundary section="weekly-plan"><WeeklyPlanCard /></ErrorBoundary>
          ) : (
            <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-slate-600" />
                <p className="text-sm font-semibold text-slate-500">Your Week Plan</p>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-900/25 border border-amber-600/25 px-1.5 py-0.5 rounded-full ml-auto">
                  <Crown className="w-2.5 h-2.5" />PRO
                </span>
              </div>
              <div className="relative">
                <div className="space-y-2 pointer-events-none select-none" style={{ filter: "blur(3px)", opacity: 0.3 }}>
                  {[67, 55, 79].map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-700 flex-shrink-0 mt-0.5" />
                      <div className="h-2.5 bg-slate-700 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => openUpgradeModal("pro_feature", tier === "plus")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-xl hover:bg-amber-600/30 transition-all"
                  >
                    <Crown className="w-3 h-3" />
                    Upgrade to unlock →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>{/* end two-column grid */}

      </main>

      {showAdd && (
        <AddHabitModal
          onClose={() => setShowAdd(false)}
          existingHabits={habits}
          onAdd={addHabit}
          goals={goals}
          tier={tier}
          onUpgradePro={() => { setShowAdd(false); openUpgradeModal("pro_feature", tier === "plus"); }}
        />
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
          completedCount={completedCount}
          bestStreak={bestStreak}
          xpToday={completedCount * 10}
        />
      )}

      {showStreakBroken && (
        <StreakBrokenModal
          onUpgrade={() => { setShowStreakBroken(false); openUpgradeModal("habits"); }}
          onDismiss={() => setShowStreakBroken(false)}
          brokenHabitName={habits.find((h) => hasBrokenStreak(h.id))?.name}
          isPaid={isPaid}
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
          goals={goals}
          onAdd={(name, desc, freq, habitType) => addHabit(name, desc, freq, null, null, null, null, undefined, null, null, null, null, habitType)}
          onHitLimit={() => { setShowTemplates(false); openUpgradeModal("habits"); }}
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

      {/* First-visit onboarding tour (3 steps) */}
      {!loading && !profileLoading && (
        <OnboardingTour habitCount={habits.length} signedUpAt={signedUpAt} />
      )}

      {showHabitDNA && (
        <HabitDNAModal
          habits={habits}
          logs={historicalLogs}
          tier={tier}
          totalXP={xp}
          onClose={() => setShowHabitDNA(false)}
          onUpgrade={() => { setShowHabitDNA(false); openUpgradeModal("habits"); }}
        />
      )}

      {showMonthlyWrapped && (
        <MonthlyWrapped
          tier={tier}
          onClose={() => setShowMonthlyWrapped(false)}
        />
      )}

      {commitmentHabit && (
        <CommitmentModal
          habitId={commitmentHabit.id}
          habitName={commitmentHabit.name}
          isPublic={commitmentHabit.isPublic}
          commitmentText={commitmentHabit.commitmentText}
          tier={tier}
          onSave={() => { setCommitmentHabit(null); refetch(); }}
          onClose={() => setCommitmentHabit(null)}
          onUpgrade={() => { setCommitmentHabit(null); openUpgradeModal("habits"); }}
        />
      )}

      {showFirstCompletion && (
        <FirstCompletionModal
          onDismiss={() => {
            setShowFirstCompletion(false);
            showAfterFirstCompletion(notifPromptLastAskedAt);
          }}
        />
      )}

      {showWelcome && (
        <WelcomeOverlay
          username={username}
          persona={persona}
          goal={goal}
          onDismiss={() => {
            void markWelcomeSeen();
            setHighlightFirstHabit(true);
            setTimeout(() => setHighlightFirstHabit(false), 3000);
          }}
        />
      )}

      {/* Focus Timer — stays mounted while minimized so the timer keeps running */}
      {focusHabit && (
        <FocusTimer
          habit={focusHabit}
          tier={tier}
          isCompleted={isCompletedToday(focusHabit.id)}
          minimized={timerMinimized}
          onMinimize={() => setTimerMinimized(true)}
          onMaximize={() => setTimerMinimized(false)}
          onComplete={() => {
            if (!isCompletedToday(focusHabit.id)) {
              void toggleHabit(focusHabit.id);
            }
          }}
          onXP={() => {
            const validity = focusHabit.validity_score ?? "valid";
            playSound("complete");
            onHabitCompleted(validity, focusHabit.how_long, focusHabit.xp_value ?? 10, getStreak(focusHabit.id)).then(({ luckyBonus }) => {
              if (luckyBonus) toast("🎰 Lucky bonus! +20 XP", "success", undefined, 2500);
              toast("⚡ XP earned! Tap your level to see progress.", "success", undefined, 2000);
            }).catch(() => {});
          }}
          onClose={() => { setFocusHabit(null); setTimerMinimized(false); }}
        />
      )}

      {/* XP Detail Sheet */}
      {showXPSheet && (
        <XPDetailSheet
          xp={xp}
          level={level}
          achievements={achievements}
          bestStreak={bestStreak}
          historicalLogs={historicalLogs}
          totalCompletions={totalCompletions}
          onClose={() => setShowXPSheet(false)}
        />
      )}

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className="fixed bottom-20 sm:bottom-8 right-4 z-40 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-900/40 flex items-center justify-center transition-all duration-200"
        style={{
          opacity: showBackToTop ? 1 : 0,
          transform: showBackToTop ? "scale(1) translateY(0)" : "scale(0.8) translateY(8px)",
          pointerEvents: showBackToTop ? "auto" : "none",
        }}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </div>
  );
}
