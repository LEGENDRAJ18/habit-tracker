"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

interface Props {
  goals: string[];
  habitCount: number;
  completionCount: number;
  onDismiss: () => void;
}

export default function FirstWeekCheckin({ goals, habitCount, completionCount, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(true);
  const [done, setDone]       = useState(false);
  const calledRef             = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    fetch("/api/first-week-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals, habitCount, completionCount }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) { setLoading(false); setDone(true); return; }
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        setLoading(false);
        while (true) {
          const { done: d, value } = await reader.read();
          if (d) { setDone(true); break; }
          setText((p) => p + decoder.decode(value, { stream: true }));
        }
      })
      .catch(() => { setLoading(false); setDone(true); });
  }, [goals, habitCount, completionCount]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-emerald-950/40 via-[#0f0f1a] to-[#0f0f1a] p-5 mb-5 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      style={{ boxShadow: "0 0 0 1px rgba(16,185,129,0.07), 0 0 30px rgba(16,185,129,0.05)" }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg"
          style={{ boxShadow: "0 0 0 1px rgba(52,211,153,0.25), 0 0 14px rgba(16,185,129,0.3)" }}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              3 Days In — AI Coach
            </span>
            {!done && (
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            )}
          </div>
          <p className="text-[10px] text-emerald-700 mb-2 font-medium">Here&apos;s what your AI coach noticed:</p>

          {loading ? (
            <div className="space-y-2 py-1">
              {[90, 72].map((w, i) => (
                <div key={i} className="h-2.5 skeleton rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : text || done ? (
            <p className="text-sm text-slate-300 leading-relaxed">
              {text}
              {!done && (
                <span className="inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          ) : null}
        </div>

        {done && (
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-300 hover:bg-emerald-950/50 transition-all flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
