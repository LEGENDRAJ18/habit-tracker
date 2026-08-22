"use client";

import { Check, Lock, Share2 } from "lucide-react";

type MilestoneColor = "blue" | "emerald" | "orange" | "amber";

interface Milestone {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  xp: number;
  achieved: boolean;
  color: MilestoneColor;
  shareType?: "streak" | "level" | "daily";
  shareValue?: number;
}

const COLOR_STYLES: Record<MilestoneColor, { achievedBg: string; achievedBorder: string; badgeBg: string; badgeText: string; text: string; hoverText: string; bar: string; glow: string }> = {
  blue:    { achievedBg: "bg-blue-900/20",    achievedBorder: "border-blue-600/30",    badgeBg: "bg-blue-500/20",    badgeText: "text-blue-300",    text: "text-blue-400",    hoverText: "hover:text-blue-400",    bar: "bg-blue-600/50",    glow: "rgba(59,130,246,0.12)"  },
  emerald: { achievedBg: "bg-emerald-900/20", achievedBorder: "border-emerald-600/30", badgeBg: "bg-emerald-500/20", badgeText: "text-emerald-300", text: "text-emerald-400", hoverText: "hover:text-emerald-400", bar: "bg-emerald-600/50", glow: "rgba(16,185,129,0.12)"  },
  orange:  { achievedBg: "bg-orange-900/20",  achievedBorder: "border-orange-600/30",  badgeBg: "bg-orange-500/20",  badgeText: "text-orange-300",  text: "text-orange-400",  hoverText: "hover:text-orange-400",  bar: "bg-orange-600/50",  glow: "rgba(251,146,60,0.12)" },
  amber:   { achievedBg: "bg-amber-900/20",   achievedBorder: "border-amber-600/30",   badgeBg: "bg-amber-500/20",   badgeText: "text-amber-300",   text: "text-amber-400",   hoverText: "hover:text-amber-400",   bar: "bg-amber-600/50",   glow: "rgba(251,191,36,0.14)" },
};

interface Props {
  completedCount: number;
  totalHabits: number;
  bestStreak: number;
  isDailyAchieved: (id: "first_habit_today" | "all_habits_today") => boolean;
  hasStreak7: boolean;
  hasStreak30: boolean;
  sidebar?: boolean;
  onShare?: (type: "streak" | "level" | "daily", value: number) => void;
}

