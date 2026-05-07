"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

interface Props {
  habitName: string;
  goals: string[];
  onDismiss: () => void;
}

export default function FirstHabitWow({ habitName, goals, onDismiss }: Props) {
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

    fetch("/api/first-habit-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitName, goals }),
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
  }, [habitName, goals]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-violet-600/40 bg-gradient-to-br from-violet-950/60 via-[#0f0f1a] to-purple-950/40 p-5 mb-5 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      style={{ boxShadow: "0 0 0 1px rgba(139,92,246,0.1), 0 0 40px rgba(139,92,246,0.1)" }}
    >
      {/* Ambient glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-violet-600/8 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3.5 relative">
        {/* AI avatar */}
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg"
          style={{ boxShadow: "0 0 0 1px rgba(167,139,250,0.3), 0 0 16px rgba(139,92,246,0.4)" }}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
              Your AI Coach
            </span>
            {!done && (
              <span className="flex gap-0.5 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-violet-500 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 py-1">
              {[95, 80, 60].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 skeleton rounded-full"
                  style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          ) : text || done ? (
            <p className="text-sm text-slate-300 leading-relaxed">
              {text}
              {!done && (
                <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          ) : null}
        </div>

        {done && (
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-violet-950/60 transition-all flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
