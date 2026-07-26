"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { PERSONAS } from "@/lib/personas";

const CONFETTI = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 2.55) % 100}%`,
  delay: (i * 53) % 1000,
  duration: 1300 + ((i * 97) % 900),
  size: 5 + (i % 5) * 2,
  color: ["#8b5cf6", "#a78bfa", "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#fb923c", "#e879f9"][i % 8],
  isCircle: i % 3 === 0,
}));

interface Props {
  username: string | null;
  persona: string | null;
  goal: string | null;
  onDismiss: () => void;
}

export default function WelcomeOverlay({ username, persona, goal, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);

  const personaMeta = PERSONAS.find((p) => p.id === persona) ?? null;
  const firstLine = goal
    ? `Your goal: ${goal}`
    : personaMeta
    ? personaMeta.tagline
    : "Let's build something that lasts";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {visible && CONFETTI.map((c, i) => (
        <div
          key={i}
          className="absolute top-0 pointer-events-none"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            borderRadius: c.isCircle ? "50%" : "2px",
            animation: `confettiFall ${c.duration}ms linear ${c.delay}ms both`,
            zIndex: 0,
          }}
        />
      ))}

      <div
        className={`relative z-10 bg-[#0f0f1a] border border-violet-700/40 rounded-3xl px-8 py-9 text-center shadow-2xl max-w-sm mx-4 max-h-[90vh] overflow-y-auto transition-all duration-500 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        style={{
          boxShadow: "0 0 60px rgba(139,92,246,0.35), 0 25px 60px rgba(0,0,0,0.6)",
          animation: visible ? "firstCompIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-6xl mb-4 leading-none" style={{ animation: "checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 150ms both" }}>
            {personaMeta?.emoji ?? "🎉"}
          </div>
          <h2 className="text-2xl font-black text-white mb-4 leading-tight">
            You&apos;re in, {username || "let's go"}
          </h2>
          <div className="space-y-2 mb-7 text-left">
            <p className="text-sm text-slate-300 leading-relaxed bg-violet-950/30 border border-violet-800/20 rounded-xl px-3.5 py-2.5">
              🎯 {firstLine}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed bg-violet-950/30 border border-violet-800/20 rounded-xl px-3.5 py-2.5">
              ✅ Your first habit is ready
            </p>
            <p className="text-sm text-slate-300 leading-relaxed bg-violet-950/30 border border-violet-800/20 rounded-xl px-3.5 py-2.5">
              🔥 Complete it today to start your streak
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
          >
            Let&apos;s do this <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
