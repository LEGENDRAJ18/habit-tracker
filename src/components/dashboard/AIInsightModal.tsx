"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, AlertCircle, Zap, Target, Heart, CalendarDays, ExternalLink, Crown } from "lucide-react";
import posthog from "posthog-js";
import type { Plan } from "@/types";
import CenteredModal from "@/components/ui/CenteredModal";

interface CoachingResult {
  struggling: string;
  fixes: string[];
  encouragement: string;
  sevenDayPlan?: Array<{ day: number; action: string }>;
  helpResources?: Array<{ name: string; url: string; desc: string }>;
  remaining?: number;
}

interface Props {
  onClose: () => void;
  onUpgrade: () => void;
  tier: Plan;
}

export default function AIInsightModal({ onClose, onUpgrade, tier }: Props) {
  const isPaid = tier === "plus" || tier === "pro";
  const isPro  = tier === "pro";

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<CoachingResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => { void fetchInsight(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInsight() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("This needs internet — AI coaching will be available when you reconnect 🌐");
      return;
    }
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
      posthog.capture("ai_coach_used", { mode: "coaching" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!fetched && !loading && !error && isPaid) {
    setFetched(true);
    fetchInsight();
  }

  return (
    <CenteredModal onClose={onClose} backdrop="bg-black/70 backdrop-blur-sm">
      <div className="modal-center-enter w-full max-w-md bg-[#0d0d1a] border border-violet-700/30 rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden max-h-[90vh] flex flex-col">
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
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-violet-950/50 transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Loading */}
          {loading && (
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
          {error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300 mb-1">AI is taking a break</p>
                <p className="text-xs text-slate-500">Try again in a moment — it&apos;ll be back shortly.</p>
              </div>
              <button
                onClick={() => { setError(null); setFetched(false); }}
                className="px-4 py-2 text-xs font-semibold text-violet-400 hover:text-violet-300 border border-violet-800/40 hover:border-violet-600/50 rounded-xl transition-all bg-violet-950/30 min-h-[44px]"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4">
              <div className="bg-violet-950/30 border border-violet-800/25 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">What the data shows</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{result.struggling}</p>
              </div>

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

              <div className="bg-emerald-950/25 border border-emerald-800/25 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Keep going</span>
                </div>
                <p className="text-sm text-emerald-200/90 leading-relaxed">{result.encouragement}</p>
              </div>

              {result.sevenDayPlan && result.sevenDayPlan.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">7-day recovery plan</span>
                  </div>
                  <div className="space-y-1.5">
                    {result.sevenDayPlan.map(({ day, action }) => (
                      <div key={day} className="flex items-start gap-2.5 bg-violet-950/20 border border-violet-800/20 rounded-xl px-3 py-2">
                        <span className="text-[10px] font-bold text-violet-500 w-10 flex-shrink-0 mt-0.5">Day {day}</span>
                        <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.helpResources && result.helpResources.length > 0 && (
                <div className="bg-amber-950/25 border border-amber-800/25 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Support resources</span>
                  </div>
                  <div className="space-y-2">
                    {result.helpResources.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-2.5 bg-amber-900/15 border border-amber-700/20 rounded-xl px-3 py-2 hover:border-amber-600/40 transition-colors group">
                        <ExternalLink className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5 group-hover:text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-300 group-hover:text-amber-200">{r.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Insight count */}
              <p className="text-center text-[10px] text-slate-600">
                {isPro ? (
                  <span className="flex items-center justify-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Unlimited insights · Pro plan
                  </span>
                ) : result.remaining !== undefined ? (
                  `${result.remaining} AI insight${result.remaining !== 1 ? "s" : ""} remaining today · Upgrade for more`
                ) : null}
              </p>
            </div>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}
