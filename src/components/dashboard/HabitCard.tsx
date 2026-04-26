"use client";

import { useState } from "react";
import { Trash2, Check, Flame, Snowflake, ArrowRight } from "lucide-react";
import type { Habit } from "@/types";

interface Props {
  habit: Habit;
  completed: boolean;
  streak: number;
  strength: number;
  isProtected?: boolean;
  stackAfterName?: string;
  onToggle: () => void;
  onDelete: () => void;
  onCompleted?: () => void;
}

const PARTICLE_DIRS = [
  { x:  0,   y: -30 }, { x:  21,  y: -21 }, { x:  30,  y:  0  }, { x:  21,  y:  21 },
  { x:  0,   y:  30 }, { x: -21,  y:  21 }, { x: -30,  y:  0  }, { x: -21,  y: -21 },
];

const PARTICLE_COLORS = [
  "#8b5cf6","#a78bfa","#e879f9","#fbbf24","#60a5fa","#34d399","#fb923c","#f472b6",
];

function strengthColor(s: number): string {
  if (s > 90) return "bg-gradient-to-r from-emerald-500 to-green-400";   // Automatic
  if (s > 60) return "bg-gradient-to-r from-blue-500 to-cyan-400";       // Strong
  if (s > 30) return "bg-gradient-to-r from-yellow-500 to-amber-400";    // Growing
  return "bg-gradient-to-r from-red-500 to-rose-400";                     // Building
}

function strengthLabel(s: number): string {
  if (s > 90) return "Automatic";
  if (s > 60) return "Strong";
  if (s > 30) return "Growing";
  return "Building";
}

