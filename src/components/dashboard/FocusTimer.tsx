"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Pause, Play, Plus, Crown, RotateCcw } from "lucide-react";
import type { Habit, Plan } from "@/types";
import { useFocusTimer, type TimerPhase } from "@/hooks/useFocusTimer";
import { playSound } from "@/lib/sounds";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MSGS_EARLY  = ["Stay focused 💪","Deep work mode 🧠","Block distractions ✨","Every minute counts 💎","You're in the zone 🎯"];
const MSGS_MID    = ["Halfway there! Keep going 🔥","You're crushing it! ⚡","50% done, stay strong 🎯","Don't stop now! 💪"];
const MSGS_LATE   = ["Final push! Almost done ⚡","Last stretch — finish strong! 💥","So close! You've got this 🔥","Nearly there! 🌟"];
const MSGS_BREAK  = ["Rest and recharge 🌿","Great work! Take a breath 💚","Rest is productive too 💤","You earned this break 🌬️"];

function getMsg(progress: number, phase: TimerPhase, seed: number): string {
  if (phase !== "focus") return MSGS_BREAK[seed % MSGS_BREAK.length];
  if (progress >= 0.55)  return MSGS_EARLY[seed % MSGS_EARLY.length];
  if (progress >= 0.25)  return MSGS_MID[seed % MSGS_MID.length];
  return MSGS_LATE[seed % MSGS_LATE.length];
}

// ─── SVG progress ring ────────────────────────────────────────────────────────

const RS = 240;   // ring size px
const RW = 11;    // ring stroke width
const RR = (RS - RW) / 2;
const CIRC = 2 * Math.PI * RR;

function Ring({ progress, phase, isPro }: { progress: number; phase: TimerPhase; isPro: boolean }) {
  const isBreak = phase !== "focus";
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const offset = CIRC * (1 - clampedProgress);

  const gradId   = isBreak ? "ft-break" : isPro ? "ft-pro" : "ft-main";
  const glowColor = isBreak ? "rgba(52,211,153,0.55)" : isPro ? "rgba(251,191,36,0.55)" : "rgba(167,139,250,0.55)";

  // Tip dot position (starts at top, goes clockwise)
  const tipAngle = progress * 2 * Math.PI;
  const tipX = RS / 2 + RR * Math.sin(tipAngle);
  const tipY = RS / 2 - RR * Math.cos(tipAngle);

  return (
    <div className="relative flex-shrink-0" style={{ width: RS, height: RS }}>
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: isBreak
            ? "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)"
            : isPro
            ? "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)",
        }}
      />

      <svg width={RS} height={RS} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
        <defs>
          <linearGradient id="ft-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#7c3aed" />
            <stop offset="50%"  stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
          <linearGradient id="ft-pro" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#b45309" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="ft-break" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#065f46" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="ft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle cx={RS/2} cy={RS/2} r={RR}
          fill="none"
          stroke={isBreak ? "rgba(16,185,129,0.10)" : "rgba(109,40,217,0.12)"}
          strokeWidth={RW}
        />

        {/* Arc */}
        {clampedProgress > 0 && (
          <circle cx={RS/2} cy={RS/2} r={RR}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={RW}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            filter="url(#ft-glow)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        )}
      </svg>

      {/* Glowing tip dot */}
      {clampedProgress > 0.02 && clampedProgress < 0.99 && (
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 14, height: 14,
            background: isBreak ? "#34d399" : isPro ? "#fbbf24" : "#a78bfa",
            boxShadow: `0 0 12px 4px ${glowColor}`,
            left: tipX - 7,
            top:  tipY - 7,
            transition: "left 1s linear, top 1s linear",
          }}
        />
      )}
    </div>
  );
}

// ─── Round dots (Pomodoro) ────────────────────────────────────────────────────

