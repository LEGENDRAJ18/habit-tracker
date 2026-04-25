"use client";

import { useEffect, useState } from "react";
import { Zap, Share2 } from "lucide-react";
import { levelName, levelColorKey, type LevelColorKey } from "@/lib/xp";

interface Props {
  newLevel: number;
  onDismiss: () => void;
  onShare?: () => void;
}

const STYLES: Record<LevelColorKey, { ring: string; bg: string; text: string; glow: string }> = {
  slate:   { ring: "ring-slate-500/50",   bg: "bg-slate-700/30",   text: "text-slate-200",  glow: "rgba(100,116,139,0.3)" },
  emerald: { ring: "ring-emerald-500/50", bg: "bg-emerald-900/30", text: "text-emerald-200", glow: "rgba(16,185,129,0.35)" },
  blue:    { ring: "ring-blue-500/50",    bg: "bg-blue-900/30",    text: "text-blue-200",    glow: "rgba(59,130,246,0.35)" },
  violet:  { ring: "ring-violet-500/50",  bg: "bg-violet-900/30",  text: "text-violet-200",  glow: "rgba(139,92,246,0.4)" },
  amber:   { ring: "ring-amber-400/60",   bg: "bg-amber-900/30",   text: "text-amber-200",   glow: "rgba(251,191,36,0.45)" },
  red:     { ring: "ring-red-500/60",     bg: "bg-red-900/30",     text: "text-red-200",     glow: "rgba(239,68,68,0.45)" },
  gold:    { ring: "ring-yellow-400/70",  bg: "bg-yellow-900/25",  text: "text-yellow-100",  glow: "rgba(251,191,36,0.6)" },
};

const SPARKS = Array.from({ length: 20 }, (_, i) => ({
  x: Math.cos((i / 20) * Math.PI * 2) * (55 + (i % 4) * 18),
  y: Math.sin((i / 20) * Math.PI * 2) * (55 + (i % 4) * 18),
  size: 4 + (i % 4),
  delay: i * 35,
  color: ["#8b5cf6","#a78bfa","#fbbf24","#34d399","#60a5fa","#f472b6","#fb923c","#e879f9"][i % 8],
}));

export default function LevelUpModal({ newLevel, onDismiss, onShare }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t    = setTimeout(() => setVisible(true), 30);
    const auto = setTimeout(onDismiss, 5500);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, [onDismiss]);

  const colorKey = levelColorKey(newLevel);
  const style    = STYLES[colorKey];
  const name     = levelName(newLevel);
  const isGold   = colorKey === "gold";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div
        className={`relative bg-[#0f0f1a] border border-violet-700/30 rounded-3xl px-10 py-9 text-center shadow-2xl max-w-xs mx-4 transition-all duration-500 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        style={{ boxShadow: `0 0 60px ${style.glow}, 0 25px 60px rgba(0,0,0,0.6)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spark burst */}
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
              animation: `particleFly 0.95s cubic-bezier(0.25,0.46,0.45,0.94) ${s.delay}ms both`,
            } as React.CSSProperties}
          />
        ))}

        {/* Gold outer glow ring for Grandmaster */}
        {isGold && (
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 60px rgba(251,191,36,0.15), 0 0 80px rgba(251,191,36,0.3)" }}
          />
        )}

        {/* Badge */}
        <div
          className={`relative w-20 h-20 rounded-2xl ${style.bg} ring-4 ${style.ring} mx-auto mb-5 flex items-center justify-center`}
          style={isGold ? { boxShadow: "0 0 30px rgba(251,191,36,0.5)" } : undefined}
        >
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

        <div className="flex flex-col gap-2 w-full">
          {onShare && (
            <button
              onClick={() => { onShare(); onDismiss(); }}
              className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-violet-950/60 hover:bg-violet-900/60 border border-violet-700/40 text-violet-300 text-sm font-semibold rounded-xl transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share achievement
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-full px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30"
          >
            Keep going!
          </button>
        </div>
      </div>
    </div>
  );
}
