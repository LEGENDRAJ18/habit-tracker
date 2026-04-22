"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle2, Crown, Diamond } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { useProfile } from "@/hooks/useProfile";
import { FREE_HABIT_LIMIT } from "@/types";
import DashboardNav from "@/components/dashboard/DashboardNav";
import HabitCard from "@/components/dashboard/HabitCard";
import AddHabitModal from "@/components/dashboard/AddHabitModal";
import UpgradeModal from "@/components/dashboard/UpgradeModal";

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
  const { habits, loading, error, completedCount, toggleHabit, deleteHabit, isCompletedToday, addHabit } =
    useHabits();
  const { tier, profileLoading } = useProfile();

  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

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

  const progressPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#09090f]">
      <DashboardNav
        habitCount={habits.length}
        tier={tier}
        onUpgradeClick={() => setShowUpgrade(true)}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
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
            </div>
            {habits.length > 0 && (
              <div className="text-right">
                <p className="text-3xl font-bold text-violet-400">
                  {completedCount}
                  <span className="text-slate-600 text-xl font-normal">/{habits.length}</span>
                </p>
                <p className="text-xs text-slate-500">completed</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {habits.length > 0 && (
            <div className="mt-4 w-full h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
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
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completed={isCompletedToday(habit.id)}
                onToggle={() => toggleHabit(habit.id)}
                onDelete={() => deleteHabit(habit.id)}
              />
            ))}

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
        <AddHabitModal onClose={() => setShowAdd(false)} onAdd={addHabit} />
      )}

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
