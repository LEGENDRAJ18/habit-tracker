"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { X, Sparkles, Flame, Trophy, Zap, Share2, ChevronRight, ChevronLeft, TrendingUp } from "lucide-react";
import type { Plan, MonthlyWrapData } from "@/types";
import CenteredModal from "@/components/ui/CenteredModal";

interface Props {
  tier: Plan;
  onClose: () => void;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type Dir = "forward" | "backward";

function Slide({ children, index, current, dir }: {
  children: ReactNode; index: number; current: number; dir: Dir;
}) {
  const isActive  = index === current;
  const isBehind  = dir === "forward" ? index < current : index > current;
  const enterSide = dir === "forward" ? 28 : -28;
  const exitSide  = dir === "forward" ? -28 : 28;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive
          ? "translateX(0) scale(1)"
          : isBehind
            ? `translateX(${exitSide}px) scale(0.96)`
            : `translateX(${enterSide}px) scale(0.96)`,
        transition: "opacity 0.46s ease-out, transform 0.46s ease-out",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

export default function MonthlyWrapped({ tier, onClose }: Props) {
  const isPro = tier === "pro";

  const [data, setData]       = useState<MonthlyWrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide]     = useState(0);
  const [dir, setDir]         = useState<Dir>("forward");
  const touchStartX           = useRef<number | null>(null);

  const prevMonth = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d;
  })();
  const monthName  = MONTH_NAMES[prevMonth.getMonth()];
  const monthLabel = `${monthName} ${prevMonth.getFullYear()}`;

  const totalSlides = data ? 8 : 0;

  const goNext = useCallback(() => {
    if (!data || slide >= totalSlides - 1) return;
    setDir("forward");
    setSlide((s) => s + 1);
  }, [data, slide, totalSlides]);

  const goBack = useCallback(() => {
    if (slide <= 0) return;
    setDir("backward");
    setSlide((s) => s - 1);
  }, [slide]);

  // Keyboard navigation
  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goBack();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, goNext, goBack, onClose]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) >= 44) {
      if (dx > 0) goNext();
      else goBack();
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <CenteredModal onClose={onClose} backdrop="bg-black/85 backdrop-blur-sm">
      <div
        className="modal-center-enter w-full max-w-sm bg-[#09090f] border border-violet-700/25 rounded-3xl shadow-2xl overflow-hidden"
        style={{
          height: "min(620px, 90vh)",
          boxShadow: "0 0 0 1px rgba(139,92,246,0.06), 0 32px 64px rgba(0,0,0,0.7)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Top bar */}
        <div className="relative px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/6 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-white">{monthLabel} Wrapped</span>
          </div>
          <button onClick={onClose} className="relative text-slate-600 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        {data && (
          <div className="flex items-center justify-center gap-1.5 py-2.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setDir(i > slide ? "forward" : "backward"); setSlide(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === slide ? "w-5 h-1.5 bg-violet-500" : "w-1.5 h-1.5 bg-violet-900/50 hover:bg-violet-800/60"
                }`}
              />
            ))}
          </div>
        )}

        {/* Slides area */}
        <div className="relative" style={{ height: "calc(100% - 112px)" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-10 h-10 mx-auto mb-3">
                  <div className="absolute inset-0 border-2 border-violet-900/30 rounded-full" />
                  <div className="absolute inset-0 border-2 border-t-violet-500 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-slate-400">Building your {monthLabel} Wrap…</p>
              </div>
            </div>
          )}

          {!loading && !isPro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 0 30px rgba(245,158,11,0.35)" }}>
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">Pro Feature</p>
              <h3 className="text-xl font-black text-white mb-2">Monthly Wrapped</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">A beautiful monthly story of your habit journey — like Spotify Wrapped, but for your personal growth.</p>
              <button
                onClick={onClose}
                className="w-full py-3 text-white font-bold rounded-2xl text-sm transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #d97706, #ea580c)", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}
              >
                Upgrade to Pro →
              </button>
            </div>
          )}

          {!loading && isPro && !data && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-5xl mb-4">📊</p>
              <p className="text-base font-bold text-white mb-2">No data for {monthLabel}</p>
              <p className="text-sm text-slate-500 leading-relaxed">Keep tracking your habits — your first Wrapped appears next month.</p>
              <button onClick={onClose} className="mt-5 px-6 py-2.5 border border-violet-700/40 text-violet-300 font-semibold rounded-xl text-sm hover:border-violet-600 transition-all">
                Close
              </button>
            </div>
          )}

          {!loading && isPro && data && (
            <>
              {/* 0: Intro */}
              <Slide index={0} current={slide} dir={dir}>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                       style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 0 60px rgba(139,92,246,0.5)" }}>
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-xs text-violet-400 font-bold uppercase tracking-widest mb-2">Your</p>
                  <h2 className="text-4xl font-black text-white mb-1">{monthName}</h2>
                  <p className="text-3xl font-black" style={{
                    background: "linear-gradient(135deg, #a78bfa, #e879f9)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>Wrapped</p>
                  <p className="text-sm text-slate-500 mt-4">{data.uniqueHabits} habit{data.uniqueHabits !== 1 ? "s" : ""} tracked</p>
                </div>
              </Slide>

              {/* 1: Completions */}
              <Slide index={1} current={slide} dir={dir}>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">You completed</p>
                  <p className="text-[88px] font-black leading-none mb-3" style={{
                    background: "linear-gradient(135deg, #a78bfa, #e879f9)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 20px rgba(167,139,250,0.3))",
                  }}>
                    {data.totalCompletions}
                  </p>
                  <p className="text-xl text-slate-300 font-semibold">habit check-ins</p>
                  <p className="text-sm text-slate-500 mt-2">in {monthName} 🎉</p>
                </div>
              </Slide>

              {/* 2: Consistency */}
              <Slide index={2} current={slide} dir={dir}>
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 mb-2">Your consistency</p>
                  <p className="text-[88px] font-black leading-none mb-3" style={{
                    background: "linear-gradient(135deg, #34d399, #6ee7b7)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 20px rgba(52,211,153,0.3))",
                  }}>
                    {data.consistencyPct}%
                  </p>
                  <p className="text-base text-slate-400">
                    {data.consistencyPct >= 80 ? "🔥 Exceptional performance!" :
                     data.consistencyPct >= 60 ? "💪 Solid effort this month!" :
                     data.consistencyPct >= 40 ? "📈 Great progress — keep building!" :
                     "🌱 Every single day counts!"}
                  </p>
                </div>
              </Slide>

              {/* 3: Streak */}
              <Slide index={3} current={slide} dir={dir}>
                <div className="text-center">
                  <Flame className="w-14 h-14 text-orange-400 mx-auto mb-4" style={{ filter: "drop-shadow(0 0 12px rgba(251,146,60,0.5))" }} />
                  <p className="text-sm text-slate-400 mb-2">Your longest streak</p>
                  <p className="text-[88px] font-black leading-none mb-1" style={{
                    background: "linear-gradient(135deg, #fb923c, #fbbf24)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 20px rgba(251,146,60,0.3))",
                  }}>
                    {data.bestStreak}
                  </p>
                  <p className="text-xl text-slate-300 font-semibold">days straight 🔥</p>
                </div>
              </Slide>

              {/* 4: Top habit */}
              <Slide index={4} current={slide} dir={dir}>
                <div className="text-center w-full">
                  <p className="text-sm text-slate-400 mb-4">Your top habit this month</p>
                  <div className="rounded-2xl px-6 py-5 mb-4" style={{
                    background: "linear-gradient(135deg, rgba(109,40,217,0.2), rgba(15,15,26,0.8))",
                    border: "1px solid rgba(139,92,246,0.3)",
                    boxShadow: "0 0 30px rgba(139,92,246,0.12)",
                  }}>
                    <Trophy className="w-9 h-9 text-amber-400 mx-auto mb-3" style={{ filter: "drop-shadow(0 0 10px rgba(251,191,36,0.4))" }} />
                    <p className="text-xl font-bold text-white leading-snug">{data.topHabit}</p>
                  </div>
                  <p className="text-xs text-slate-600">Your most consistent habit of the month</p>
                </div>
              </Slide>

              {/* 5: XP */}
              <Slide index={5} current={slide} dir={dir}>
                <div className="text-center">
                  <Zap className="w-14 h-14 text-amber-400 mx-auto mb-4" style={{ filter: "drop-shadow(0 0 12px rgba(251,191,36,0.5))" }} />
                  <p className="text-sm text-slate-400 mb-2">XP earned in {monthName}</p>
                  <p className="text-7xl font-black mb-2" style={{
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 20px rgba(251,191,36,0.3))",
                  }}>
                    {data.totalXP.toLocaleString()}
                  </p>
                  <p className="text-lg text-slate-300 font-semibold">experience points ⚡</p>
                </div>
              </Slide>

              {/* 6: Personality tags */}
              <Slide index={6} current={slide} dir={dir}>
                <div className="text-center w-full">
                  <p className="text-sm text-slate-400 mb-6">This month you were…</p>
                  {data.personalityTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {data.personalityTags.map((tag, i) => (
                        <span
                          key={tag}
                          className="px-4 py-2 text-violet-200 rounded-full font-semibold text-sm"
                          style={{
                            background: `linear-gradient(135deg, rgba(109,40,217,${0.25 + i * 0.04}), rgba(139,92,246,0.14))`,
                            border: "1px solid rgba(167,139,250,0.25)",
                            animation: `wrapTagIn 0.35s ease-out ${i * 80}ms both`,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Keep building habits to discover your personality tags!</p>
                  )}
                </div>
              </Slide>

              {/* 7: Share */}
              <Slide index={7} current={slide} dir={dir}>
                <div className="text-center w-full">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                       style={{
                         background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                         boxShadow: "0 0 36px rgba(139,92,246,0.45)",
                       }}>
                    <Share2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Share your Wrapped</h3>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">Let the world know how far you&apos;ve come this month.</p>
                  <button
                    onClick={handleShare}
                    className="w-full py-3 text-white font-bold rounded-2xl text-sm mb-3 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 18px rgba(139,92,246,0.4)" }}
                  >
                    Share {monthName} Wrapped
                  </button>
                  <button onClick={onClose} className="w-full py-2.5 border border-violet-800/30 text-slate-400 hover:text-white rounded-2xl text-sm transition-all hover:border-violet-700/50">
                    Done
                  </button>
                </div>
              </Slide>
            </>
          )}
        </div>

        {/* Navigation bar */}
        {!loading && isPro && data && (
          <div className="px-5 pb-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
            <button
              onClick={goBack}
              disabled={slide === 0}
              className="flex items-center gap-1 text-slate-500 hover:text-white disabled:opacity-0 text-sm font-medium transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {slide < totalSlides - 1 ? (
              <button
                onClick={goNext}
                className="flex items-center gap-1 px-5 py-2 text-white font-bold rounded-xl text-sm transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 12px rgba(139,92,246,0.35)" }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onClose} className="px-5 py-2 border border-violet-700/35 text-violet-300 font-semibold rounded-xl text-sm hover:border-violet-600 transition-all">
                Close
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes wrappedIn {
          from { opacity: 0; transform: scale(0.94) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes wrapTagIn {
          from { opacity: 0; transform: scale(0.8) translateY(6px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);   }
        }
      `}</style>
    </CenteredModal>
  );
}
