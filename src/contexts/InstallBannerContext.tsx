"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

// Bumped to v2 so users who dismissed the old bottom banner see this new one.
const DISMISS_KEY = "habitai-install-dismissed-v2";

interface InstallBannerContextValue {
  visible: boolean;
  isIOS: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
  /** InstallBanner reports its own rendered height here once mounted/resized. */
  reportHeight: (height: number) => void;
  /** Actual on-screen space it's occupying right now — 0 whenever it isn't showing. */
  reservedHeight: number;
}

const InstallBannerContext = createContext<InstallBannerContextValue | null>(null);

// Mounted once in the root layout, wrapping both <InstallBanner /> and the
// route content — the single source of truth both share, so a page that
// renders outside AppShell can reserve matching top space without
// duplicating (and risking drifting from) InstallBanner's own show/dismiss
// logic.
export function InstallBannerProvider({ children }: { children: React.ReactNode }) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) === "1" : true)
  );
  const [visible, setVisible] = useState(false);
  const [height, setHeight]   = useState(0);

  useEffect(() => {
    const shouldShow = (canInstall || isIOS) && !isInstalled && !dismissed;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!shouldShow) { setVisible(false); return; }
    // Brief delay so the page settles before the banner slides in.
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [canInstall, isIOS, isInstalled, dismissed]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const reportHeight = useCallback((h: number) => setHeight(h), []);

  return (
    <InstallBannerContext.Provider
      value={{ visible, isIOS, canInstall, promptInstall, dismiss, reportHeight, reservedHeight: visible ? height : 0 }}
    >
      {children}
    </InstallBannerContext.Provider>
  );
}

function useInstallBannerContext(): InstallBannerContextValue {
  const ctx = useContext(InstallBannerContext);
  if (!ctx) throw new Error("useInstallBannerContext must be used within InstallBannerProvider");
  return ctx;
}

export function useInstallBanner(): InstallBannerContextValue {
  return useInstallBannerContext();
}

/**
 * For pages rendered outside AppShell (which reserves this space for free
 * via its own nav's natural height): the banner's real measured height while
 * it's on screen, 0 otherwise. Add it to top padding so the fixed banner
 * doesn't render over in-flow heading/content.
 */
export function useInstallBannerReservedHeight(): number {
  return useInstallBannerContext().reservedHeight;
}
