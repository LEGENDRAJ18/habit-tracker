"use client";

import { useState } from "react";
import { Trash2, Check, Flame, Snowflake } from "lucide-react";
import type { Habit } from "@/types";

interface Props {
  habit: Habit;
  completed: boolean;
  streak: number;
  isProtected?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

// Eight evenly-spaced directions for the particle burst
const PARTICLE_DIRS = [
  { x:  0,   y: -30 },
  { x:  21,  y: -21 },
  { x:  30,  y:  0  },
  { x:  21,  y:  21 },
  { x:  0,   y:  30 },
  { x: -21,  y:  21 },
  { x: -30,  y:  0  },
  { x: -21,  y: -21 },
];

const PARTICLE_COLORS = [
  "#8b5cf6","#a78bfa","#e879f9","#fbbf24","#60a5fa",
  "#34d399","#fb923c","#f472b6",
];

export default function HabitCard({ habit, completed, streak, isProtected, onToggle, onDelete }: Props) {
  const [toggling, setToggling]           = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleToggle = async () => {
    if (!completed) {
      // Trigger animations only when going incomplete → complete
      setShowParticles(true);
      setJustCompleted(true);
      setTimeout(() => { setShowParticles(false); setJustCompleted(false); }, 700);
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

  // ── Streak styling ──────────────────────────────────────────────────────
  const hasStreak = streak > 0;
  const bigStreak = streak >= 30;
  const midStreak = streak >= 7;

  const flameClass = bigStreak
    ? "w-5 h-5 text-orange-400"
    : midStreak
    ? "w-4 h-4 text-orange-400"
    : "w-3.5 h-3.5 text-orange-400/60";

  const flameAnimation = bigStreak
    ? { animation: "streakGlow 1.4s ease-in-out infinite" }
    : midStreak
    ? { animation: "streakPulse 2s ease-in-out infinite" }
    : {};

  const streakTextClass = bigStreak
    ? "text-sm font-bold text-orange-400"
    : midStreak
    ? "text-xs font-semibold text-orange-400"
    : "text-xs text-orange-400/50";

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-300 ${
        completed
          ? "bg-violet-600/8 border-violet-600/20"
          : "bg-[#0f0f1a] border-violet-900/20 hover:border-violet-800/30"
      } ${deleting ? "opacity-50 pointer-events-none" : ""}`}
      style={justCompleted ? { animation: "cardNudge 0.35s ease-out both" } : undefined}
    >
      {/* ── Checkbox + particle burst ─────────────────────────────────── */}
      <div className="relative flex-shrink-0">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
            completed
              ? "bg-violet-500 border-violet-500 shadow-lg shadow-violet-500/30"
              : "border-violet-700/50 hover:border-violet-500"
          } ${toggling ? "opacity-60" : ""}`}
          style={
            justCompleted && completed
              ? { animation: "checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }
              : undefined
          }
        >
          {completed && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </button>

        {/* Particle burst */}
        {showParticles && PARTICLE_DIRS.map((dir, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{
              width: 5 + (i % 3),
              height: 5 + (i % 3),
              backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              "--tx": `${dir.x}px`,
              "--ty": `${dir.y}px`,
              animation: `particleFly 0.6s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 18}ms both`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Habit name + description ─────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate transition-all duration-300 ${
            completed ? "text-slate-500 line-through translate-x-1" : "text-slate-100"
          }`}
        >
          {habit.name}
        </p>
        {habit.description && (
          <p className={`text-xs truncate mt-0.5 transition-colors duration-300 ${
            completed ? "text-slate-700" : "text-slate-600"
          }`}>
            {habit.description}
          </p>
        )}
      </div>

      {/* ── Frequency badge ──────────────────────────────────────────── */}
      <span
        className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs border flex-shrink-0 ${
          habit.frequency === "daily"
            ? "bg-violet-950/50 border-violet-800/30 text-violet-400"
            : "bg-blue-950/50 border-blue-800/30 text-blue-400"
        }`}
      >
        {habit.frequency}
      </span>

      {/* ── Streak counter ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isProtected && (
          <Snowflake className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        )}
        <Flame className={flameClass} style={flameAnimation} />
        <span className={streakTextClass}>
          {hasStreak ? streak : "—"}
        </span>
      </div>

      {/* ── Delete ───────────────────────────────────────────────────── */}
      <button
        onClick={handleDelete}
        className={`flex-shrink-0 transition-all p-1 rounded-lg ${
          confirmDelete
            ? "text-red-400 bg-red-950/40"
            : "text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100"
        }`}
        title={confirmDelete ? "Click again to confirm" : "Delete habit"}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
