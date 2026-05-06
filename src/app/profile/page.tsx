"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, Flame, Zap, Trophy, CalendarDays } from "lucide-react";
import { useXP, ACHIEVEMENT_META, type AchievementId } from "@/hooks/useXP";
import { levelName, levelColorKey, xpProgressPct, xpIntoLevel, xpSpanOfLevel, type LevelColorKey } from "@/lib/xp";
import { createClient } from "@/lib/supabase/client";

const ALL_ACHIEVEMENTS: AchievementId[] = [
  "first_habit",
  "streak_7",
  "streak_30",
  "all_week",
  "level_10",
];

const BADGE_RING: Record<LevelColorKey, string> = {
  slate:   "ring-slate-600/50   bg-slate-700/20",
  emerald: "ring-emerald-600/50 bg-emerald-900/20",
  blue:    "ring-blue-600/50    bg-blue-900/20",
  violet:  "ring-violet-600/50  bg-violet-900/20",
  amber:   "ring-amber-500/60   bg-amber-900/20",
  red:     "ring-red-600/60     bg-red-900/20",
  gold:    "ring-yellow-400/70  bg-yellow-900/20",
};

const TIERS = [
  { range: "1 – 50",      name: "Beginner",     color: "text-slate-400",   bg: "bg-slate-700/30" },
  { range: "51 – 200",    name: "Explorer",     color: "text-emerald-400", bg: "bg-emerald-900/30" },
  { range: "201 – 500",   name: "Achiever",     color: "text-blue-400",    bg: "bg-blue-900/30" },
  { range: "501 – 1000",  name: "Champion",     color: "text-violet-400",  bg: "bg-violet-900/30" },
  { range: "1001 – 2500", name: "Legend",       color: "text-amber-400",   bg: "bg-amber-900/20" },
  { range: "2501 – 5000", name: "Master",       color: "text-red-400",     bg: "bg-red-900/20" },
  { range: "5001 – 10000",name: "Grandmaster",  color: "text-yellow-300",  bg: "bg-yellow-900/20" },
] as const;

export default function ProfilePage() {
  const { xp, level, achievements, totalCompletions, xpLoading } = useXP();
  const [joinedDate, setJoinedDate] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState(0);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      // Join date from auth
      const d = new Date(user.created_at);
      setJoinedDate(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      // Best streak from logs
      supabase
        .from("habit_logs")
        .select("habit_id, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .then(({ data: logs }) => {
          if (!logs || logs.length === 0) return;
          // Group by date
          const dates = new Set(logs.map((l) => l.completed_at.split("T")[0]));
          let streak = 0; let best = 0; let offset = 0;
          const today = new Date().toISOString().split("T")[0];
          const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
          if (!dates.has(today) && !dates.has(daysAgo(1))) { setBestStreak(0); return; }
          while (dates.has(daysAgo(offset))) { streak++; offset++; }
          best = streak;
          setBestStreak(best);
        });
    });
  }, [supabase]);

  const colorKey = levelColorKey(level);
  const ringCls  = BADGE_RING[colorKey];
  const pct      = xpProgressPct(xp);
  const into     = xpIntoLevel(xp);
  const span     = xpSpanOfLevel(xp);
  const name     = levelName(level);
  const isGold   = colorKey === "gold";

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">👤 Profile</h1>
        <p className="text-sm text-slate-500 mt-1.5">Your journey so far — levels, achievements, and stats</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        {xpLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Level card */}
            <div
              className="relative overflow-hidden bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-6 mb-5"
              style={isGold ? { boxShadow: "0 0 40px rgba(251,191,36,0.2), inset 0 0 40px rgba(251,191,36,0.05)" } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex items-center gap-5">
                <div className={`w-20 h-20 rounded-2xl ring-4 flex items-center justify-center flex-shrink-0 ${ringCls}`}
                     style={isGold ? { boxShadow: "0 0 20px rgba(251,191,36,0.4)" } : { boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
                  <span className="text-3xl font-extrabold text-white">{level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Current Level</p>
                  <h1 className="text-2xl font-bold text-white mb-0.5">{name}</h1>
                  <p className="text-xs text-slate-500 mb-3">
                    {xp.toLocaleString()} XP · {totalCompletions.toLocaleString()} completions
                    {joinedDate && <> · Joined {joinedDate}</>}
                  </p>
                  <div className="w-full h-2 bg-violet-950/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {into.toLocaleString()} / {span.toLocaleString()} XP to level {level + 1}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Flame,       value: `${bestStreak}d`, label: "Best Streak",   color: "text-orange-400" },
                { icon: Zap,         value: xp.toLocaleString(), label: "Total XP", color: "text-amber-400"  },
                { icon: CalendarDays,value: totalCompletions.toLocaleString(), label: "Completed", color: "text-violet-400" },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="bg-[#0f0f1a] border border-violet-900/20 rounded-xl p-3 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                  <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-white">
                Achievements
              </p>
              <span className="text-xs text-slate-500 ml-1">{achievements.length} / {ALL_ACHIEVEMENTS.length} earned</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {ALL_ACHIEVEMENTS.map((id) => {
                const meta   = ACHIEVEMENT_META[id];
                const earned = achievements.includes(id);
                return (
                  <div
                    key={id}
                    className={`relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      earned
                        ? "bg-gradient-to-br from-violet-950/40 to-[#0f0f1a] border-violet-600/35"
                        : "bg-[#0f0f1a] border-violet-900/15 opacity-50"
                    }`}
                    style={earned ? { boxShadow: "0 0 20px rgba(139,92,246,0.12)" } : undefined}
                  >
                    {earned && (
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 to-transparent pointer-events-none" />
                    )}
                    <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${
                      earned
                        ? "bg-violet-800/30 border border-violet-600/30"
                        : "bg-slate-800/40 grayscale"
                    }`}>
                      {earned ? meta.emoji : <Lock className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${earned ? "text-white" : "text-slate-600"}`}>
                        {meta.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${earned ? "text-slate-400" : "text-slate-700"}`}>
                        {meta.desc}
                      </p>
                      {earned && (
                        <span className="inline-flex items-center gap-1 text-[10px] mt-1.5 text-violet-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                          Earned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Level tier reference */}
            <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Level Tiers (1 – 10,000)
              </p>
              <div className="space-y-2">
                {TIERS.map((t) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${t.bg} ${t.color} w-28 text-center tabular-nums`}>
                      {t.range}
                    </span>
                    <span className={`text-sm font-semibold ${t.color}`}>{t.name}</span>
                    {level >= parseInt(t.range.split("–")[0].replace(/\D/g, "")) &&
                     level <= parseInt(t.range.split("–")[1]?.replace(/\D/g, "") ?? "99999") && (
                      <span className="text-[10px] text-slate-600">← you are here</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
