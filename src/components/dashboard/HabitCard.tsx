"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Check, Flame, Snowflake, ArrowRight, Pencil, X, Loader2, Zap, Globe } from "lucide-react";
import type { Habit, Plan } from "@/types";
import { useIdentityScore } from "@/hooks/useIdentityScore";
import VoiceCheckin from "./VoiceCheckin";
import { toast } from "@/components/ui/Toast";
import { DURATION_BONUS_XP } from "@/lib/xp";

interface Props {
  habit: Habit;
  completed: boolean;
  streak: number;
  strength: number;
  isProtected?: boolean;
  stackAfterName?: string;
  isEditing?: boolean;
  tier?: Plan;
  allLogs?: Array<{ habit_id: string; completed_at: string }>;
  onToggle: () => void;
  onDelete: () => void;
  onCompleted?: () => void;
  onRename?: (newName: string, validityScore: "valid" | "partial" | "invalid") => Promise<void>;
  onSmartTimingToggle?: (enabled: boolean) => Promise<void>;
  onUpgradePro?: () => void;
  onCommitment?: () => void;
  onStartTimer?: () => void;
  isTourTarget?: boolean;
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
  habit, completed, streak, strength, isProtected, stackAfterName, isEditing,
  tier, allLogs = [], onToggle, onDelete, onCompleted, onRename, onSmartTimingToggle, onUpgradePro,
  onCommitment, onStartTimer, isTourTarget,
}: Props) {
  const { score: identityScore, phrase: identityPhrase } = useIdentityScore(habit, allLogs);
  const [deleting, setDeleting]     = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showXPFloat, setShowXPFloat] = useState(false);
  const [xpFloatKey, setXPFloatKey] = useState(0);
  const [showStrTooltip, setShowStrTooltip] = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [editName, setEditName]         = useState(habit.name);
  const [editReminderTime, setEditReminderTime] = useState(habit.preferred_reminder_time ?? "");
  const [editSaving, setEditSaving]     = useState(false);
  const [smartToggling, setSmartToggling] = useState(false);
  const [swipeX, setSwipeX]         = useState(0);
  const swipeXRef   = useRef(0);
  const touchRef    = useRef({ startX: 0, startY: 0, locked: false });

  useEffect(() => {
    if (isEditing) { setEditName(habit.name); setEditMode(true); }
  }, [isEditing, habit.name]);

  const handleRename = async () => {
    if (!onRename) return;
    const trimmed = editName.trim();
    const nameChanged     = trimmed && trimmed !== habit.name;
    const reminderChanged = editReminderTime !== (habit.preferred_reminder_time ?? "");

    if (!trimmed) { setEditMode(false); return; }
    setEditSaving(true);
    try {
      if (nameChanged) {
        let validityScore: "valid" | "partial" | "invalid" = "valid";
        try {
          const res = await fetch("/api/validate-habit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ habitName: trimmed }),
          });
          if (res.ok) {
            const data = await res.json() as { status: "good" | "warning" | "blocked" };
            validityScore = data.status === "warning" ? "partial" : data.status === "blocked" ? "invalid" : "valid";
          }
        } catch { /* silently use "valid" on network error */ }
        await onRename(trimmed, validityScore);
      }

      // Save reminder time change (separate fetch — lightweight)
      if (reminderChanged) {
        const remRes = await fetch(`/api/habits/${habit.id}/reminder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reminder_time: editReminderTime || null }),
        });
        if (!remRes.ok) {
          toast("Couldn't save reminder time — please try again.", "error");
        }
      }

      setEditMode(false);
    } finally {
      setEditSaving(false);
    }
  };

  const validity = habit.validity_score;

  const xpAmount = (() => {
    const base = validity === "invalid" ? 0 : validity === "partial" ? 5 : 10;
    const bonus = habit.how_long ? (DURATION_BONUS_XP[habit.how_long] ?? 0) : 0;
    return base + bonus;
  })();

  const handleToggle = () => {
    if (!completed) {
      setShowParticles(true);
      setJustCompleted(true);
      setShowXPFloat(true);
      setXPFloatKey((k) => k + 1);
      setTimeout(() => { setShowParticles(false); setJustCompleted(false); }, 700);
      setTimeout(() => setShowXPFloat(false), 1200);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      onCompleted?.();
    }
    // Optimistic — fire and forget; parent handles revert on error
    void onToggle();
  };

  const handleDelete = () => {
    setDeleting(true);
    onDelete();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (editMode) return;
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: false };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (editMode) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    if (!touchRef.current.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      touchRef.current.locked = true;
    }
    const clamped = Math.max(-100, Math.min(100, dx));
    swipeXRef.current = clamped;
    setSwipeX(clamped);
  };

  const handleTouchEnd = () => {
    if (editMode) return;
    const sx = swipeXRef.current;
    if (sx < -72) handleDelete();
    else if (sx > 72 && !completed) handleToggle();
    swipeXRef.current = 0;
    setSwipeX(0);
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
    <div className={`relative overflow-hidden rounded-xl ${deleting ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Swipe-left (delete) backdrop */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 bg-red-950/90 pointer-events-none rounded-xl"
        style={{ opacity: swipeX < -15 ? Math.min(1, (Math.abs(swipeX) - 15) / 55) : 0 }}
      >
        <Trash2 className="w-5 h-5 text-red-400" />
      </div>
      {/* Swipe-right (complete) backdrop */}
      {!completed && (
        <div
          className="absolute inset-0 flex items-center pl-5 bg-emerald-950/90 pointer-events-none rounded-xl"
          style={{ opacity: swipeX > 15 ? Math.min(1, (swipeX - 15) / 55) : 0 }}
        >
          <Check className="w-5 h-5 text-emerald-400" />
        </div>
      )}
    <div
      className={`group rounded-xl border transition-all duration-200 touch-pan-y ${
        completed
          ? "bg-violet-600/8 border-violet-600/20"
          : "bg-[#0f0f1a] border-violet-900/20 sm:hover:border-violet-800/30 sm:hover:-translate-y-px sm:hover:shadow-[0_4px_20px_rgba(109,40,217,0.10)]"
      }`}
      style={{
        ...(swipeX !== 0 ? { transform: `translateX(${swipeX}px)`, transition: "none" } : { transition: "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)" }),
        ...(justCompleted ? { animation: "cardNudge 0.35s ease-out both" } : {}),
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
        <div className="relative flex-shrink-0" {...(isTourTarget ? { "data-tour": "first-habit-checkbox" } : {})}>
          <button onClick={handleToggle}
            className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
              completed ? "bg-violet-500 border-violet-500 shadow-lg shadow-violet-500/30" : "border-violet-700/50 hover:border-violet-500"
            }`}
            style={justCompleted && completed ? { animation: "checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" } : undefined}
          >
            {completed && <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" strokeWidth={3} />}
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
          {showXPFloat && xpAmount > 0 && (
            <div
              key={xpFloatKey}
              className="absolute pointer-events-none select-none"
              style={{ top: "-4px", left: "50%", zIndex: 60, animation: "xpFloat 1.1s ease-out forwards" }}
            >
              <span style={{
                display: "block", transform: "translateX(-50%)",
                fontSize: "10px", fontWeight: 800,
                color: "#a78bfa",
                textShadow: "0 0 10px rgba(167,139,250,0.8)",
                whiteSpace: "nowrap",
              }}>
                +{xpAmount} XP
              </span>
            </div>
          )}
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          {editMode && onRename ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="flex-1 min-w-0 bg-violet-950/40 border border-violet-700/50 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-violet-500/70"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") { setEditMode(false); setEditName(habit.name); setEditReminderTime(habit.preferred_reminder_time ?? ""); }
                  }}
                />
                <button
                  onClick={handleRename}
                  disabled={editSaving}
                  className="flex-shrink-0 p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                  title="Save"
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setEditMode(false); setEditName(habit.name); setEditReminderTime(habit.preferred_reminder_time ?? ""); }}
                  className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Reminder time inline edit */}
              <div className="flex items-center gap-1.5 pl-0.5">
                <span className="text-[10px] text-slate-600">🔔 Remind at</span>
                <input
                  type="time"
                  value={editReminderTime}
                  onChange={(e) => setEditReminderTime(e.target.value)}
                  className="bg-violet-950/40 border border-violet-700/30 rounded-lg px-1.5 py-0.5 text-[11px] text-white outline-none focus:border-violet-500/70 [color-scheme:dark]"
                />
                {editReminderTime && (
                  <button
                    type="button"
                    onClick={() => setEditReminderTime("")}
                    className="text-[10px] text-slate-600 hover:text-slate-400"
                    title="Clear reminder"
                  >
                    clear
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {getTimeEmoji(habit.when_time) && !completed && (
                <span className="text-sm leading-none flex-shrink-0">{getTimeEmoji(habit.when_time)}</span>
              )}
              <p className={`text-sm font-medium truncate transition-all duration-300 ${
                completed ? "text-slate-500 line-through" : "text-slate-100"
              }`}>
                {habit.name}
              </p>
              {!completed && onRename && (validity === "partial" || validity === "invalid") && (
                <button
                  onClick={() => { setEditName(habit.name); setEditMode(true); }}
                  className="flex-shrink-0 p-0.5 text-violet-600/60 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Edit habit name"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {!editMode && habit.description && (
            <p className={`text-xs truncate mt-0.5 transition-colors duration-300 ${completed ? "text-slate-700" : "text-slate-600"}`}>
              {habit.description}
            </p>
          )}

          {/* Public commitment badge */}
          {!editMode && habit.is_public && (
            <button
              onClick={onCommitment}
              className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400/70 hover:text-emerald-300 transition-colors"
              title="Public commitment"
            >
              <Globe className="w-2.5 h-2.5" /> Public
            </button>
          )}

          {!editMode && !completed && validity && validity !== "valid" && (
            <span className={`inline-flex items-center gap-1 text-[10px] border px-1.5 py-0.5 rounded-full mt-0.5 ${
              validity === "partial"
                ? "bg-amber-950/40 border-amber-600/30 text-amber-400"
                : "bg-red-950/40 border-red-600/30 text-red-400"
            }`}>
              {validity === "partial" ? "⚠️ 5 XP/completion — edit to earn 10" : "❌ 0 XP — rename to start earning"}
            </span>
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
        <div
          className="flex items-center gap-1 flex-shrink-0"
          {...(isTourTarget ? { "data-tour": "first-habit-streak" } : {})}
        >
          {isProtected && <Snowflake className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
          <Flame className={flameClass} style={flameAnimation} />
          <span className={streakTextClass}>{hasStreak ? streak : "—"}</span>
        </div>

        {/* Delete */}
        <button onClick={handleDelete}
          className="flex-shrink-0 transition-all p-1 rounded-lg text-slate-700 hover:text-red-400 opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
          title="Delete habit"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Focus Timer button — shown when habit has a duration set */}
      {habit.duration_minutes && onStartTimer && !editMode && (
        <div className="px-4 pb-2.5 flex items-center gap-2">
          <button
            onClick={onStartTimer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              completed
                ? "border-violet-800/20 bg-violet-950/10 text-violet-500/60 cursor-default"
                : "border-violet-700/40 bg-violet-950/30 text-violet-300 hover:bg-violet-950/50 hover:border-violet-600/50 hover:text-violet-200 active:scale-95"
            }`}
            title={completed ? "Already completed today" : `Start ${habit.duration_minutes}-min focus session`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
            </svg>
            {habit.duration_minutes} min focus
          </button>
          {tier === "pro" && (
            <span className="text-[10px] text-amber-400/60 font-medium">🍅 Pomodoro</span>
          )}
        </div>
      )}

      {/* Implementation intentions — desktop only */}
      {(habit.when_time || habit.where_location || habit.how_long || habit.preferred_reminder_time) && (
        <div className="hidden sm:flex items-center gap-2.5 px-4 pb-1.5 flex-wrap">
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
          {habit.preferred_reminder_time && !habit.smart_timing && (
            <span className="text-[11px] text-violet-500/70 flex items-center gap-1">
              <span>🔔</span>{formatTime(habit.preferred_reminder_time)}
            </span>
          )}
        </div>
      )}

      {/* Smart timing toggle — Pro only, desktop only to keep mobile cards clean */}
      {tier === "pro" && onSmartTimingToggle && (
        <div className="hidden sm:flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-1.5">
            <Zap className={`w-3 h-3 flex-shrink-0 ${habit.smart_timing ? "text-amber-400" : "text-slate-600"}`} />
            <span className={`text-[10px] font-medium ${habit.smart_timing ? "text-amber-300" : "text-slate-600"}`}>
              Smart timing
            </span>
            {habit.smart_timing && habit.preferred_reminder_time && (
              <span className="text-[10px] text-slate-600">
                · {(() => {
                  const [h] = habit.preferred_reminder_time.split(":").map(Number);
                  return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
                })()}
              </span>
            )}
          </div>
          <button
            onClick={async () => {
              if (smartToggling) return;
              setSmartToggling(true);
              await onSmartTimingToggle(!habit.smart_timing);
              setSmartToggling(false);
            }}
            className={`relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0 ${
              habit.smart_timing ? "bg-amber-500" : "bg-slate-700"
            } ${smartToggling ? "opacity-60" : ""}`}
            title="Toggle smart timing"
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
                habit.smart_timing ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      {/* Voice Check-in — Pro feature */}
      <div className="px-4">
        <VoiceCheckin
          habitId={habit.id}
          habitName={habit.name}
          habitLogId={null}
          tier={tier ?? "free"}
        />
      </div>

      {/* Identity Score + Habit Strength — desktop only */}
      <div className="hidden sm:block px-4 pb-3">
        {/* Identity Score */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-violet-400/60 font-medium truncate max-w-[70%]">{identityPhrase}</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1 bg-violet-950/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                style={{ width: `${identityScore}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-violet-400">{identityScore}%</span>
          </div>
        </div>
        {/* Strength bar */}
        <div
          className="relative"
          onMouseEnter={() => setShowStrTooltip(true)}
          onMouseLeave={() => setShowStrTooltip(false)}
        >
          <div className="w-full h-1 bg-violet-950/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${strengthColor(strength)}`}
              style={{ width: `${strength}%` }}
            />
          </div>
          <div className={`flex items-center justify-between mt-0.5 transition-opacity duration-150 ${showStrTooltip ? "opacity-100" : "opacity-0"}`}>
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
    </div>
  );
}
