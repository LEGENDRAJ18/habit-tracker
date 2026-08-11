"use client";

import { useState, useEffect, useRef } from "react";

export type GoalValidationStatus = "idle" | "validating" | "good" | "too_vague" | "not_a_goal";

export interface GoalValidation {
  status: GoalValidationStatus;
  message: string;
}

const IDLE: GoalValidation = { status: "idle", message: "" };

// Same debounce/abort/dedupe shape as useHabitValidation — separate hook
// because the endpoint, request shape, and status vocabulary are different
// (a goal description isn't a habit name).
export function useGoalValidation(goalText: string, debounceMs = 700): GoalValidation {
  const [result, setResult] = useState<GoalValidation>(IDLE);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueried = useRef("");
  const abortRef     = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = goalText.trim();

    if (trimmed.length < 5) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(IDLE);
      lastQueried.current = "";
      return;
    }

    // Already have a result for this exact text — keep it
    if (trimmed === lastQueried.current) return;

    // Cancel pending debounce and any in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult({ status: "validating", message: "" });

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/goal-program/validate-goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalText: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok) { setResult(IDLE); return; }

        const data = await res.json() as GoalValidation;
        lastQueried.current = trimmed;
        setResult(data.message ? data : IDLE);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[useGoalValidation] request failed", err);
          setResult(IDLE);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalText, debounceMs]);

  return result;
}
