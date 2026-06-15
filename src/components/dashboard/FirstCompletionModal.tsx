"use client";

import { useEffect, useState } from "react";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

const CONFETTI = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 2.55) % 100}%`,
  delay: (i * 53) % 1000,
  duration: 1300 + ((i * 97) % 900),
  size: 5 + (i % 5) * 2,
  color: ["#8b5cf6","#a78bfa","#fbbf24","#34d399","#60a5fa","#f472b6","#fb923c","#e879f9"][i % 8],
  isCircle: i % 3 === 0,
}));

interface Props {
  onDismiss: () => void;
}

export default function FirstCompletionModal({ onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    const auto = setTimeout(onDismiss, 7000);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, [onDismiss]);

  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

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
        className={`relative z-10 bg-[#0f0f1a] border border-violet-700/40 rounded-3xl px-8 py-9 text-center shadow-2xl max-w-xs mx-4 transition-all duration-500 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        style={{
          boxShadow: "0 0 60px rgba(139,92,246,0.35), 0 25px 60px rgba(0,0,0,0.6)",
          animation: visible ? "firstCompIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent rounded-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-6xl mb-4 leading-none" style={{ animation: "checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 150ms both" }}>
            🎉
          </div>
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-2">First habit completed</p>
          <h2 className="text-xl font-black text-white mb-2 leading-tight">
            That&apos;s how legends start.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            You just completed your first habit. Most people only think about it. You did it.
          </p>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-900/30"
          >
            Keep the momentum →
          </button>
          <p className="text-[10px] text-slate-700 mt-3">Tap anywhere to dismiss</p>
        </div>
      </div>
    </div>
  );
}
