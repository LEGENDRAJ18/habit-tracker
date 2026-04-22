"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PWAInstallState {
  canInstall: boolean;   // true when beforeinstallprompt is captured (Chrome/Android/Edge)
  isInstalled: boolean;  // true when running in standalone mode
  isIOS: boolean;        // true on iPhone/iPad — no install prompt, need manual steps
  promptInstall: () => Promise<void>;
}

export function usePWAInstall(): PWAInstallState {
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setInstalled] = useState(false);
  const [isIOS, setIsIOS]         = useState(false);

  useEffect(() => {
    // Detect iOS (no beforeinstallprompt — user must tap Share → Add to Home Screen)
    const ios =
      /iPhone|iPad|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);
    setIsIOS(ios);

    // Detect already-installed standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) { setInstalled(true); return; }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }, [prompt]);

  return {
    canInstall: !!prompt && !isInstalled,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
