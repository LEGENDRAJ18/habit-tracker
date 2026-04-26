"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, AlertCircle, Zap, Target, Heart } from "lucide-react";

interface CoachingResult {
  struggling: string;
  fixes: string[];
  encouragement: string;
  remaining?: number;
}

interface Props {
  onClose: () => void;
  onUpgrade: () => void;
  isPaid: boolean;
}

export default function AIInsightModal({ onClose, onUpgrade, isPaid }: Props) {
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<CoachingResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [fetched, setFetched]         = useState(false);

  async function fetchInsight() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "coaching" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data as CoachingResult);
      setFetched(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Trigger fetch on mount for paid users
  if (!fetched && !loading && !error && isPaid) {
    setFetched(true);   // prevent double-fire
    fetchInsight();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0d0d1a] border border-violet-700/30 rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-violet-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/25 border border-violet-500/35 flex items-center justify-center"
                   style={{ boxShadow: "0 0 18px rgba(139,92,246,0.35)" }}>
                <Sparkles className="w-4.5 h-4.5 text-violet-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">AI Coaching Insight</h2>
                <p className="text-[11px] text-violet-400/70">Powered by GPT-4o mini</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-violet-950/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Upgrade gate */}
          {!isPaid && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/25 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Plus & Pro Feature</h3>
              <p className="text-sm text-slate-400 mb-5">
                Get personalized AI coaching that analyzes your habit patterns and gives you a custom action plan.
              </p>
              <button
                onClick={onUpgrade}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all text-sm"
              >
                Upgrade to Plus — $7/mo →
              </button>
              <button onClick={onClose} className="mt-2.5 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Maybe later
              </button>
            </div>
          )}

          {/* Loading */}
          {isPaid && loading && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-violet-800/40" />
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin absolute inset-0" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Analyzing your habits…</p>
                <p className="text-xs text-slate-500 mt-1">GPT-4o mini is reviewing your patterns</p>
              </div>
            </div>
          )}

          {/* Error */}
          {isPaid && error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-slate-400 text-center">{error}</p>
              <button
                onClick={() => { setError(null); setFetched(false); }}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results */}
          {isPaid && result && !loading && (
            <div className="space-y-4">
              {/* Struggling section */}
              <div className="bg-violet-950/30 border border-violet-800/25 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">What the data shows</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{result.struggling}</p>
              </div>

              {/* Fixes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">3 actionable fixes</span>
                </div>
                <div className="space-y-2">
                  {(result.fixes ?? []).map((fix, i) => (
                    <div key={i} className="flex items-start gap-3 bg-[#0f0f1a] border border-violet-900/20 rounded-xl p-3.5">
                      <span className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed">{fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Encouragement */}
              <div className="bg-emerald-950/25 border border-emerald-800/25 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Keep going</span>
                </div>
                <p className="text-sm text-emerald-200/90 leading-relaxed">{result.encouragement}</p>
              </div>

              {/* Remaining uses */}
              {result.remaining !== undefined && (
                <p className="text-center text-[10px] text-slate-600">
                  {result.remaining} AI insight{result.remaining !== 1 ? "s" : ""} remaining today
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
