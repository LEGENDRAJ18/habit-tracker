"use client";

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useXP, ACHIEVEMENT_META, type AchievementId } from "@/hooks/useXP";
import { levelName, levelColorKey, xpProgressPct, xpIntoLevel, xpSpanOfLevel } from "@/lib/xp";

const ALL_ACHIEVEMENTS: AchievementId[] = [
  "first_habit",
  "streak_7",
  "streak_30",
  "all_week",
  "level_10",
];

const BADGE_RING: Record<ReturnType<typeof levelColorKey>, string> = {
  slate:   "ring-slate-600/50   bg-slate-700/20",
  emerald: "ring-emerald-600/50 bg-emerald-900/20",
  blue:    "ring-blue-600/50    bg-blue-900/20",
  violet:  "ring-violet-600/50  bg-violet-900/20",
  amber:   "ring-amber-500/60   bg-amber-900/20",
};

export default function ProfilePage() {
  const { xp, level, achievements, totalCompletions, xpLoading } = useXP();

  const colorKey = levelColorKey(level);
  const ringCls  = BADGE_RING[colorKey];
  const pct      = xpProgressPct(xp);
  const into     = xpIntoLevel(xp);
  const span     = xpSpanOfLevel(xp);
  const name     = levelName(level);

  return (
    <div className="min-h-screen bg-[#09090f]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">Profile</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {xpLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Level card */}
            <div className={`flex items-center gap-5 bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-6 mb-8`}>
              <div className={`w-20 h-20 rounded-2xl ring-4 flex items-center justify-center flex-shrink-0 ${ringCls}`}>
                <span className="text-3xl font-extrabold text-white">{level}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Current Level</p>
                <h1 className="text-2xl font-bold text-white mb-0.5">{name}</h1>
                <p className="text-xs text-slate-500 mb-3">
                  {xp.toLocaleString()} total XP · {totalCompletions.toLocaleString()} habits completed
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

            {/* Achievements */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Achievements ({achievements.length} / {ALL_ACHIEVEMENTS.length})
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {ALL_ACHIEVEMENTS.map((id) => {
                const meta    = ACHIEVEMENT_META[id];
                const earned  = achievements.includes(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      earned
                        ? "bg-violet-900/15 border-violet-600/25"
                        : "bg-[#0f0f1a] border-violet-900/15 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${
                        earned ? "bg-violet-800/30" : "bg-slate-800/40 grayscale"
                      }`}
                    >
                      {earned ? meta.emoji : <Lock className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${earned ? "text-white" : "text-slate-600"}`}>
                        {meta.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${earned ? "text-slate-400" : "text-slate-700"}`}>
                        {meta.desc}
                      </p>
                      {earned && (
                        <span className="inline-flex items-center text-[10px] mt-1.5 text-violet-400 font-medium">
                          ✓ Earned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Level progression reference */}
            <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Level Tiers
              </p>
              <div className="space-y-2">
                {(
                  [
                    { range: "1 – 5",   name: "Beginner",  color: "text-slate-400",  bg: "bg-slate-700/30" },
                    { range: "6 – 15",  name: "Explorer",  color: "text-emerald-400",bg: "bg-emerald-900/30" },
                    { range: "16 – 30", name: "Achiever",  color: "text-blue-400",   bg: "bg-blue-900/30" },
                    { range: "31 – 50", name: "Champion",  color: "text-violet-400", bg: "bg-violet-900/30" },
                    { range: "51 – 100",name: "Legend",    color: "text-amber-400",  bg: "bg-amber-900/20" },
                  ] as const
                ).map((t) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${t.bg} ${t.color} w-14 text-center`}>
                      {t.range}
                    </span>
                    <span className={`text-sm font-semibold ${t.color}`}>{t.name}</span>
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
