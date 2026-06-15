"use client";

import { useEffect, useRef, useState } from "react";
import { X, Calendar, Flame, Zap, Target, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import CenteredModal from "@/components/ui/CenteredModal";
import { xpForLevel, xpIntoLevel, xpSpanOfLevel, levelName, levelEmoji } from "@/lib/xp";
import { ACHIEVEMENT_META, type AchievementId } from "@/hooks/useXP";

const LEVEL_UNLOCKS: Record<number, string> = {
  2:  "Streak Freeze 🧊",
  3:  "Custom Avatars 🎨",
  4:  "Lucky XP Bonus 🎰",
  5:  "Streak Shield 🛡️",
  6:  "Battle Mode ⚔️",
  7:  "Habit DNA 🧬",
  8:  "AI Coach 🤖",
  9:  "Monthly Wrapped 📊",
  10: "Elite Status ⚡",
  11: "Legend Badge 👑",
};

interface Props {
  xp: number;
  level: number;
  achievements: AchievementId[];
  bestStreak: number;
  historicalLogs: { habit_id: string; completed_at: string }[];
  totalCompletions: number;
  onClose: () => void;
}

export default function XPDetailSheet({ xp, level, achievements, bestStreak, historicalLogs, totalCompletions, onClose }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTouchStart = (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const d = e.touches[0].clientY - dragStartY.current;
    if (d > 0) setDragY(d);
  };
  const onTouchEnd = () => {
    if (dragY > 80) dismiss(); else setDragY(0);
    dragStartY.current = null;
  };

  // ── XP math ─────────────────────────────────────────────────────────────────
  const xpInto  = xpIntoLevel(xp);
  const xpSpan  = xpSpanOfLevel(xp);
  const xpToNext = xpSpan - xpInto;
  const pct     = xpSpan > 0 ? Math.min(100, Math.round((xpInto / xpSpan) * 100)) : 100;
  const nextLv  = level + 1;

  // SVG ring
  const R = 46, sw = 7, rs = (R + sw) * 2;
  const circ = 2 * Math.PI * R;
  const dash  = circ * (1 - pct / 100);

  // ── Weekly breakdown ─────────────────────────────────────────────────────────
  const today      = new Date();
  const todayKey   = today.toISOString().split("T")[0];
  const dow        = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysFromMon + i);
    const key      = d.toISOString().split("T")[0];
    const isFuture = key > todayKey;
    const comps    = isFuture ? 0 : historicalLogs.filter((l) => l.completed_at.split("T")[0] === key).length;
    return { label: ["M","T","W","T","F","S","S"][i], isFuture, xp: comps * 10 };
  });

  const maxDayXP    = Math.max(...weekDays.map((d) => d.xp), 1);
  const totalWeekXP = weekDays.reduce((s, d) => s + d.xp, 0);
  const activeDays  = weekDays.filter((d) => !d.isFuture && d.xp > 0).length || 1;
  const daysToUp    = xpToNext > 0 && activeDays > 0
    ? Math.ceil(xpToNext / (totalWeekXP / activeDays))
    : null;

  const unlock    = LEVEL_UNLOCKS[nextLv] ?? null;
  const recentAch = [...achievements].reverse().slice(0, 3);

  if (!visible) return null;

  return (
    <CenteredModal onClose={dismiss}>
      <div
        className="modal-center-enter w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(160deg,#140e22 0%,#0c0c18 60%,#0a0a14 100%)",
          border: "1px solid rgba(139,92,246,0.28)",
          boxShadow: "0 24px 70px rgba(109,40,217,0.28)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-1 flex-shrink-0">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">XP & Level</p>
            <h2 className="text-xl font-black text-white mt-0.5">{levelEmoji(level)} Lv {level} · {levelName(level)}</h2>
          </div>
          <button
            onClick={dismiss}
            className="mt-1 w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-8 space-y-5 flex-1">

          {/* Ring + stats */}
          <div className="flex items-center gap-5 pt-2">
            <div className="relative flex-shrink-0" style={{ width: rs, height: rs }}>
              <svg width={rs} height={rs} style={{ transform: "rotate(-90deg)" }}>
                <defs>
                  <linearGradient id="xpShtGrd" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#e879f9" />
                  </linearGradient>
                </defs>
                <circle cx={rs/2} cy={rs/2} r={R} fill="none" stroke="rgba(109,40,217,0.15)" strokeWidth={sw} />
                <circle
                  cx={rs/2} cy={rs/2} r={R}
                  fill="none"
                  stroke="url(#xpShtGrd)"
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={visible ? dash : circ}
                  style={{
                    transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
                    filter: "drop-shadow(0 0 8px rgba(139,92,246,0.55))",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white leading-none">{pct}%</span>
                <span className="text-[10px] text-slate-500 mt-0.5">to Lv {nextLv}</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">XP Progress</p>
                <p className="text-base font-bold text-white mt-0.5 tabular-nums">{xpInto.toLocaleString()} / {xpSpan.toLocaleString()} XP</p>
                <p className="text-xs text-violet-400">{xpToNext.toLocaleString()} XP to Lv {nextLv}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">All-Time XP</p>
                <p className="text-xl font-black text-amber-400 leading-none mt-0.5 tabular-nums">{xp.toLocaleString()}</p>
              </div>
              {daysToUp !== null && daysToUp < 365 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Target className="w-3 h-3 text-violet-400 flex-shrink-0" />
                  ~{daysToUp} day{daysToUp !== 1 ? "s" : ""} to Lv {nextLv}
                </div>
              )}
            </div>
          </div>

          {/* Next unlock */}
          {unlock && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-violet-950/50 to-purple-950/30 border border-violet-700/30 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-violet-900/60 border border-violet-700/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-violet-400/70 uppercase tracking-wider font-semibold">Next unlock at Level {nextLv}</p>
                <p className="text-sm font-bold text-white mt-0.5">{unlock}</p>
              </div>
            </div>
          )}

          {/* Streak → calendar link */}
          <button
            onClick={() => { dismiss(); setTimeout(() => router.push("/calendar"), 320); }}
            className="w-full flex items-center gap-3 bg-orange-950/20 border border-orange-800/20 rounded-2xl px-4 py-3 hover:border-orange-600/40 hover:bg-orange-950/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-900/40 border border-orange-700/20 flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Current Streak</p>
              <p className="text-sm font-bold text-orange-400 mt-0.5">{bestStreak} day{bestStreak !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>View calendar</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Weekly XP breakdown */}
          <div className="bg-slate-900/30 border border-slate-800/30 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-300">XP This Week</p>
              <p className="text-xs font-bold text-violet-400 tabular-nums">+{totalWeekXP} XP</p>
            </div>
            <div className="space-y-2">
              {weekDays.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium w-7 flex-shrink-0 ${d.isFuture ? "text-slate-700" : "text-slate-500"}`}>{d.label}</span>
                  <div className="flex-1 h-1.5 bg-violet-950/40 rounded-full overflow-hidden">
                    {!d.isFuture && d.xp > 0 && (
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                        style={{ width: `${Math.round((d.xp / maxDayXP) * 100)}%`, transition: "width 0.8s ease" }}
                      />
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold w-14 text-right flex-shrink-0 tabular-nums ${d.isFuture ? "text-slate-700" : d.xp > 0 ? "text-violet-400" : "text-slate-700"}`}>
                    {d.isFuture ? "—" : d.xp > 0 ? `+${d.xp}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent achievements */}
          {recentAch.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Achievements</p>
              <div className="space-y-2">
                {recentAch.map((id) => {
                  const m = ACHIEVEMENT_META[id];
                  if (!m) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 bg-slate-900/40 border border-slate-800/40 rounded-xl px-3 py-2.5">
                      <span className="text-xl leading-none">{m.emoji}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{m.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total completions */}
          <div className="flex items-center justify-between bg-slate-900/20 rounded-xl px-4 py-3 border border-slate-800/30">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total Completions</p>
              <p className="text-sm font-bold text-white mt-0.5 tabular-nums">{totalCompletions.toLocaleString()} habits completed</p>
            </div>
            <span className="text-2xl leading-none">🎯</span>
          </div>

          {/* How XP works */}
          <div className="border-t border-slate-800/40 pt-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-2.5">How XP Works</p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {([
                { icon: "✅", label: "Valid habit",  xp: "+10 XP" },
                { icon: "⚠️", label: "Partial",      xp: "+5 XP"  },
                { icon: "🎰", label: "Lucky bonus",   xp: "+20 XP" },
              ] as const).map((r) => (
                <div key={r.label} className="bg-slate-900/40 rounded-xl py-2.5 px-1 border border-slate-800/30">
                  <span className="text-base leading-none">{r.icon}</span>
                  <p className="text-[9px] text-slate-600 mt-1">{r.label}</p>
                  <p className="text-[10px] font-bold text-violet-400 mt-0.5">{r.xp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CenteredModal>
  );
}
