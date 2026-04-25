"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle2, Crown, Diamond, Shield } from "lucide-react";
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
import ReminderSettings from "@/components/dashboard/ReminderSettings";
import StatsBar from "@/components/dashboard/StatsBar";
import MilestoneCards from "@/components/dashboard/MilestoneCards";
import LevelUpModal from "@/components/dashboard/LevelUpModal";
import ShareAchievement from "@/components/dashboard/ShareAchievement";
import { useXP } from "@/hooks/useXP";
import { playSound } from "@/lib/sounds";
import { levelName } from "@/lib/xp";

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

function AllDoneCelebration({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ animation: "celebIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-[#0f0f1a] border border-violet-700/30 rounded-3xl px-10 py-8 text-center shadow-2xl shadow-violet-950/60 max-w-xs mx-4 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-4 leading-none">🔥</div>
          <h3 className="text-2xl font-bold text-white mb-1.5">All done!</h3>
          <p className="text-sm text-violet-300 mb-5">Streak continues. Keep it up!</p>
          {/* Auto-dismiss progress bar */}
          <div className="h-0.5 bg-violet-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full origin-left"
              style={{ animation: "celebProgress 3s linear both" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plan banners ─────────────────────────────────────────────────────────────

function PlusBanner() {
  const chips = ["Unlimited habits", "Full history", "Streak protection"];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-[#1a0f2e] to-violet-950/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/18 to-transparent" />
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-16 bg-violet-500/18 rounded-full blur-3xl pointer-events-none" />

      <div className="relative px-5 pt-4 pb-3.5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-100 leading-none">Plus Plan</p>
              <p className="text-[11px] text-violet-400/60 mt-0.5">Unlock more, achieve more</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/35 text-violet-300 uppercase tracking-widest flex-shrink-0">
            Plus
          </span>
        </div>
        {/* Feature chips */}
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-800/40 border border-violet-600/30 text-violet-300"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProBanner() {
  const chips = ["AI Coaching", "Advanced Analytics", "Priority Support", "Early Access"];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-amber-400/55 mb-6"
      style={{
        boxShadow:
          "0 0 0 1px rgba(251,191,36,0.08), 0 8px 40px -8px rgba(245,158,11,0.30), 0 2px 0 0 rgba(251,191,36,0.15)",
      }}
    >
      {/* Layered gold background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1200] via-[#1f1400] to-[#1a1000]" />
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-950/60 via-amber-900/20 to-orange-950/60" />
      {/* Top gold sheen */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-400/30 via-amber-400/6 to-transparent" />
      {/* Bottom depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      {/* Diagonal shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/10 via-transparent to-transparent pointer-events-none" />
      {/* Bloom glows */}
      <div className="absolute -top-10 left-4 w-48 h-16 bg-amber-400/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 right-6 w-32 h-14 bg-yellow-300/25 rounded-full blur-2xl pointer-events-none" />
      {/* Bottom edge accent line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="relative px-5 pt-4 pb-3.5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-300/45 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: "0 0 16px 3px rgba(251,191,36,0.28)" }}
            >
              <Diamond className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-amber-100 leading-none">Pro Plan</p>
                <span className="text-[9px] font-semibold px-1.5 py-px rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 uppercase tracking-widest">
                  Premium
                </span>
              </div>
              <p className="text-[11px] text-amber-400/60 mt-0.5">Everything in Plus, and beyond</p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/18 border border-amber-300/55 text-amber-200 uppercase tracking-widest flex-shrink-0"
            style={{ boxShadow: "0 0 12px 2px rgba(251,191,36,0.35)" }}
          >
            Pro
          </span>
        </div>
        {/* Feature chips */}
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-900/50 border border-amber-600/35 text-amber-300"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { habits, loading, error, completedCount, toggleHabit, deleteHabit, isCompletedToday, addHabit, getStreakInfo, hasBrokenStreak, getStreak, getHabitStrength } =
    useHabits();
  const { tier, profileLoading, onboardingCompleted, goal, freezeAvailable, freezeProtectedDate, applyFreeze, reminderEnabled, reminderHour, reminderMinute, saveReminderPrefs } = useProfile();
  const { xp, level, achievements, totalCompletions, justLeveledUp, isDailyAchieved, onHabitCompleted, checkMilestones, dismissLevelUp } = useXP();
  // Local override so closing the modal doesn't require a page reload
  const [onboardingDone, setOnboardingDone] = useState(false);
  const showOnboarding = !profileLoading && !onboardingCompleted && !onboardingDone;

  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [showCelebration, setShowCelebration]   = useState(false);
  const [showStreakBroken, setShowStreakBroken] = useState(false);
  const [showReOnboard, setShowReOnboard]       = useState(false);
  const [shareData, setShareData] = useState<{ type: "streak" | "level"; value: number; tier?: string } | null>(null);
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
      setTimeout(() => setShowCelebration(false), 3200);
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleAddClick = () => {
    if (!isPaid && habits.length >= FREE_HABIT_LIMIT) {
      setShowUpgrade(true);
    } else {
      setShowAdd(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f]">
      <DashboardNav
        habitCount={habits.length}
        tier={tier}
        onUpgradeClick={() => setShowUpgrade(true)}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Upgrade success banner */}
        {upgradeSuccess && (
          <div className="flex items-center gap-3 bg-green-950/40 border border-green-800/40 rounded-xl p-4 mb-6">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              Welcome to your new plan! Your account has been upgraded.
            </p>
          </div>
        )}

        {/* Premium banner for paid users */}
        {!profileLoading && tier === "plus" && <PlusBanner />}
        {!profileLoading && tier === "pro" && <ProBanner />}

        {/* Two-column layout on desktop */}
        <div className="lg:grid lg:grid-cols-[1fr_308px] lg:gap-8 lg:items-start">
        {/* ── Left column ───────────────────────────────────────────────── */}
        <div>
          {/* Mobile-only horizontal StatsBar */}
          <div className="lg:hidden">
            <StatsBar xp={xp} level={level} bestStreak={bestStreak} totalCompletions={totalCompletions} />
          </div>

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{today}</p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Today&apos;s Habits</h1>
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

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/40 rounded-xl p-4 mb-6">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : habits.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-violet-950/50 border border-violet-800/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No habits yet</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Start building your first habit. Even small daily actions compound into
              life-changing results.
            </p>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Add your first habit
            </button>
          </div>
        ) : (
          /* Habit list */
          <div className="space-y-3">
            {habits.map((habit) => {
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
                onDelete={() => deleteHabit(habit.id)}
                onCompleted={() => { playSound("complete"); onHabitCompleted(); }}
              />
              );
            })}

            {/* Add habit button — always visible for paid; gated for free */}
            {(isPaid || habits.length < FREE_HABIT_LIMIT) && (
              <button
                onClick={handleAddClick}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-violet-800/40 text-slate-500 hover:text-violet-400 hover:border-violet-700/50 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add habit
              </button>
            )}

            {!isPaid && habits.length >= FREE_HABIT_LIMIT && (
              <button
                onClick={handleAddClick}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-violet-700/30 text-violet-500 hover:text-violet-400 hover:bg-violet-950/30 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Upgrade to add more habits
              </button>
            )}
          </div>
        )}

        {/* Daily milestones — mobile only (desktop shows in sidebar) */}
        <div className="lg:hidden">
          {!loading && habits.length > 0 && (
            <MilestoneCards
              completedCount={completedCount}
              totalHabits={habits.length}
              bestStreak={bestStreak}
              isDailyAchieved={isDailyAchieved}
              hasStreak7={achievements.includes("streak_7")}
              hasStreak30={achievements.includes("streak_30")}
            />
          )}
        </div>

        {/* Recommended habits */}
        {!loading && !profileLoading && onboardingCompleted && (
          <HabitRecommendations
            goal={goal}
            existingHabits={habits}
            canAddMore={isPaid || habits.length < FREE_HABIT_LIMIT}
            onAdd={(name, desc) => addHabit(name, desc, "daily")}
            onSetGoal={() => setShowReOnboard(true)}
            onUpgrade={() => setShowUpgrade(true)}
          />
        )}

        {/* Reminder settings */}
        {!profileLoading && (
          <ReminderSettings
            enabled={reminderEnabled}
            hour={reminderHour}
            minute={reminderMinute}
            onSave={saveReminderPrefs}
          />
        )}
        </div>{/* end left column */}

        {/* ── Right sidebar (desktop only) ──────────────────────────────── */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-20">
          <StatsBar xp={xp} level={level} bestStreak={bestStreak} totalCompletions={totalCompletions} sidebar />
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
              />
            </div>
          )}

          {/* Community card */}
          <a
            href="https://discord.gg/habitai"
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
                <p className="text-[10px] text-slate-500 mt-0.5">500+ members</p>
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
            className="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-xl shadow-violet-900/40 flex items-center justify-center transition-all"
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
        />
      )}

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} />
      )}

      {(showOnboarding || showReOnboard) && (
        <OnboardingModal onComplete={() => { setOnboardingDone(true); setShowReOnboard(false); }} />
      )}

      {showCelebration && (
        <AllDoneCelebration onDismiss={() => setShowCelebration(false)} />
      )}

      {showStreakBroken && (
        <StreakBrokenModal
          onUpgrade={() => { setShowStreakBroken(false); setShowUpgrade(true); }}
          onDismiss={() => setShowStreakBroken(false)}
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

      {shareData && (
        <ShareAchievement
          type={shareData.type}
          value={shareData.value}
          tier={shareData.tier}
          onClose={() => setShareData(null)}
        />
      )}
    </div>
  );
}
