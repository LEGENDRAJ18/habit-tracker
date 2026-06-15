"use client";

import { useEffect, useState } from "react";
import { Zap, Share2 } from "lucide-react";
import { levelName, levelColorKey, xpForLevel, type LevelColorKey } from "@/lib/xp";
import { getJustUnlockedReward, getNextReward } from "@/lib/rewards";

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

// Spark burst particles
const SPARKS = Array.from({ length: 28 }, (_, i) => ({
  x: Math.cos((i / 28) * Math.PI * 2) * (50 + (i % 5) * 16),
  y: Math.sin((i / 28) * Math.PI * 2) * (50 + (i % 5) * 16),
  size: 4 + (i % 5),
  delay: i * 30,
  color: ["#8b5cf6","#a78bfa","#fbbf24","#34d399","#60a5fa","#f472b6","#fb923c","#e879f9","#facc15","#c084fc"][i % 10],
}));

// Confetti that falls from the top of the viewport
const CONFETTI = Array.from({ length: 45 }, (_, i) => ({
  left: `${(i * 2.3) % 100}%`,
  delay: (i * 61) % 1400,
  duration: 1400 + ((i * 137) % 1000),
  size: 5 + (i % 5) * 2,
  color: ["#8b5cf6","#a78bfa","#fbbf24","#34d399","#60a5fa","#f472b6","#fb923c","#e879f9","#facc15","#c084fc"][i % 10],
  isCircle: i % 3 === 0,
}));

// Extra confetti for GOAT screen
const GOAT_CONFETTI = Array.from({ length: 80 }, (_, i) => ({
  left: `${(i * 1.27) % 100}%`,
  delay: (i * 47) % 2200,
  duration: 2000 + ((i * 113) % 1500),
  size: 6 + (i % 6) * 2,
  color: ["#fbbf24","#f59e0b","#d97706","#facc15","#c084fc","#a78bfa","#34d399","#fb923c","#f472b6","#e879f9"][i % 10],
  isCircle: i % 4 === 0,
}));

export default function LevelUpModal({ newLevel, onDismiss, onShare }: Props) {
  const [visible, setVisible] = useState(false);
  const isGoat = newLevel >= 500;

  useEffect(() => {
    const t    = setTimeout(() => setVisible(true), 30);
    const auto = setTimeout(onDismiss, isGoat ? 12000 : 5500);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, [onDismiss, isGoat]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const colorKey     = levelColorKey(newLevel);
  const style        = STYLES[colorKey];
  const name         = levelName(newLevel);
  const nextXP       = xpForLevel(newLevel + 1);
  const currentXP    = xpForLevel(newLevel);
  const xpToNext     = (nextXP - currentXP).toLocaleString();
  const justUnlocked = getJustUnlockedReward(newLevel);
  const nextReward   = getNextReward(newLevel);

  // ── GOAT Full-Screen Celebration ─────────────────────────────────────────
  if (isGoat) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        onClick={onDismiss}
      >
        {/* Falling confetti */}
        {visible && GOAT_CONFETTI.map((c, i) => (
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
            }}
          />
        ))}

        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, rgba(251,191,36,0.18) 0%, rgba(7,6,15,0.97) 65%)",
            backgroundColor: "#07060f",
          }}
        />

        {/* Card */}
        <div
          className={`relative z-10 text-center px-8 py-10 max-w-sm mx-4 rounded-3xl bg-[#0f0f1a] border border-yellow-500/30 transition-all duration-700 ${
            visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          style={{ boxShadow: "0 0 80px rgba(251,191,36,0.25), 0 0 0 1px rgba(251,191,36,0.1), 0 25px 60px rgba(0,0,0,0.7)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 80px rgba(251,191,36,0.08)" }}
          />

          <div
            className="text-7xl mb-5 inline-block"
            style={{ animation: "checkPop 0.6s ease 200ms both" }}
          >
            🐐
          </div>

          <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1.5">
            Maximum Rank · Level 500
          </p>
          <h2 className="text-4xl font-black text-white mb-1" style={{ textShadow: "0 0 30px rgba(251,191,36,0.4)" }}>
            G.O.A.T.
          </h2>
          <p className="text-base font-semibold text-yellow-300 mb-2">Greatest Of All Time</p>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Less than 0.001% of users will ever reach this screen.<br />
            You are a habit legend.
          </p>

          <div
            className="p-4 rounded-2xl mb-6 text-left"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(15,15,26,0.9) 100%)",
              border: "1px solid rgba(251,191,36,0.25)",
              boxShadow: "0 0 30px rgba(251,191,36,0.12)",
            }}
          >
            <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-2">🎁 Final Reward Unlocked</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none">🐐</span>
              <div>
                <p className="text-sm font-bold text-white leading-tight">GOAT Status</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Greatest Of All Time — you have reached the absolute pinnacle
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            {onShare && (
              <button
                onClick={() => { onShare(); onDismiss(); }}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-600/30 text-yellow-300 text-sm font-semibold rounded-xl transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share this achievement
              </button>
            )}
            <button
              onClick={onDismiss}
              className="w-full px-6 py-2.5 text-black text-sm font-black rounded-xl transition-all shadow-lg"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 0 20px rgba(251,191,36,0.3)" }}
            >
              I AM THE GOAT 🐐
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard Level-Up Modal ───────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      {/* Falling confetti */}
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
        className={`relative bg-[#0f0f1a] border border-violet-700/30 rounded-3xl px-8 py-8 text-center shadow-2xl max-w-sm mx-4 transition-all duration-500 z-10 ${
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

        {/* Badge */}
        <div
          className={`relative w-20 h-20 rounded-2xl ${style.bg} ring-4 ${style.ring} mx-auto mb-5 flex items-center justify-center`}
          style={{ boxShadow: `0 0 30px ${style.glow}` }}
        >
          <span className={`text-3xl font-extrabold ${style.text}`}>{newLevel}</span>
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
          Level Up! 🎉
        </p>
        <h2 className="text-2xl font-extrabold text-white mb-0.5">You are now Lv {newLevel}</h2>
        <p className={`text-base font-bold ${style.text} mb-1`}>{name}</p>
        <p className="text-xs text-slate-500 mb-3">Keep going. Every level is proof you showed up.</p>

        {/* Reward unlocked at this level */}
        {justUnlocked && (
          <div className="mb-3 p-3 rounded-xl bg-violet-900/30 border border-violet-500/30 text-left">
            <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1.5">
              🎁 Reward Unlocked!
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">{justUnlocked.icon}</span>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{justUnlocked.name}</p>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{justUnlocked.desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* XP to next level */}
        {newLevel < 500 && (
          <p className="text-[11px] text-slate-600 mb-2">
            Next level · <span className="text-slate-500 font-medium">{xpToNext} XP</span> to go
          </p>
        )}

        {/* Next reward teaser */}
        {nextReward && (
          <p className="text-[10px] text-slate-600 mb-4">
            Next reward: {nextReward.icon} Lv {nextReward.level} — {nextReward.name}
          </p>
        )}
        {!nextReward && <div className="mb-4" />}

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
            className="w-full px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-900/30"
          >
            Let&apos;s keep going →
          </button>
        </div>
      </div>
    </div>
  );
}
