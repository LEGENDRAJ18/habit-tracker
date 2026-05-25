"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Sparkles, Flame, Trophy, Zap, Share2, ChevronRight, TrendingUp } from "lucide-react";
import type { Plan, MonthlyWrapData } from "@/types";

interface Props {
  tier: Plan;
  onClose: () => void;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Slide({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ${
      active ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
    }`}>
      {children}
    </div>
  );
}

export default function MonthlyWrapped({ tier, onClose }: Props) {
  const isPro = tier === "pro";

  const [data, setData]         = useState<MonthlyWrapData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [slide, setSlide]       = useState(0);

  const prevMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d;
  })();
  const monthName  = MONTH_NAMES[prevMonth.getMonth()];
  const monthLabel = `${monthName} ${prevMonth.getFullYear()}`;

  const slides = data ? [
    // Slide 0: Intro
    { key: "intro",        label: "" },
    // Slide 1: Total completions
    { key: "completions",  label: "Habit Completions" },
    // Slide 2: Consistency
    { key: "consistency",  label: "Consistency Rate" },
    // Slide 3: Best streak
    { key: "streak",       label: "Longest Streak" },
    // Slide 4: Top habit
    { key: "top",          label: "Top Habit" },
    // Slide 5: XP
    { key: "xp",           label: "XP Earned" },
    // Slide 6: Tags
    { key: "tags",         label: "You are…" },
    // Slide 7: Share
    { key: "share",        label: "" },
  ] : [];

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    fetch("/api/monthly-wrap", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { setData(d.wrap ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isPro]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const text = `My ${monthLabel} Habit Wrap:\n✅ ${data.totalCompletions} habits completed\n📈 ${data.consistencyPct}% consistency\n🔥 ${data.bestStreak}-day streak\n⚡ ${data.totalXP.toLocaleString()} XP earned\n\nTracked on habitaiapp.com`;
    if (navigator.share) {
      try { await navigator.share({ title: `My ${monthLabel} Wrap`, text }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  }, [data, monthLabel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#09090f] border border-violet-700/30 rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden"
           style={{ height: "min(640px, 90vh)" }}>
        {/* Top bar */}
        <div className="relative px-5 py-4 flex items-center justify-between border-b border-violet-900/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-white">{monthLabel} Wrapped</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-violet-950/40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        {data && slides.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 py-2">
            {slides.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${i === slide ? "w-4 h-1.5 bg-violet-500" : "w-1.5 h-1.5 bg-violet-900/60"}`} />
            ))}
          </div>
        )}

        {/* Slides */}
        <div className="relative flex-1" style={{ height: "calc(100% - 110px)" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-2 border-violet-800/40 relative mx-auto mb-3">
                  <div className="absolute inset-0 border-2 border-t-violet-500 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-slate-400">Building your {monthLabel} Wrap…</p>
              </div>
            </div>
          )}

          {!loading && !isPro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">Pro Feature</p>
              <h3 className="text-lg font-bold text-white mb-2">Monthly Wrapped</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-5">Get a beautiful monthly summary of your habit journey — like Spotify Wrapped, but for your personal growth.</p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm"
              >
                Upgrade to Pro →
              </button>
            </div>
          )}

          {!loading && isPro && !data && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-4xl mb-4">📊</p>
              <p className="text-base font-bold text-white mb-2">No data yet for {monthLabel}</p>
              <p className="text-sm text-slate-500 leading-relaxed">Keep tracking your habits — your first Wrapped will appear next month.</p>
              <button onClick={onClose} className="mt-5 px-6 py-2.5 border border-violet-700/40 text-violet-300 font-semibold rounded-xl text-sm transition-all hover:border-violet-600/60">
                Close
              </button>
            </div>
          )}

          {!loading && isPro && data && (
            <>
              {/* Slide 0: Intro */}
              <Slide active={slide === 0}>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-5"
                       style={{ boxShadow: "0 0 60px rgba(139,92,246,0.5)" }}>
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-xs text-violet-400 font-bold uppercase tracking-widest mb-2">Your</p>
                  <h2 className="text-3xl font-black text-white mb-1">{monthName}</h2>
                  <p className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Wrapped</p>
                  <p className="text-sm text-slate-500 mt-3">{data.uniqueHabits} habit{data.uniqueHabits !== 1 ? "s" : ""} tracked</p>
                </div>
              </Slide>

              {/* Slide 1: Completions */}
              <Slide active={slide === 1}>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">You completed</p>
                  <p className="text-8xl font-black text-white mb-2"
                     style={{ background: "linear-gradient(135deg, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {data.totalCompletions}
                  </p>
                  <p className="text-lg text-slate-300 font-semibold">habit check-ins</p>
                  <p className="text-sm text-slate-500 mt-2">in {monthName}</p>
                </div>
              </Slide>

              {/* Slide 2: Consistency */}
              <Slide active={slide === 2}>
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 mb-2">Your consistency</p>
                  <p className="text-8xl font-black mb-2"
                     style={{ background: "linear-gradient(135deg, #34d399, #6ee7b7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {data.consistencyPct}%
                  </p>
                  <p className="text-sm text-slate-500">
                    {data.consistencyPct >= 80 ? "🔥 Exceptional!" :
                     data.consistencyPct >= 60 ? "💪 Solid effort!" :
                     data.consistencyPct >= 40 ? "📈 Keep building!" :
                     "🌱 Every day counts!"}
                  </p>
                </div>
              </Slide>

              {/* Slide 3: Streak */}
              <Slide active={slide === 3}>
                <div className="text-center">
                  <Flame className="w-12 h-12 text-orange-400 mx-auto mb-4" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                  <p className="text-sm text-slate-400 mb-2">Your longest streak</p>
                  <p className="text-8xl font-black mb-1"
                     style={{ background: "linear-gradient(135deg, #fb923c, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {data.bestStreak}
                  </p>
                  <p className="text-lg text-slate-300 font-semibold">days straight</p>
                </div>
              </Slide>

              {/* Slide 4: Top habit */}
              <Slide active={slide === 4}>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-4">Your top habit this month</p>
                  <div className="bg-gradient-to-br from-violet-950/80 to-[#0f0f1a] border border-violet-700/30 rounded-2xl px-6 py-5 mb-4">
                    <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <p className="text-lg font-bold text-white leading-snug">{data.topHabit}</p>
                  </div>
                  <p className="text-xs text-slate-500">Your most consistent habit of the month</p>
                </div>
              </Slide>

              {/* Slide 5: XP */}
              <Slide active={slide === 5}>
                <div className="text-center">
                  <Zap className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 mb-2">XP earned in {monthName}</p>
                  <p className="text-7xl font-black mb-2"
                     style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {data.totalXP.toLocaleString()}
                  </p>
                  <p className="text-slate-300 font-semibold">experience points</p>
                </div>
              </Slide>

              {/* Slide 6: Personality tags */}
              <Slide active={slide === 6}>
                <div className="text-center w-full">
                  <p className="text-sm text-slate-400 mb-6">This month you were…</p>
                  {data.personalityTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {data.personalityTags.map((tag, i) => (
                        <span
                          key={tag}
                          className="px-4 py-2 bg-violet-950/60 border border-violet-700/30 text-violet-300 rounded-full font-semibold text-sm"
                          style={{ animation: `fadeIn 0.3s ease-out ${i * 0.1}s both` }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Keep building habits to discover your personality tags!</p>
                  )}
                </div>
              </Slide>

              {/* Slide 7: Share */}
              <Slide active={slide === 7}>
                <div className="text-center w-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-4"
                       style={{ boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}>
                    <Share2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Share your Wrapped</h3>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">Let the world know how far you&apos;ve come this month.</p>
                  <button
                    onClick={handleShare}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all mb-3"
                  >
                    Share {monthName} Wrapped
                  </button>
                  <button onClick={onClose} className="w-full py-2.5 border border-violet-800/30 text-slate-400 hover:text-white rounded-xl text-sm transition-all">
                    Done
                  </button>
                </div>
              </Slide>
            </>
          )}
        </div>

        {/* Navigation */}
        {!loading && isPro && data && (
          <div className="px-5 pb-4 flex items-center justify-between border-t border-violet-900/20 pt-3">
            <button
              onClick={() => setSlide((s) => Math.max(0, s - 1))}
              disabled={slide === 0}
              className="text-slate-500 hover:text-white disabled:opacity-30 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
            {slide < slides.length - 1 ? (
              <button
                onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))}
                className="flex items-center gap-1 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onClose} className="px-5 py-2 border border-violet-700/40 text-violet-300 font-semibold rounded-xl text-sm transition-all hover:border-violet-600">
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
