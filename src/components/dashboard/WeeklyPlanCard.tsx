"use client";

import { useState, useEffect } from "react";
import { ClipboardList, RefreshCw, Loader2, Crown } from "lucide-react";

interface WeeklyPlan {
  actions: string[];
  created_at: string;
}

export default function WeeklyPlanCard() {
  const [plan, setPlan]       = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => { fetchPlan(); }, []);

  async function fetchPlan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-plan");
      const json = await res.json() as { plan: WeeklyPlan | null };
      setPlan(json.plan);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-plan", { method: "POST" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setError(json.error ?? "Generation failed");
        return;
      }
      const json = await res.json() as { plan: WeeklyPlan };
      setPlan(json.plan);
    } catch {
      setError("Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-white">Your Week Plan</p>
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-900/25 border border-amber-600/25 px-1.5 py-0.5 rounded-full">
            <Crown className="w-2.5 h-2.5" />
            PRO
          </span>
        </div>
        <button
          onClick={generatePlan}
          disabled={generating || loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-950/40 transition-all disabled:opacity-40"
          title="Regenerate plan"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full skeleton flex-shrink-0 mt-0.5" />
              <div className="flex-1 h-3 skeleton rounded-full" style={{ width: `${60 + i * 10}%` }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-2">
          <p className="text-xs text-red-400 mb-2">{error}</p>
          <button
            onClick={generatePlan}
            disabled={generating}
            className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : !plan ? (
        <div className="text-center py-3">
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Get a personalised action plan for this week based on your habits and goals.
          </p>
          <button
            onClick={generatePlan}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold rounded-xl hover:bg-violet-600/30 transition-all disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
            ) : (
              <><ClipboardList className="w-3 h-3" />Generate Plan</>
            )}
          </button>
        </div>
      ) : (
        <>
          <ol className="space-y-2">
            {plan.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-violet-600/25 border border-violet-500/30 text-[10px] font-bold text-violet-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
              </li>
            ))}
          </ol>
          {generating && (
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Regenerating…
            </div>
          )}
        </>
      )}
    </div>
  );
}
