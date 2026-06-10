"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2, Sparkles } from "lucide-react";

interface AIAnalysis {
  pattern: string;
  recoverySteps: string[];
}

interface Props {
  onUpgrade: () => void;
  onDismiss: () => void;
  brokenHabitName?: string;
  isPaid?: boolean;
}

export default function StreakBrokenModal({ onUpgrade, onDismiss, brokenHabitName, isPaid }: Props) {
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAILoading]   = useState(false);

  useEffect(() => {
    if (!isPaid || !brokenHabitName) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAILoading(true);
    fetch("/api/ai-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "streak_analysis", brokenHabitName }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.pattern && data.recoverySteps) {
          setAIAnalysis({ pattern: data.pattern, recoverySteps: data.recoverySteps });
        }
      })
      .catch(() => {})
      .finally(() => setAILoading(false));
  }, [brokenHabitName, isPaid]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-16 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <div className="mobile-sheet-enter w-full sm:max-w-sm bg-[#0f0f1a] border border-slate-700/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="p-6">
          {/* Icon + title */}
          <div className="text-center mb-5">
            <div className="text-5xl mb-3 leading-none">💔</div>
            <h2 className="text-xl font-bold text-white mb-1">Streak lost.</h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-1">
              That stings. But one missed day doesn&apos;t define you.
            </p>
            {brokenHabitName && (
              <p className="text-xs text-slate-600">
                <span className="text-slate-500 font-medium">{brokenHabitName}</span>
              </p>
            )}
          </div>

          {/* Recovery quote */}
          <div className="bg-violet-950/30 border border-violet-800/20 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-xs text-violet-300/80 leading-relaxed italic">
              &ldquo;The champion isn&apos;t the one who never falls — it&apos;s the one who gets back up.&rdquo;
            </p>
          </div>

          {/* AI Analysis (paid users) */}
          {isPaid && (
            <div className="mb-5">
              {aiLoading ? (
                <div className="flex items-center gap-2.5 bg-violet-950/30 border border-violet-800/25 rounded-xl p-3.5">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-violet-300">AI analyzing your pattern…</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Building your recovery plan</p>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="bg-violet-950/30 border border-violet-800/25 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">AI Pattern Analysis</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysis.pattern}</p>
                  <div>
                    <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-2">Recovery Plan</p>
                    <div className="space-y-1.5">
                      {aiAnalysis.recoverySteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-violet-700/40 flex items-center justify-center text-[9px] font-bold text-violet-300 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Streak protection upsell (free users) */}
          {!isPaid && (
            <>
              <p className="text-sm text-slate-400 mb-5 text-center">
                Upgrade to Plus and your streak is protected — life happens, your progress doesn&apos;t vanish.
              </p>
              <div className="flex items-start gap-3 bg-violet-950/40 border border-violet-700/30 rounded-xl p-4 mb-5">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-violet-200">Streak Protection</p>
                  <p className="text-xs text-violet-400/70 mt-0.5">
                    1 automatic freeze per week so life can happen without breaking your habits.
                  </p>
                </div>
              </div>
              <button
                onClick={onUpgrade}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all mb-2.5"
              >
                Upgrade to Plus →
              </button>
            </>
          )}

          <button
            onClick={onDismiss}
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            {isPaid ? "Start fresh today →" : "Maybe later"}
          </button>
        </div>
      </div>
    </div>
  );
}
