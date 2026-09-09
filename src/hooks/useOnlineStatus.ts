"use client";

import { useState, useEffect } from "react";

export function useOnlineStatus(): boolean {
  // Starts true on both the server and the client's first render — reading
  // navigator.onLine directly in the initializer caused a hydration
  // mismatch (some headless/sandboxed Chromium builds report it false on
  // the very first paint even with real connectivity, same quirk noted in
  // tests/tier-gating.spec.ts), which left a stray duplicate node behind
  // during React's mismatch recovery once OfflineIndicator became an
  // in-flow element. The real value is applied after mount instead.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
