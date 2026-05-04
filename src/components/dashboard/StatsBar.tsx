"use client";

import { Flame, Zap } from "lucide-react";
import {
  levelName,
  levelColorKey,
  xpProgressPct,
  xpIntoLevel,
  xpSpanOfLevel,
  xpForLevel,
  type LevelColorKey,
} from "@/lib/xp";

interface Props {
  xp: number;
  level: number;
  bestStreak: number;
  totalCompletions: number;
  /** When true renders as a vertical sidebar card instead of horizontal strip */
  sidebar?: boolean;
}

const STYLES: Record<LevelColorKey, { ring: string; bg: string; text: string; bar: string; glow?: string }> = {
  slate:   { ring: "ring-slate-600/60",   bg: "bg-slate-700/30",   text: "text-slate-300",  bar: "from-slate-500 to-slate-400" },
  emerald: { ring: "ring-emerald-600/60", bg: "bg-emerald-900/30", text: "text-emerald-300", bar: "from-emerald-500 to-teal-400" },
  blue:    { ring: "ring-blue-600/60",    bg: "bg-blue-900/30",    text: "text-blue-300",    bar: "from-blue-500 to-cyan-400" },
  violet:  { ring: "ring-violet-600/60",  bg: "bg-violet-900/30",  text: "text-violet-300",  bar: "from-violet-500 to-fuchsia-400" },
  amber:   { ring: "ring-amber-500/60",   bg: "bg-amber-900/25",   text: "text-amber-300",   bar: "from-amber-400 to-yellow-300" },
  red:     { ring: "ring-red-600/60",     bg: "bg-red-900/25",     text: "text-red-300",     bar: "from-red-500 to-orange-400" },
  gold:    {
    ring: "ring-yellow-400/70",
    bg:   "bg-yellow-900/25",
    text: "text-yellow-200",
    bar:  "from-yellow-400 to-amber-300",
    glow: "0 0 16px rgba(251,191,36,0.4)",
  },
};

export default function StatsBar({ xp, level, bestStreak, totalCompletions, sidebar }: Props) {
  const colorKey = levelColorKey(level);
  const style    = STYLES[colorKey];
  const pct      = xpProgressPct(xp);
  const into     = xpIntoLevel(xp);
  const span     = xpSpanOfLevel(xp);
  const name     = levelName(level);

  if (sidebar) {
    return (
      <div
        className={`bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5`}
        style={style.glow ? { boxShadow: style.glow } : undefined}
      >
        <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-3">Your Progress</p>

        {/* Badge + name */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl ${style.bg} ring-2 ${style.ring} flex items-center justify-center flex-shrink-0`}
               style={style.glow ? { boxShadow: style.glow } : undefined}>
            <span className={`text-lg font-extrabold ${style.text}`}>{level}</span>
          </div>
          <div>
            <p className={`text-sm font-bold ${style.text}`}>{name}</p>
            <p className="text-[11px] text-slate-600">Level {level}</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className={style.text}>{into.toLocaleString()} XP</span>
            <span className="text-slate-600">{span.toLocaleString()} total</span>
          </div>
          <div className="w-full h-2.5 bg-violet-950/60 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${style.bar} rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5">
            Level {level + 1} — {(span - into).toLocaleString()} XP to next level
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatPill icon={<Zap className="w-3 h-3" />} value={xp.toLocaleString()} label="XP" color={style.text} />
          <StatPill icon={<Flame className="w-3 h-3 text-orange-400" />} value={String(bestStreak)} label="streak" color="text-orange-300" />
          <StatPill icon={null} value={totalCompletions.toLocaleString()} label="done" color="text-slate-400" />
        </div>
      </div>
    );
  }

  // Horizontal strip (mobile / top of page)
  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-4 py-3 mb-6 flex items-center gap-4 flex-wrap sm:flex-nowrap"
         style={style.glow ? { boxShadow: style.glow } : undefined}>
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${style.bg} ring-2 ${style.ring} flex items-center justify-center`}>
        <span className={`text-base font-extrabold ${style.text}`}>{level}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className={`text-xs font-semibold ${style.text}`}>{name}</span>
          <span className="text-[10px] text-slate-600 tabular-nums">
            {into.toLocaleString()} / {span.toLocaleString()} XP
          </span>
        </div>
        <div className="w-full h-2 bg-violet-950/60 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${style.bar} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-0.5">Level {level + 1} — {(span - into).toLocaleString()} XP to next level</p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-semibold text-slate-300 tabular-nums">{bestStreak}</span>
          <span>best</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold text-slate-300 tabular-nums">{totalCompletions.toLocaleString()}</span>
          <span className="hidden sm:inline">done</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className={`font-semibold tabular-nums ${style.text}`}>{xp.toLocaleString()}</span>
          <span>XP</span>
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="bg-violet-950/30 rounded-xl px-2 py-2 text-center">
      {icon && <div className={`flex justify-center mb-0.5 ${color}`}>{icon}</div>}
      <p className={`text-xs font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] text-slate-600">{label}</p>
    </div>
  );
}
