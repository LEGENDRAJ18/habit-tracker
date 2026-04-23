"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { levelName, levelColorKey } from "@/lib/xp";

interface Props {
  newLevel: number;
  onDismiss: () => void;
}

const BADGE_STYLES: Record<
  ReturnType<typeof levelColorKey>,
  { ring: string; bg: string; text: string; glow: string }
> = {
  slate:   { ring: "ring-slate-500/50",   bg: "bg-slate-700/30",   text: "text-slate-200",  glow: "rgba(100,116,139,0.3)" },
  emerald: { ring: "ring-emerald-500/50", bg: "bg-emerald-900/30", text: "text-emerald-200", glow: "rgba(16,185,129,0.35)" },
  blue:    { ring: "ring-blue-500/50",    bg: "bg-blue-900/30",    text: "text-blue-200",    glow: "rgba(59,130,246,0.35)" },
  violet:  { ring: "ring-violet-500/50",  bg: "bg-violet-900/30",  text: "text-violet-200",  glow: "rgba(139,92,246,0.4)" },
  amber:   { ring: "ring-amber-400/60",   bg: "bg-amber-900/30",   text: "text-amber-200",   glow: "rgba(251,191,36,0.45)" },
};

// Deterministic confetti positions (no Math.random so React is happy)
const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  x: Math.cos((i / 18) * Math.PI * 2) * (60 + (i % 3) * 20),
  y: Math.sin((i / 18) * Math.PI * 2) * (60 + (i % 3) * 20),
  size: 4 + (i % 4),
  delay: i * 40,
  color: ["#8b5cf6","#a78bfa","#fbbf24","#34d399","#60a5fa","#f472b6"][i % 6],
}));

export default function LevelUpModal({ newLevel, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    const auto = setTimeout(onDismiss, 5000);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, [onDismiss]);

  const colorKey = levelColorKey(newLevel);
  const style    = BADGE_STYLES[colorKey];
  const name     = levelName(newLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className={`relative bg-[#0f0f1a] border border-violet-700/30 rounded-3xl px-10 py-9 text-center shadow-2xl max-w-xs mx-4 transition-all duration-500 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        style={{ boxShadow: `0 0 60px ${style.glow}, 0 25px 60px rgba(0,0,0,0.6)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spark particles */}
        {visible && SPARKS.map((s, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{
              width: s.size,
              height: s.size,
              backgroundColor: s.color,
              "--tx": `${s.x}px`,
              "--ty": `${s.y}px`,
              animation: `particleFly 0.9s cubic-bezier(0.25,0.46,0.45,0.94) ${s.delay}ms both`,
            } as React.CSSProperties}
          />
        ))}

        {/* Badge */}
        <div className={`relative w-20 h-20 rounded-2xl ${style.bg} ring-4 ${style.ring} mx-auto mb-5 flex items-center justify-center`}>
          <span className={`text-3xl font-extrabold ${style.text}`}>{newLevel}</span>
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
          Level Up!
        </p>
        <h2 className="text-2xl font-extrabold text-white mb-1">Level {newLevel}</h2>
        <p className={`text-base font-semibold mb-5 ${style.text}`}>{name}</p>

        <button
          onClick={onDismiss}
          className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30"
        >
          Keep going!
        </button>
      </div>
    </div>
  );
}
