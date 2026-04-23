"use client";

import { Check, Lock } from "lucide-react";

interface Milestone {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  xp: number;
  achieved: boolean;
}

interface Props {
  completedCount: number;
  totalHabits: number;
  bestStreak: number;
  isDailyAchieved: (id: "first_habit_today" | "all_habits_today") => boolean;
  hasStreak7: boolean;
  hasStreak30: boolean;
  sidebar?: boolean;
}

export default function MilestoneCards({
  completedCount,
  totalHabits,
  bestStreak,
  isDailyAchieved,
  hasStreak7,
  hasStreak30,
  sidebar,
}: Props) {
  const milestones: Milestone[] = [
    {
      id: "first_habit_today",
      emoji: "⭐",
      title: "First habit",
      desc: "Complete 1 habit today",
      xp: 10,
      achieved: isDailyAchieved("first_habit_today") || completedCount >= 1,
    },
    {
      id: "all_habits_today",
      emoji: "🏆",
      title: "All done",
      desc: totalHabits > 0 ? `Complete all ${totalHabits} habits` : "Complete all habits",
      xp: 25,
      achieved:
        isDailyAchieved("all_habits_today") ||
        (totalHabits > 0 && completedCount >= totalHabits),
    },
    {
      id: "streak_7",
      emoji: "🔥",
      title: "Week streak",
      desc: "Maintain a 7-day streak",
      xp: 50,
      achieved: hasStreak7,
    },
    {
      id: "streak_30",
      emoji: "💎",
      title: "Month streak",
      desc: "Maintain a 30-day streak",
      xp: 200,
      achieved: hasStreak30,
    },
  ];

  // Progress: how close is the user to the next locked milestone?
  function progress(m: Milestone): number {
    if (m.achieved) return 100;
    if (m.id === "first_habit_today")
      return Math.min(100, completedCount >= 1 ? 100 : (completedCount / 1) * 100);
    if (m.id === "all_habits_today")
      return totalHabits > 0
        ? Math.min(100, Math.round((completedCount / totalHabits) * 100))
        : 0;
    if (m.id === "streak_7")
      return Math.min(100, Math.round((bestStreak / 7) * 100));
    if (m.id === "streak_30")
      return Math.min(100, Math.round((bestStreak / 30) * 100));
    return 0;
  }

  return (
    <div className={sidebar ? "" : "mt-8"}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Daily Milestones
      </p>
      <div className={sidebar ? "space-y-2" : "grid grid-cols-2 sm:grid-cols-4 gap-2.5"}>
        {milestones.map((m) => {
          const pct = progress(m);
          return sidebar ? (
              /* Sidebar: compact horizontal card */
              <div
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  m.achieved
                    ? "bg-violet-900/20 border-violet-600/30"
                    : "bg-[#0f0f1a] border-violet-900/15"
                }`}
              >
                <span className={`text-lg leading-none flex-shrink-0 ${m.achieved ? "" : "opacity-30"}`}>
                  {m.achieved ? m.emoji : <Lock className="w-4 h-4 text-slate-700" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-semibold truncate ${m.achieved ? "text-white" : "text-slate-500"}`}>
                    {m.title}
                  </p>
                  {!m.achieved && pct > 0 && (
                    <div className="mt-1 w-full h-1 bg-violet-950/60 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  m.achieved ? "bg-violet-500/20 text-violet-300" : "bg-slate-800/60 text-slate-600"
                }`}>
                  +{m.xp}
                </span>
              </div>
            ) : (
              /* Grid: existing card layout */
              <div
                key={m.id}
                className={`relative overflow-hidden rounded-xl border p-3.5 transition-all ${
                  m.achieved
                    ? "bg-violet-900/20 border-violet-600/30"
                    : "bg-[#0f0f1a] border-violet-900/15"
                }`}
              >
                <span
                  className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    m.achieved ? "bg-violet-500/20 text-violet-300" : "bg-slate-800/60 text-slate-600"
                  }`}
                >
                  +{m.xp} XP
                </span>
                <div className="mb-2">
                  {m.achieved ? (
                    <span className="text-2xl leading-none">{m.emoji}</span>
                  ) : (
                    <div className="relative inline-flex">
                      <span className="text-2xl leading-none opacity-30">{m.emoji}</span>
                      <Lock className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-slate-600" />
                    </div>
                  )}
                </div>
                <p className={`text-xs font-semibold leading-tight mb-0.5 ${m.achieved ? "text-white" : "text-slate-500"}`}>
                  {m.title}
                </p>
                <p className={`text-[10px] leading-tight ${m.achieved ? "text-slate-400" : "text-slate-700"}`}>
                  {m.desc}
                </p>
                {!m.achieved && pct > 0 && (
                  <div className="mt-2 w-full h-1 bg-violet-950/60 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600/50 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {m.achieved && (
                  <div className="mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3 text-violet-400" />
                    <span className="text-[10px] text-violet-400 font-medium">Earned</span>
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
}
