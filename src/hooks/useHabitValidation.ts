"use client";

import { useState, useEffect, useRef } from "react";

export type ValidationStatus = "idle" | "validating" | "good" | "warning" | "blocked";

export interface HabitValidation {
  status: ValidationStatus;
  message: string;
  suggestion?: string;
}

const IDLE: HabitValidation = { status: "idle", message: "" };

export function useHabitValidation(habitName: string, debounceMs = 800): HabitValidation {
  const [result, setResult] = useState<HabitValidation>(IDLE);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueried   = useRef("");
  const abortRef      = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = habitName.trim();

    if (trimmed.length < 4) {
      setResult(IDLE);
      lastQueried.current = "";
      return;
    }

    // Already have a result for exactly this text — keep it
    if (trimmed === lastQueried.current) return;

    // Cancel pending debounce and any in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    setResult({ status: "validating", message: "" });

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/validate-habit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitName: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok) { setResult(IDLE); return; }

        const data = await res.json() as HabitValidation;
        lastQueried.current = trimmed;
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
  }, [habitName, debounceMs]);

  return result;
}