function RoundDots({ round, total, isPro }: { round: number; total: number; isPro: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all duration-300"
          style={{
            background: i < round
              ? isPro ? "linear-gradient(135deg,#d97706,#fbbf24)" : "linear-gradient(135deg,#7c3aed,#e879f9)"
              : undefined,
            backgroundColor: i < round ? undefined : "rgba(109,40,217,0.2)",
            border: i === round - 1 ? `1px solid ${isPro ? "#fbbf24" : "#a78bfa"}` : "none",
            boxShadow: i === round - 1 ? `0 0 8px 2px ${isPro ? "rgba(251,191,36,0.5)" : "rgba(167,139,250,0.5)"}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ─── Celebration particles ────────────────────────────────────────────────────

const PARTICLE_COLORS = ["#8b5cf6","#e879f9","#fbbf24","#60a5fa","#34d399","#fb923c","#f472b6","#a78bfa"];

function CelebrationBurst() {
  const angles = Array.from({ length: 16 }, (_, i) => (i / 16) * 360);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {angles.map((a, i) => {
        const rad    = (a * Math.PI) / 180;
        const dist   = 80 + (i % 3) * 30;
        const tx     = Math.round(dist * Math.cos(rad));
        const ty     = Math.round(dist * Math.sin(rad));
        const color  = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        const size   = i % 2 === 0 ? 10 : 7;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size,
              background: color,
              animation: `ftBurst 1s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 35}ms both`,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              opacity: 0,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  habit: Habit;
  tier: Plan;
  isCompleted: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onComplete: () => void;
  onXP: () => void;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FocusTimer({ habit, tier, isCompleted, minimized, onMinimize, onMaximize, onComplete, onXP, onClose }: Props) {
  const durationMinutes = habit.duration_minutes ?? 25;
  const isPro           = tier === "pro";
  const isPlus          = tier === "plus" || isPro;
  const isPomodoroMode  = isPro;

  const { state, start, pause, resume, addTime, giveUp, reset } = useFocusTimer(
    durationMinutes,
    isPomodoroMode,
  );

  const [msgSeed,    setMsgSeed]    = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [sessionLogged, setSessionLogged] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [elapsedAtGiveUp, setElapsedAtGiveUp] = useState(0);

  const progress = state.total > 0 ? state.remaining / state.total : 0;
  const msgText  = getMsg(progress, state.phase, msgSeed);

  // Rotate motivational message every 30 s while running
  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;
    const id = setInterval(() => setMsgSeed((s) => s + 1), 30_000);
    return () => clearInterval(id);
  }, [state.isRunning, state.isPaused]);

  // Handle completion
  useEffect(() => {
    if (!state.isComplete || sessionLogged) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionLogged(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCelebrating(true);
    playSound("levelup");

    // Auto-mark habit complete if not already done
    if (!isCompleted) {
      onComplete();
      onXP();
    }

    // Log focus session
    const elapsed = Math.round((state.total - state.remaining + state.elapsed) / 60) || durationMinutes;
    void fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habit_id:         habit.id,
        habit_name:       habit.name,
        duration_minutes: durationMinutes,
        actual_minutes:   elapsed,
        was_completed:    true,
      }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isComplete]);

  // Handle give-up log
  useEffect(() => {
    if (!state.isGivenUp || sessionLogged) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionLogged(true);
    const actualMin = Math.max(1, Math.floor(elapsedAtGiveUp / 60));
    void fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habit_id:         habit.id,
        habit_name:       habit.name,
        duration_minutes: durationMinutes,
        actual_minutes:   actualMin,
        was_completed:    false,
      }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isGivenUp]);

  useEffect(() => {
    if (minimized) return;
    lockScroll();
    return () => unlockScroll();
  }, [minimized]);

  const handleGiveUp = () => {
    setElapsedAtGiveUp(state.elapsed);
    giveUp();
    setShowGiveUpConfirm(false);
  };

  const handleGoAgain = () => {
    setSessionLogged(false);
    setCelebrating(false);
    reset();
  };

  const phaseLabel  = state.phase === "focus" ? "FOCUS" : state.phase === "short_break" ? "SHORT BREAK" : "LONG BREAK";
  const phaseColor  = state.phase === "focus"
    ? isPro ? "text-amber-300 bg-amber-900/25 border-amber-600/30" : "text-violet-300 bg-violet-900/25 border-violet-600/30"
    : "text-emerald-300 bg-emerald-900/25 border-emerald-600/30";

  const xpEarned = (habit.validity_score === "invalid" ? 0 : habit.validity_score === "partial" ? 5 : 10);

  // ── Minimized mini-bar ───────────────────────────────────────────────────
  if (minimized) {
    if (!state.isRunning || state.isComplete || state.isGivenUp) return null;
    const elapsed = state.total - state.remaining;
    const pct = state.total > 0 ? (elapsed / state.total) * 100 : 0;
    const barColor = state.phase !== "focus" ? "bg-emerald-500" : isPro ? "bg-amber-500" : "bg-violet-500";
    return (
      <button
        onClick={onMaximize}
        className="fixed top-0 inset-x-0 z-[90] flex items-center gap-2.5 px-4 bg-[#0d0d1a]/95 border-b border-violet-800/30 backdrop-blur-sm"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 36px)", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <svg className="w-3 h-3 text-violet-400 flex-shrink-0 fill-current" viewBox="0 0 20 20">
          <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
        </svg>
        <span className="text-xs text-slate-400 truncate flex-1 min-w-0 text-left">{habit.name}</span>
        <span className="font-mono text-xs font-bold text-white tabular-nums flex-shrink-0">{fmt(state.remaining)}</span>
        <div className="w-20 h-1 bg-violet-950/60 rounded-full overflow-hidden flex-shrink-0">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
    );
  }

  // ── Celebration screen ────────────────────────────────────────────────────
  if (celebrating) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
        {/* CSS keyframes injected inline */}
        <style>{`
          @keyframes ftBurst {
            0%   { transform:translate(0,0) scale(1); opacity:1; }
            100% { transform:translate(var(--tx),var(--ty)) scale(0); opacity:0; }
          }
          @keyframes ftPop {
            0%   { transform:scale(0.6); opacity:0; }
            60%  { transform:scale(1.08); }
            100% { transform:scale(1); opacity:1; }
          }
          @keyframes ftSlideUp {
            from { transform:translateY(16px); opacity:0; }
            to   { transform:translateY(0);    opacity:1; }
          }
          @keyframes ftSpin {
            from { transform:rotate(0deg);   }
            to   { transform:rotate(360deg); }
          }
        `}</style>

        <div className="relative flex flex-col items-center w-full max-w-sm mx-4 gap-0">
          <CelebrationBurst />

          <div
            className="relative bg-[#0f0f1a] border border-violet-700/40 rounded-3xl px-8 py-10 text-center shadow-2xl shadow-violet-950/60 w-full"
            style={{ animation: "ftPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            {/* Gradient top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent rounded-t-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-violet-600/8 to-transparent rounded-3xl pointer-events-none" />

            <div className="relative">
              {/* Big emoji */}
              <div className="text-7xl mb-5 leading-none" style={{ animation: "ftPop 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both, opacity 0s forwards" }}>🎉</div>

              <h2 className="text-3xl font-bold text-white mb-2" style={{ animation: "ftSlideUp 0.5s 0.2s both" }}>
                Timer Complete!
              </h2>

              <p className="text-slate-400 text-sm mb-6" style={{ animation: "ftSlideUp 0.5s 0.3s both" }}>
                {isPomodoroMode
                  ? `${state.totalRounds} Pomodoro rounds finished! 🍅`
                  : `${durationMinutes} min ${habit.name} session done!`}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-7" style={{ animation: "ftSlideUp 0.5s 0.4s both" }}>
                <div className="bg-violet-950/50 border border-violet-800/30 rounded-2xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">Focus time</p>
                  <p className="text-xl font-bold text-violet-300">{durationMinutes} min</p>
                </div>
                <div className="bg-amber-950/30 border border-amber-800/30 rounded-2xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">XP earned</p>
                  <p className="text-xl font-bold text-amber-300">{xpEarned > 0 ? `+${xpEarned}` : "0"} XP</p>
                </div>
              </div>

              {/* Habit marked badge */}
              {!isCompleted && (
                <div className="flex items-center justify-center gap-2 bg-emerald-950/40 border border-emerald-700/30 rounded-xl px-4 py-2 mb-6 text-sm text-emerald-300 font-medium" style={{ animation: "ftSlideUp 0.5s 0.5s both" }}>
                  <span className="text-base leading-none">✅</span>
                  Habit marked complete
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2.5" style={{ animation: "ftSlideUp 0.5s 0.55s both" }}>
                <button
                  onClick={handleGoAgain}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40"
                  style={{ boxShadow: "0 0 24px rgba(139,92,246,0.4), 0 4px 12px rgba(109,40,217,0.3)" }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Go Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 border border-violet-800/30 text-slate-400 hover:text-white hover:border-violet-600/50 rounded-2xl text-sm transition-all font-medium"
                >
                  Done ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Give-up confirmation ──────────────────────────────────────────────────
  if (state.isGivenUp) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="bg-[#0f0f1a] border border-slate-700/40 rounded-3xl px-8 py-8 text-center max-w-xs mx-4 shadow-2xl">
          <div className="text-5xl mb-4">😔</div>
          <h3 className="text-xl font-bold text-white mb-2">Session Ended</h3>
          <p className="text-sm text-slate-400 mb-6">
            You focused for {Math.max(1, Math.floor(elapsedAtGiveUp / 60))} min — still worth it! 💪
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGoAgain}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main timer screen ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <style>{`
        @keyframes ftPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.7; }
        }
        @keyframes ftSlideIn {
          from { transform:translateY(20px); opacity:0; }
          to   { transform:translateY(0);    opacity:1; }
        }
        @keyframes ftMsgFade {
          0%   { opacity:0; transform:translateY(6px); }
          15%  { opacity:1; transform:translateY(0);   }
          85%  { opacity:1; }
          100% { opacity:0; }
        }
      `}</style>

      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[80px]"
          style={{ background: "rgba(139,92,246,0.07)" }} />
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full blur-[60px]"
          style={{ background: "rgba(232,121,249,0.05)" }} />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm mx-4 bg-[#0d0d1a] rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden"
        style={{
          animation: "ftSlideIn 0.4s cubic-bezier(0.34,1.2,0.64,1) both",
          border: "1px solid rgba(139,92,246,0.25)",
        }}
      >
        {/* Top gradient accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-6 pb-7 flex flex-col items-center gap-5">

          {/* Header row */}
          <div className="w-full flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[10px] font-semibold text-violet-400/70 uppercase tracking-wider mb-0.5">
                {state.phase !== "focus" ? "🌿 BREAK TIME" : "⚡ FOCUS SESSION"}
              </p>
              <h2 className="text-base font-bold text-white leading-snug truncate">
                {habit.name}
              </h2>
              {habit.description && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{habit.description}</p>
              )}
            </div>
            <button
              onClick={state.isRunning || state.isPaused ? onMinimize : onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-violet-950/60 transition-all flex-shrink-0"
              aria-label={state.isRunning || state.isPaused ? "Minimize timer" : "Close timer"}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Phase + round info */}
          <div className="flex flex-col items-center gap-2">
            {isPomodoroMode && (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Round {state.round} of {state.totalRounds}
                </p>
                <RoundDots round={state.round} total={state.totalRounds} isPro={isPro} />
              </div>
            )}
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${phaseColor}`}>
              {phaseLabel}
            </span>
          </div>

          {/* Ring + timer */}
          <div className="relative flex items-center justify-center">
            <Ring progress={progress} phase={state.phase} isPro={isPro} />

            {/* Center display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="font-mono font-bold leading-none text-white tabular-nums"
                style={{
                  fontSize: "3.5rem",
                  textShadow: state.phase === "focus"
                    ? isPro
                      ? "0 0 30px rgba(251,191,36,0.4), 0 0 60px rgba(245,158,11,0.2)"
                      : "0 0 30px rgba(139,92,246,0.4), 0 0 60px rgba(124,58,237,0.2)"
                    : "0 0 30px rgba(52,211,153,0.4), 0 0 60px rgba(16,185,129,0.2)",
                  animation: state.isRunning && !state.isPaused ? "ftPulse 2s ease-in-out infinite" : undefined,
                }}
              >
                {fmt(state.remaining)}
              </span>
              {/* Duration label */}
              <span className="text-[11px] text-slate-600 mt-1.5 tracking-wide">
                {state.phase === "focus"
                  ? isPomodoroMode
                    ? "Pomodoro focus"
                    : `${durationMinutes} min session`
                  : state.phase === "short_break"
                  ? "Short break"
                  : "Long break"}
              </span>
            </div>
          </div>

          {/* Motivational message */}
          <p
            key={msgSeed + state.phase + (progress < 0.55 ? "mid" : "") + (progress < 0.25 ? "late" : "")}
            className="text-sm font-medium text-center min-h-[20px]"
            style={{
              color: state.phase !== "focus" ? "#34d399" : isPro ? "#fbbf24" : "#a78bfa",
              animation: state.isRunning ? "ftMsgFade 30s ease both" : undefined,
            }}
          >
            {!state.isRunning && !state.isPaused
              ? `Ready? ${durationMinutes} min ${habit.name.toLowerCase()} 🚀`
              : state.isPaused
              ? "Paused — take a breath 😌"
              : msgText}
          </p>

          {/* Main controls */}
          {!state.isRunning && !state.isPaused ? (
            /* Not started — big Start button */
            <button
              onClick={start}
              className="w-full py-4 text-white font-bold rounded-2xl text-base transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98]"
              style={{ touchAction: "manipulation",
                background: isPro
                  ? "linear-gradient(135deg,#b45309 0%,#d97706 50%,#fbbf24 100%)"
                  : "linear-gradient(135deg,#6d28d9 0%,#8b5cf6 50%,#7c3aed 100%)",
                boxShadow: isPro
                  ? "0 0 28px rgba(217,119,6,0.45), 0 4px 16px rgba(180,83,9,0.3)"
                  : "0 0 28px rgba(139,92,246,0.45), 0 4px 16px rgba(109,40,217,0.3)",
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
              </svg>
              Start Timer
            </button>
          ) : (
            <div className="w-full flex flex-col gap-2.5">
              {/* Pause / Resume + +5 min */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={state.isPaused ? resume : pause}
                  className="py-3.5 border border-violet-700/40 hover:border-violet-500/60 bg-violet-950/30 hover:bg-violet-950/50 text-white font-semibold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {state.isPaused
                    ? <><Play  className="w-4 h-4 fill-current" />Resume</>
                    : <><Pause className="w-4 h-4 fill-current" />Pause</>
                  }
                </button>
                <button
                  onClick={() => addTime(5)}
                  className="py-3.5 border border-slate-700/40 hover:border-violet-700/40 bg-slate-900/40 hover:bg-violet-950/30 text-slate-300 hover:text-white font-semibold rounded-2xl text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />5 min
                </button>
              </div>

              {/* Give up */}
              {!showGiveUpConfirm ? (
                <button
                  onClick={() => setShowGiveUpConfirm(true)}
                  className="w-full py-2 text-slate-600 hover:text-red-400 text-xs transition-colors font-medium"
                >
                  Give Up
                </button>
              ) : (
                <div className="bg-red-950/30 border border-red-800/30 rounded-2xl p-3 text-center space-y-2">
                  <p className="text-xs text-red-300 font-medium">End this session?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowGiveUpConfirm(false)}
                      className="flex-1 py-1.5 text-xs text-slate-400 border border-slate-700/40 rounded-xl hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleGiveUp}
                      className="flex-1 py-1.5 text-xs text-red-300 bg-red-900/30 border border-red-700/40 rounded-xl hover:bg-red-900/50 transition-all font-semibold">
                      End Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pomodoro badge for non-Pro users */}
          {!isPro && tier !== "plus" && (
            <div className="w-full flex items-center gap-2 bg-amber-950/20 border border-amber-800/25 rounded-xl px-3 py-2">
              <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-[10px] text-amber-300/80">
                <span className="font-semibold">Pomodoro mode</span> — 4×25 min rounds with breaks.{" "}
                <span className="text-amber-400/60">Pro feature.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
