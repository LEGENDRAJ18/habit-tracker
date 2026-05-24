"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import posthog from "posthog-js";

interface Props {
  missedHabitName: string;
  onDismiss: () => void;
}

export default function AICheckinCard({ missedHabitName, onDismiss }: Props) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/ai-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "checkin", missedHabitName }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.suggestion) {
          setSuggestion(data.suggestion);
          posthog.capture("ai_coach_used", { mode: "checkin", habit: missedHabitName });
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [missedHabitName]);

  if (error) return null;

  return (
    <div className="relative bg-[#0c0c18] border border-violet-800/30 rounded-2xl p-4 mb-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-violet-600/25 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider mb-0.5">AI Check-in</p>
              <p className="text-xs text-slate-400">
                You missed <span className="text-slate-200 font-medium">{missedHabitName}</span> yesterday
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-600 hover:text-slate-400 transition-colors p-0.5 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 mt-3 pl-9.5">
            <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin flex-shrink-0" />
            <span className="text-xs text-slate-500">Generating your tip…</span>
          </div>
        )}

        {suggestion && (
          <p className="mt-3 text-sm text-slate-300 leading-relaxed pl-9">{suggestion}</p>
        )}
      </div>
    </div>
  );
}