function strengthTextColor(s: number): string {
  if (s > 90) return "text-emerald-400";
  if (s > 60) return "text-cyan-400";
  if (s > 30) return "text-amber-400";
  return "text-red-400";
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getTimeEmoji(whenTime: string | null): string | null {
  if (!whenTime) return null;
  const h = parseInt(whenTime.split(":")[0], 10);
  if (h < 12) return "🌅";
  if (h < 17) return "🌞";
  return "🌙";
}

export default function HabitCard({
  habit, completed, streak, strength, isProtected, stackAfterName,
  onToggle, onDelete, onCompleted,
}: Props) {
  const [toggling, setToggling]           = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showStrTooltip, setShowStrTooltip] = useState(false);

  const handleToggle = async () => {
    if (!completed) {
      setShowParticles(true);
      setJustCompleted(true);
      setTimeout(() => { setShowParticles(false); setJustCompleted(false); }, 700);
      onCompleted?.();
    }
    setToggling(true);
    await onToggle();
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await onDelete();
  };

  const hasStreak = streak > 0;
  const bigStreak = streak >= 30;
  const midStreak = streak >= 7;

  const flameClass = bigStreak ? "w-5 h-5 text-orange-400"
    : midStreak ? "w-4 h-4 text-orange-400" : "w-3.5 h-3.5 text-orange-400/60";
  const flameAnimation = bigStreak
    ? { animation: "streakGlow 1.4s ease-in-out infinite" }
    : midStreak ? { animation: "streakPulse 2s ease-in-out infinite" } : {};
  const streakTextClass = bigStreak ? "text-sm font-bold text-orange-400"
    : midStreak ? "text-xs font-semibold text-orange-400" : "text-xs text-orange-400/50";

  return (
    <div
      className={`group rounded-xl border transition-all duration-300 ${
        completed ? "bg-violet-600/8 border-violet-600/20" : "bg-[#0f0f1a] border-violet-900/20 hover:border-violet-800/30"
      } ${deleting ? "opacity-50 pointer-events-none" : ""}`}
      style={justCompleted ? { animation: "cardNudge 0.35s ease-out both" } : undefined}
    >
      {/* Stack-after indicator */}
      {stackAfterName && (
        <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0">
          <ArrowRight className="w-3 h-3 text-violet-600/60 flex-shrink-0" />
          <span className="text-[10px] text-violet-600/70 font-medium truncate">After: {stackAfterName}</span>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Checkbox + particles */}
        <div className="relative flex-shrink-0">
          <button onClick={handleToggle} disabled={toggling}
            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
              completed ? "bg-violet-500 border-violet-500 shadow-lg shadow-violet-500/30" : "border-violet-700/50 hover:border-violet-500"
            } ${toggling ? "opacity-60" : ""}`}
            style={justCompleted && completed ? { animation: "checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" } : undefined}
          >
            {completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>
          {showParticles && PARTICLE_DIRS.map((dir, i) => (
            <div key={i} className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
              style={{
                width: 5 + (i % 3), height: 5 + (i % 3),
                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                "--tx": `${dir.x}px`, "--ty": `${dir.y}px`,
                animation: `particleFly 0.6s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 18}ms both`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {getTimeEmoji(habit.when_time) && !completed && (
              <span className="text-sm leading-none flex-shrink-0">{getTimeEmoji(habit.when_time)}</span>
            )}
            <p className={`text-sm font-medium truncate transition-all duration-300 ${
              completed ? "text-slate-500 line-through" : "text-slate-100"
            }`}>
              {habit.name}
            </p>
          </div>
          {habit.description && (
            <p className={`text-xs truncate mt-0.5 transition-colors duration-300 ${completed ? "text-slate-700" : "text-slate-600"}`}>
              {habit.description}
            </p>
          )}
        </div>

        {/* Frequency badge */}
        <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs border flex-shrink-0 ${
          habit.frequency === "daily"
            ? "bg-violet-950/50 border-violet-800/30 text-violet-400"
            : "bg-blue-950/50 border-blue-800/30 text-blue-400"
        }`}>
          {habit.frequency}
        </span>

        {/* Streak */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isProtected && <Snowflake className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
          <Flame className={flameClass} style={flameAnimation} />
          <span className={streakTextClass}>{hasStreak ? streak : "—"}</span>
        </div>

        {/* Delete */}
        <button onClick={handleDelete}
          className={`flex-shrink-0 transition-all p-1 rounded-lg ${
            confirmDelete ? "text-red-400 bg-red-950/40" : "text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100"
          }`}
          title={confirmDelete ? "Click again to confirm" : "Delete habit"}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Implementation intentions */}
      {(habit.when_time || habit.where_location || habit.how_long) && (
        <div className="flex items-center gap-2.5 px-4 pb-1.5 flex-wrap">
          {habit.where_location && (
            <span className="text-[11px] text-slate-600 flex items-center gap-1">
              <span>📍</span>{habit.where_location}
            </span>
          )}
          {habit.when_time && (
            <span className="text-[11px] text-slate-600 flex items-center gap-1">
              <span>⏰</span>{formatTime(habit.when_time)}
            </span>
          )}
          {habit.how_long && (
            <span className="text-[11px] text-slate-600 flex items-center gap-1">
              <span>⏱</span>{habit.how_long}
            </span>
          )}
        </div>
      )}

      {/* Habit Strength bar */}
      <div className="px-4 pb-3"
        onMouseEnter={() => setShowStrTooltip(true)}
        onMouseLeave={() => setShowStrTooltip(false)}
      >
        <div className="relative">
          <div className="w-full h-1 bg-violet-950/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${strengthColor(strength)}`}
              style={{ width: `${strength}%` }}
            />
          </div>
          <div className={`flex items-center justify-between mt-1 transition-opacity duration-150 ${showStrTooltip ? "opacity-100" : "opacity-0"}`}>
            <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider">
              Habit Strength · {strengthLabel(strength)}
            </span>
            <span className={`text-[9px] font-bold ${strengthTextColor(strength)}`}>{strength}/100</span>
          </div>
          {showStrTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-[#1a1a2e] border border-violet-800/40 rounded-xl p-3 shadow-xl z-10 pointer-events-none">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <span className={`font-semibold ${strengthTextColor(strength)}`}>
                  {strengthLabel(strength)}
                </span>{" "}
                — Habit Strength shows how automatic this habit is becoming. Missing days slows progress but never resets it.
              </p>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1a2e] border-r border-b border-violet-800/40 rotate-45" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
