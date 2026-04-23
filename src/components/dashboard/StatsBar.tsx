"use client";

import { Flame, Zap } from "lucide-react";
import {
  levelName,
  levelColorKey,
  xpProgressPct,
  xpIntoLevel,
  xpSpanOfLevel,
  xpForLevel,
} from "@/lib/xp";

interface Props {
  xp: number;
  level: number;
  bestStreak: number;
  totalCompletions: number;
}

const BADGE_STYLES: Record<
  ReturnType<typeof levelColorKey>,
  { ring: string; bg: string; text: string; bar: string }
> = {
  slate:   { ring: "ring-slate-600/60",   bg: "bg-slate-700/50",   text: "text-slate-300",  bar: "from-slate-500 to-slate-400" },
  emerald: { ring: "ring-emerald-600/60", bg: "bg-emerald-900/40", text: "text-emerald-300", bar: "from-emerald-500 to-teal-400" },
  blue:    { ring: "ring-blue-600/60",    bg: "bg-blue-900/40",    text: "text-blue-300",    bar: "from-blue-500 to-cyan-400" },
  violet:  { ring: "ring-violet-600/60",  bg: "bg-violet-900/40",  text: "text-violet-300",  bar: "from-violet-500 to-fuchsia-400" },
  amber:   { ring: "ring-amber-500/60",   bg: "bg-amber-900/30",   text: "text-amber-300",   bar: "from-amber-400 to-yellow-300" },
};

export default function StatsBar({ xp, level, bestStreak, totalCompletions }: Props) {
  const colorKey = levelColorKey(level);
  const style    = BADGE_STYLES[colorKey];
  const pct      = xpProgressPct(xp);
  const into     = xpIntoLevel(xp);
  const span     = xpSpanOfLevel(xp);
  const name     = levelName(level);

  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-4 py-3 mb-6 flex items-center gap-4 flex-wrap sm:flex-nowrap">
      {/* Level badge */}
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${style.bg} ring-2 ${style.ring} flex items-center justify-center`}>
        <span className={`text-base font-extrabold ${style.text}`}>{level}</span>
      </div>

      {/* XP bar + label */}
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
        <p className="text-[10px] text-slate-600 mt-0.5">
          Level {level + 1} at {xpForLevel(level + 1).toLocaleString()} XP
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-semibold text-slate-300 tabular-nums">{bestStreak}</span>
          <span>best</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold text-slate-300 tabular-nums">
            {totalCompletions.toLocaleString()}
          </span>
          <span className="hidden sm:inline">done</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className={`font-semibold tabular-nums ${style.text}`}>
            {xp.toLocaleString()}
          </span>
          <span>XP</span>
        </div>
      </div>
    </div>
  );
}
