"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Smoothly animates a displayed number from its previous value to the new
 * target whenever the target changes. Skips animation on the initial mount
 * and for jumps larger than `skipThreshold` (avoids counting up from 0 on load).
 */
export function useCountUp(target: number, duration = 600, skipThreshold = 200): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    prevRef.current = target;

    if (start === target) return;

    // Skip animation for large jumps (initial data load)
    if (Math.abs(target - start) > skipThreshold) {
      setDisplay(target);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(start + (target - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, skipThreshold]);

  return display;
}
