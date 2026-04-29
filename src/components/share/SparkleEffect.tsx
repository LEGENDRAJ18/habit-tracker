"use client";

import { useEffect, useState } from "react";

const PARTICLES = [
  { char: "✨", top: "8%",  left: "12%",  delay: 0.1, size: 18 },
  { char: "⭐", top: "12%", left: "82%",  delay: 0.3, size: 14 },
  { char: "✨", top: "75%", left: "7%",   delay: 0.5, size: 12 },
  { char: "💫", top: "80%", left: "88%",  delay: 0.2, size: 16 },
  { char: "✨", top: "5%",  left: "55%",  delay: 0.6, size: 10 },
  { char: "⭐", top: "90%", left: "40%",  delay: 0.4, size: 14 },
  { char: "💫", top: "35%", left: "3%",   delay: 0.8, size: 12 },
  { char: "✨", top: "55%", left: "95%",  delay: 0.15, size: 16 },
  { char: "⭐", top: "20%", left: "48%",  delay: 0.7, size: 10 },
  { char: "💫", top: "68%", left: "25%",  delay: 0.9, size: 14 },
];

export default function SparkleEffect() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <style>{`
        @keyframes sparklePop {
          0%   { opacity: 0; transform: translateY(10px) scale(0.3) rotate(0deg); }
          30%  { opacity: 1; transform: translateY(-8px) scale(1.1) rotate(15deg); }
          60%  { opacity: 0.7; transform: translateY(-20px) scale(1) rotate(-10deg); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.4) rotate(20deg); }
        }
      `}</style>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: p.top,
            left: p.left,
            fontSize: p.size,
            lineHeight: 1,
            animation: `sparklePop 2.5s ${p.delay}s ease-out both`,
          }}
        >
          {p.char}
        </div>
      ))}
    </div>
  );
}
