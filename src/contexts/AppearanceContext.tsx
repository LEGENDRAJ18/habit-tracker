"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type AccentColor    = "violet" | "blue" | "green" | "pink" | "orange" | "red" | "cyan" | "gold";
export type DashboardLayout = "compact" | "comfortable" | "spacious";

export interface AppearancePrefs {
  accent:                 AccentColor;
  dashboardLayout:        DashboardLayout;
  showTimeEmojis:         boolean;
  showHabitStreak:        boolean;
  showHabitXP:            boolean;
  showAchievementPopups:  boolean;
  showLevelUpAnimation:   boolean;
  reduceMotion:           boolean;
  highContrast:           boolean;
}

const DEFAULTS: AppearancePrefs = {
  accent:                "violet",
  dashboardLayout:       "comfortable",
  showTimeEmojis:        true,
  showHabitStreak:       true,
  showHabitXP:           true,
  showAchievementPopups: true,
  showLevelUpAnimation:  true,
  reduceMotion:          false,
  highContrast:          false,
};

export const ACCENT_PALETTE: Record<AccentColor, {
  name: string; swatch: string;
  hex400: string; hex500: string; hex600: string; hex700: string; hex900: string;
  r: number; g: number; b: number;
}> = {
  violet: { name:"Purple", swatch:"#7c3aed", hex400:"#a78bfa", hex500:"#8b5cf6", hex600:"#7c3aed", hex700:"#6d28d9", hex900:"#4c1d95", r:124, g:58,  b:237 },
  blue:   { name:"Blue",   swatch:"#2563eb", hex400:"#60a5fa", hex500:"#3b82f6", hex600:"#2563eb", hex700:"#1d4ed8", hex900:"#1e3a8a", r:37,  g:99,  b:235 },
  green:  { name:"Green",  swatch:"#16a34a", hex400:"#4ade80", hex500:"#22c55e", hex600:"#16a34a", hex700:"#15803d", hex900:"#14532d", r:22,  g:163, b:74  },
  pink:   { name:"Pink",   swatch:"#db2777", hex400:"#f472b6", hex500:"#ec4899", hex600:"#db2777", hex700:"#be185d", hex900:"#831843", r:219, g:39,  b:119 },
  orange: { name:"Orange", swatch:"#ea580c", hex400:"#fb923c", hex500:"#f97316", hex600:"#ea580c", hex700:"#c2410c", hex900:"#7c2d12", r:234, g:88,  b:12  },
  red:    { name:"Red",    swatch:"#dc2626", hex400:"#f87171", hex500:"#ef4444", hex600:"#dc2626", hex700:"#b91c1c", hex900:"#7f1d1d", r:220, g:38,  b:38  },
  cyan:   { name:"Cyan",   swatch:"#0891b2", hex400:"#22d3ee", hex500:"#06b6d4", hex600:"#0891b2", hex700:"#0e7490", hex900:"#164e63", r:8,   g:145, b:178 },
  gold:   { name:"Gold",   swatch:"#d97706", hex400:"#fbbf24", hex500:"#f59e0b", hex600:"#d97706", hex700:"#b45309", hex900:"#78350f", r:217, g:119, b:6   },
};

const LS_KEY = "habitai_appearance_v1";

function readLS(): Partial<AppearancePrefs> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); }
  catch { return {}; }
}

export function applyAccentCSSVars(accent: AccentColor) {
  const p = ACCENT_PALETTE[accent];
  const d = document.documentElement;
  d.style.setProperty("--a-400", p.hex400);
  d.style.setProperty("--a-500", p.hex500);
  d.style.setProperty("--a-600", p.hex600);
  d.style.setProperty("--a-700", p.hex700);
  d.style.setProperty("--a-900", p.hex900);
  d.style.setProperty("--a-r",   String(p.r));
  d.style.setProperty("--a-g",   String(p.g));
  d.style.setProperty("--a-b",   String(p.b));
}

function applyReduceMotion(value: boolean) {
  document.documentElement.classList.toggle("reduce-motion", value);
}

function applyHighContrast(value: boolean) {
  document.documentElement.classList.toggle("high-contrast", value);
}

type AppearanceCtx = AppearancePrefs & {
  setAccent:               (c: AccentColor)     => void;
  setDashboardLayout:      (l: DashboardLayout) => void;
  setShowTimeEmojis:       (v: boolean)         => void;
  setShowHabitStreak:      (v: boolean)         => void;
  setShowHabitXP:          (v: boolean)         => void;
  setShowAchievementPopups:(v: boolean)         => void;
  setShowLevelUpAnimation: (v: boolean)         => void;
  setReduceMotion:         (v: boolean)         => void;
  setHighContrast:         (v: boolean)         => void;
};

const Ctx = createContext<AppearanceCtx>({
  ...DEFAULTS,
  setAccent:               () => {},
  setDashboardLayout:      () => {},
  setShowTimeEmojis:       () => {},
  setShowHabitStreak:      () => {},
  setShowHabitXP:          () => {},
  setShowAchievementPopups:() => {},
  setShowLevelUpAnimation: () => {},
  setReduceMotion:         () => {},
  setHighContrast:         () => {},
});

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULTS);
  const [supabase] = useState(() => createClient());
  const ready    = useRef(false);

  useEffect(() => {
    if (ready.current) return;
    ready.current = true;

    const merged: AppearancePrefs = { ...DEFAULTS, ...readLS() };
    setPrefs(merged);
    applyAccentCSSVars(merged.accent);
    applyReduceMotion(merged.reduceMotion);
    applyHighContrast(merged.highContrast);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("accent_color").eq("id", user.id).single()
        .then(({ data }) => {
          const remote = data?.accent_color as AccentColor | undefined;
          if (remote && remote !== merged.accent && ACCENT_PALETTE[remote]) {
            applyAccentCSSVars(remote);
            setPrefs((p) => {
              const n = { ...p, accent: remote };
              try { localStorage.setItem(LS_KEY, JSON.stringify(n)); } catch {}
              return n;
            });
          }
        });
    });
  }, [supabase]);

  const commit = useCallback((patch: Partial<AppearancePrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const setAccent = useCallback((accent: AccentColor) => {
    applyAccentCSSVars(accent);
    commit({ accent });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("profiles").update({ accent_color: accent }).eq("id", user.id);
    });
  }, [supabase, commit]);

  const setDashboardLayout      = useCallback((dashboardLayout: DashboardLayout) => commit({ dashboardLayout }), [commit]);
  const setShowTimeEmojis       = useCallback((v: boolean) => commit({ showTimeEmojis: v }), [commit]);
  const setShowHabitStreak      = useCallback((v: boolean) => commit({ showHabitStreak: v }), [commit]);
  const setShowHabitXP          = useCallback((v: boolean) => commit({ showHabitXP: v }), [commit]);
  const setShowAchievementPopups= useCallback((v: boolean) => commit({ showAchievementPopups: v }), [commit]);
  const setShowLevelUpAnimation = useCallback((v: boolean) => commit({ showLevelUpAnimation: v }), [commit]);
  const setReduceMotion         = useCallback((v: boolean) => { applyReduceMotion(v); commit({ reduceMotion: v }); }, [commit]);
  const setHighContrast         = useCallback((v: boolean) => { applyHighContrast(v); commit({ highContrast: v }); }, [commit]);

  return (
    <Ctx.Provider value={{
      ...prefs,
      setAccent, setDashboardLayout,
      setShowTimeEmojis, setShowHabitStreak, setShowHabitXP,
      setShowAchievementPopups, setShowLevelUpAnimation,
      setReduceMotion, setHighContrast,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppearance() {
  return useContext(Ctx);
}