export default function MilestoneCards({
  completedCount,
  totalHabits,
  bestStreak,
  isDailyAchieved,
  hasStreak7,
  hasStreak30,
  sidebar,
  onShare,
}: Props) {
  const milestones: Milestone[] = [
    {
      id:         "first_habit_today",
      emoji:      "⭐",
      title:      "First habit",
      desc:       "Complete 1 habit today",
      xp:         10,
      achieved:   isDailyAchieved("first_habit_today") || completedCount >= 1,
      color:      "blue",
      shareType:  "daily",
      shareValue: 1,
    },
    {
      id:         "all_habits_today",
      emoji:      "🏆",
      title:      "All done",
      desc:       totalHabits > 0 ? `Complete all ${totalHabits} habits` : "Complete all habits",
      xp:         25,
      achieved:
        isDailyAchieved("all_habits_today") ||
        (totalHabits > 0 && completedCount >= totalHabits),
      color:      "emerald",
      shareType:  "daily",
      shareValue: completedCount,
    },
    {
      id:         "streak_7",
      emoji:      "🔥",
      title:      "Week streak",
      desc:       "Maintain a 7-day streak",
      xp:         50,
      achieved:   hasStreak7,
      color:      "orange",
      shareType:  "streak",
      shareValue: 7,
    },
    {
      id:         "streak_30",
      emoji:      "💎",
      title:      "Month streak",
      desc:       "Maintain a 30-day streak",
      xp:         200,
      achieved:   hasStreak30,
      color:      "amber",
      shareType:  "streak",
      shareValue: 30,
    },
  ];

  function progress(m: Milestone): number {
    if (m.achieved) return 100;
    if (m.id === "first_habit_today")
      return completedCount >= 1 ? 100 : (completedCount / 1) * 100;
    if (m.id === "all_habits_today")
      return totalHabits > 0 ? Math.min(100, Math.round((completedCount / totalHabits) * 100)) : 0;
    if (m.id === "streak_7")  return Math.min(100, Math.round((bestStreak / 7) * 100));
    if (m.id === "streak_30") return Math.min(100, Math.round((bestStreak / 30) * 100));
    return 0;
  }

  return (
    <div className={sidebar ? "" : "mt-8"}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Daily Milestones
      </p>
      <div className={sidebar ? "space-y-2" : "grid grid-cols-2 sm:grid-cols-4 gap-2.5"}>
        {milestones.map((m) => {
          const pct = progress(m);
          const cs  = COLOR_STYLES[m.color];

          return sidebar ? (
            /* ── Sidebar: compact horizontal ───────────────────────────── */
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                m.achieved
                  ? `${cs.achievedBg} ${cs.achievedBorder}`
                  : "bg-[#0f0f1a] border-violet-900/15"
              }`}
              style={m.achieved ? { boxShadow: `0 0 16px ${cs.glow}` } : undefined}
            >
              <span className={`text-lg leading-none flex-shrink-0 ${m.achieved ? "" : "opacity-30"}`}>
                {m.achieved ? m.emoji : <Lock className="w-4 h-4 text-slate-400" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold truncate ${m.achieved ? "text-white" : "text-slate-400"}`}>
                  {m.title}
                </p>
                {!m.achieved && pct > 0 && (
                  <div className="mt-1 w-full h-1 bg-violet-950/60 rounded-full overflow-hidden">
                    <div className={`h-full ${cs.bar} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  m.achieved ? `${cs.badgeBg} ${cs.badgeText}` : "bg-slate-800/60 text-slate-400"
                }`}>
                  +{m.xp}
                </span>
                {m.achieved && onShare && m.shareType && m.shareValue !== undefined && (
                  <button
                    onClick={() => onShare(m.shareType!, m.shareValue!)}
                    aria-label={`Share ${m.title}`}
                    className={`p-1 rounded-lg text-slate-400 ${cs.hoverText} hover:bg-violet-950/40 transition-all`}
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── Grid: card layout ─────────────────────────────────────── */
            <div
              key={m.id}
              className={`relative overflow-hidden rounded-xl border p-3.5 transition-all ${
                m.achieved
                  ? `${cs.achievedBg} ${cs.achievedBorder}`
                  : "bg-[#0f0f1a] border-violet-900/15"
              }`}
              style={m.achieved ? { boxShadow: `0 0 20px ${cs.glow}` } : undefined}
            >
              <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                m.achieved ? `${cs.badgeBg} ${cs.badgeText}` : "bg-slate-800/60 text-slate-400"
              }`}>
                +{m.xp} XP
              </span>
              <div className="mb-2">
                {m.achieved ? (
                  <span className="text-2xl leading-none">{m.emoji}</span>
                ) : (
                  <div className="relative inline-flex">
                    <span className="text-2xl leading-none opacity-30">{m.emoji}</span>
                    <Lock className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-slate-400" />
                  </div>
                )}
              </div>
              <p className={`text-xs font-semibold leading-tight mb-0.5 ${m.achieved ? "text-white" : "text-slate-400"}`}>
                {m.title}
              </p>
              <p className={`text-[10px] leading-tight ${m.achieved ? "text-slate-400" : "text-slate-400"}`}>
                {m.desc}
              </p>
              {!m.achieved && pct > 0 && (
                <div className="mt-2 w-full h-1 bg-violet-950/60 rounded-full overflow-hidden">
                  <div className={`h-full ${cs.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              )}
              {m.achieved && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Check className={`w-3 h-3 ${cs.text}`} />
                    <span className={`text-[10px] font-medium ${cs.text}`}>Earned</span>
                  </div>
                  {onShare && m.shareType && m.shareValue !== undefined && (
                    <button
                      onClick={() => onShare(m.shareType!, m.shareValue!)}
                      aria-label={`Share ${m.title}`}
                      className={`flex items-center gap-0.5 text-[10px] text-slate-400 ${cs.hoverText} transition-colors`}
                    >
                      <Share2 className="w-2.5 h-2.5" />
                      Share
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
