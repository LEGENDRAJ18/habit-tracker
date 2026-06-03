"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface FocusStats {
  dailyTotal:   number;
  weeklyData:   number[];
  personalBest: number;
  totalSessions: number;
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function FocusStatsWidget() {
  const [stats, setStats] = useState<FocusStats | null>(null);

  useEffect(() => {
    fetch("/api/focus")
      .then((r) => r.ok ? r.json() : null)
      .then((d: FocusStats | null) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  if (!stats || stats.dailyTotal === 0) return null;

  const weekTotal = stats.weeklyData.reduce((s, v) => s + v, 0);

  return (
    <div className="mt-3 flex items-center gap-3 bg-[#0c0c18] border border-violet-900/25 rounded-xl px-3.5 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-violet-900/40 border border-violet-700/30 flex items-center justify-center flex-shrink-0">
        <Timer className="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">
          {fmtMin(stats.dailyTotal)} focused today 🔥
        </p>
        {weekTotal > 0 && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            {fmtMin(weekTotal)} this week
            {stats.personalBest > 0 && ` · best day ${fmtMin(stats.personalBest)}`}
          </p>
        )}
      </div>
      {/* Mini weekly sparkline */}
      <div className="flex items-end gap-0.5 flex-shrink-0 h-5">
        {stats.weeklyData.map((v, i) => {
          const maxV = Math.max(...stats.weeklyData, 1);
          const h = Math.max(2, Math.round((v / maxV) * 20));
          return (
            <div
              key={i}
              className="w-1 rounded-full"
              style={{
                height: h,
                background: v > 0
                  ? i === stats.weeklyData.length - 1
                    ? "#8b5cf6"
                    : "rgba(139,92,246,0.4)"
                  : "rgba(109,40,217,0.12)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
