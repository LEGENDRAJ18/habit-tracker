"use client";

import { useState, useEffect, useRef } from "react";

export type ValidationStatus = "idle" | "validating" | "good" | "warning" | "blocked";

export interface HabitValidation {
  status: ValidationStatus;
  message: string;
  suggestion?: string;
}

const IDLE: HabitValidation = { status: "idle", message: "" };

export interface HabitSelections {
  /** A duration has been chosen via the form's duration picker (not just typed into the name) */
  hasDuration?: boolean;
  /** A time of day has been chosen via the form's "When?" picker */
  hasWhen?: boolean;
}

export function useHabitValidation(
  habitName: string, goals?: string[], debounceMs = 400, calendarContext = false,
  selections?: HabitSelections,
): HabitValidation {
  const [result, setResult] = useState<HabitValidation>(IDLE);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueried   = useRef("");
  const abortRef      = useRef<AbortController | null>(null);

  const hasDuration = selections?.hasDuration ?? false;
  const hasWhen     = selections?.hasWhen ?? false;

  useEffect(() => {
    const trimmed = habitName.trim();
    // Selections are part of the query identity — changing them must re-validate
    // even when the name text itself didn't change.
    const queryKey = `${trimmed}|${hasDuration ? 1 : 0}|${hasWhen ? 1 : 0}`;

    if (trimmed.length < 4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(IDLE);
      lastQueried.current = "";
      return;
    }

    // Already have a result for this exact text + selections — keep it
    if (queryKey === lastQueried.current) return;

    // Cancel pending debounce and any in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult({ status: "validating", message: "" });

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/validate-habit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            habitName: trimmed, goals,
            calendarContext: calendarContext || undefined,
            hasDuration: hasDuration || undefined,
            hasWhen: hasWhen || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) { setResult(IDLE); return; }

        const data = await res.json() as HabitValidation;
        lastQueried.current = queryKey;
        // Treat an empty message as idle (server silently passed rate-limit)
        setResult(data.message ? data : IDLE);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResult(IDLE);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitName, goals?.join(","), debounceMs, calendarContext, hasDuration, hasWhen]);

  return result;
}
