"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type TimerPhase = "focus" | "short_break" | "long_break";

export interface FocusTimerState {
  remaining: number;   // seconds remaining
  total: number;       // total seconds for current phase
  elapsed: number;     // seconds elapsed in current phase
  phase: TimerPhase;
  round: number;       // 1-based (Pomodoro: 1–4)
  totalRounds: number; // 4 for Pomodoro
  isPaused: boolean;
  isRunning: boolean;
  isComplete: boolean;
  isGivenUp: boolean;
}

const POMODORO_FOCUS_MIN  = 25;
const POMODORO_SHORT_MIN  = 5;
const POMODORO_LONG_MIN   = 15;
const POMODORO_ROUNDS     = 4;

function phaseDuration(phase: TimerPhase, durationMinutes: number, isPomodoroMode: boolean): number {
  if (!isPomodoroMode) return durationMinutes * 60;
  if (phase === "focus")       return POMODORO_FOCUS_MIN * 60;
  if (phase === "short_break") return POMODORO_SHORT_MIN * 60;
  return POMODORO_LONG_MIN * 60;
}

export function useFocusTimer(durationMinutes: number, isPomodoroMode: boolean) {
  const total = phaseDuration("focus", durationMinutes, isPomodoroMode);

  const [state, setState] = useState<FocusTimerState>({
    remaining:   total,
    total,
    elapsed:     0,
    phase:       "focus",
    round:       1,
    totalRounds: isPomodoroMode ? POMODORO_ROUNDS : 1,
    isPaused:    false,
    isRunning:   false,
    isComplete:  false,
    isGivenUp:   false,
  });

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef     = useRef(state);
  stateRef.current   = state;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Advance one tick (called every second)
  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.isPaused || !prev.isRunning || prev.isComplete || prev.isGivenUp) return prev;

      const newRemaining = prev.remaining - 1;
      const newElapsed   = prev.elapsed   + 1;

      if (newRemaining > 0) {
        return { ...prev, remaining: newRemaining, elapsed: newElapsed };
      }

      // Phase ended
      if (!isPomodoroMode) {
        // Regular mode — done!
        return { ...prev, remaining: 0, elapsed: newElapsed, isComplete: true, isRunning: false };
      }

      // Pomodoro — transition to next phase / round
      if (prev.phase === "focus") {
        if (prev.round >= POMODORO_ROUNDS) {
          // Final round done — all complete
          return { ...prev, remaining: 0, elapsed: newElapsed, isComplete: true, isRunning: false };
        }
        // Between rounds: short break (or long after round 3 in a variant, but canonical is: long after 4)
        // After round 3 → short break; after round 4 → done (handled above)
        const breakPhase: TimerPhase = "short_break";
        const breakTotal = phaseDuration(breakPhase, durationMinutes, isPomodoroMode);
        return {
          ...prev,
          remaining:   breakTotal,
          total:       breakTotal,
          elapsed:     0,
          phase:       breakPhase,
          isRunning:   true,
        };
      }

      // Break ended → next focus round
      const nextRound  = prev.round + 1;
      const nextTotal  = phaseDuration("focus", durationMinutes, isPomodoroMode);
      return {
        ...prev,
        remaining:   nextTotal,
        total:       nextTotal,
        elapsed:     0,
        phase:       "focus",
        round:       nextRound,
        isRunning:   true,
      };
    });
  }, [isPomodoroMode, durationMinutes]);

  // Manage interval based on isRunning / isPaused
  useEffect(() => {
    if (state.isRunning && !state.isPaused && !state.isComplete && !state.isGivenUp) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(tick, 1000);
      }
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [state.isRunning, state.isPaused, state.isComplete, state.isGivenUp, tick, clearTimer]);

  const start = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const addTime = useCallback((extraMinutes: number) => {
    setState((prev) => ({
      ...prev,
      remaining: prev.remaining + extraMinutes * 60,
      total:     prev.total    + extraMinutes * 60,
    }));
  }, []);

  const giveUp = useCallback(() => {
    clearTimer();
    setState((prev) => ({ ...prev, isRunning: false, isGivenUp: true }));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    const newTotal = phaseDuration("focus", durationMinutes, isPomodoroMode);
    setState({
      remaining:   newTotal,
      total:       newTotal,
      elapsed:     0,
      phase:       "focus",
      round:       1,
      totalRounds: isPomodoroMode ? POMODORO_ROUNDS : 1,
      isPaused:    false,
      isRunning:   false,
      isComplete:  false,
      isGivenUp:   false,
    });
  }, [clearTimer, durationMinutes, isPomodoroMode]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { state, start, pause, resume, addTime, giveUp, reset };
}
