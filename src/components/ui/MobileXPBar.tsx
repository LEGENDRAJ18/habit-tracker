"use client";

import { useXP } from "@/hooks/useXP";
import {
  levelColorKey,
  xpProgressPct,
  xpIntoLevel,
  xpSpanOfLevel,
  levelFromXP,
  type LevelColorKey,
} from "@/lib/xp";

const LEVEL_COLORS: Record<LevelColorKey, { text: string; bar: string }> = {
  slate:   { text: "text-slate-300",  bar: "bg-slate-400"   },
  emerald: { text: "text-emerald-300", bar: "bg-emerald-400" },
  blue:    { text: "text-blue-300",   bar: "bg-blue-400"    },
  violet:  { text: "text-violet-300", bar: "bg-violet-400"  },
  amber:   { text: "text-amber-300",  bar: "bg-amber-400"   },
  red:     { text: "text-red-300",    bar: "bg-red-400"     },
  gold:    { text: "text-yellow-200", bar: "bg-yellow-300"  },
};

export default function MobileXPBar() {
  const { xp, level } = useXP();
  const colorKey = levelColorKey(level);
  const s = LEVEL_COLORS[colorKey];
  const pct = xpProgressPct(xp);
  const into = xpIntoLevel(xp);
  const span = xpSpanOfLevel(xp);

  return (
    <div className="sm:hidden bg-[#09090f]/95 border-b border-violet-900/20 px-4 h-9 flex items-center gap-3">
      <span className={`text-[10px] font-extrabold ${s.text} flex-shrink-0`}>
        Lv {level}
      </span>
      <div className="flex-1 h-1.5 bg-violet-950/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${s.bar} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] ${s.text} flex-shrink-0 whitespace-nowrap`}>
        {into.toLocaleString()} / {span.toLocaleString()} XP · Lv {level + 1}
      </span>
    </div>
  );
}
