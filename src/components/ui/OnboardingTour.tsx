"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const TOUR_DONE_KEY  = "habitai-tour-done";
export const TOUR_FORCE_KEY = "habitai-tour-force";

// Legacy aliases kept for any existing imports that reference these
export const TOUR_STORAGE_KEY = TOUR_DONE_KEY;
export const TOUR_SESSION_KEY = "habitai-tour-session-legacy"; // no longer used

// Set the moment the tour auto-activates so a remount (route change, hard
// refresh) within the same tab doesn't re-trigger the full-screen dim
// overlay every time — only TOUR_FORCE_KEY (Settings "Restart tour") or a
// brand new browser session can bring it back before TOUR_DONE_KEY is set.
const TOUR_SESSION_SHOWN_KEY = "habitai-tour-session-shown";

const MS_48H = 48 * 60 * 60 * 1000;

// ─── Step definitions ─────────────────────────────────────────────────────────

type Side = "top" | "bottom" | "left" | "right";

interface Step {
  emoji:     string;
  title:     string;
  body:      string;
  /** data-tour attribute to spotlight. null = centered card with no spotlight. */
  target:    string | null;
  arrowSide: Side;
}

const STEPS: Step[] = [
  {
    emoji:     "👋",
    title:     "Welcome to your dashboard",
    body:      "Here's a quick 60-second tour. Use Next and Back to navigate, or tap Skip to close anytime.",
    target:    null,
    arrowSide: "bottom",
  },
  {
    emoji:     "⚡",
    title:     "Your XP & Level",
    body:      "This bar tracks your level and XP progress. Tap it anytime to see full stats, achievements, and your weekly XP breakdown.",
    target:    "xp-bar",
    arrowSide: "bottom",
  },
  {
    emoji:     "➕",
    title:     "Add a habit",
    body:      "Tap here to create a new habit. Be specific — \"Walk 20 min\" earns full XP. Vague names earn partial XP.",
    target:    "add-habit",
    arrowSide: "bottom",
  },
  {
    emoji:     "✅",
    title:     "Complete a habit",
    body:      "Tap the circle to mark a habit done. XP is awarded instantly — no sync delay, no waiting.",
    target:    "first-habit-checkbox",
    arrowSide: "bottom",
  },
  {
    emoji:     "📊",
    title:     "Today's progress",
    body:      "This bar fills as you tick off habits. Hit 100% to unlock the daily completion bonus XP and trigger a confetti celebration.",
    target:    "progress-bar",
    arrowSide: "top",
  },
  {
    emoji:     "🥇",
    title:     "Daily milestones",
    body:      "Earn bonus XP by hitting these targets: first habit today, all habits done, 7-day streak and more. Each can be shared.",
    target:    "daily-milestones",
    arrowSide: "top",
  },
  {
    emoji:     "🤖",
    title:     "AI Coaching",
    body:      "Get personalised insights on your habits, patterns and streaks. The AI reads your actual history — not generic advice.",
    target:    "ai-insight",
    arrowSide: "left",
  },
  {
    emoji:     "🧭",
    title:     "Explore the app",
    body:      "Analytics, Calendar, Friends and Profile are all here. Check your streak heatmap, challenge friends, and track your growth.",
    target:    "analytics-nav",
    arrowSide: "right",
  },
  {
    emoji:     "🎉",
    title:     "You're all set!",
    body:      "You know everything you need to build winning habits. Let's go — your future self will thank you.",
    target:    null,
    arrowSide: "bottom",
  },
];

const TOTAL = STEPS.length;

// ─── Geometry ─────────────────────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number }

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function scrollToTarget(target: string) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

const CARD_W = 300;
const CARD_H = 200;
const PAD    = 12;

function calcTipPos(rect: Rect, preferSide: Side): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, 12), vw - CARD_W - 12);
  const cx = clampX(rect.left + rect.width / 2 - CARD_W / 2);

  if (preferSide === "bottom") {
    if (vh - rect.top - rect.height - PAD >= CARD_H + 16)
      return { position: "fixed", top: rect.top + rect.height + PAD + 8, left: cx };
    if (rect.top - PAD - CARD_H - 8 > 0)
      return { position: "fixed", top: rect.top - PAD - CARD_H - 8, left: cx };
  }
  if (preferSide === "top") {
    if (rect.top - PAD - CARD_H - 8 > 0)
      return { position: "fixed", top: rect.top - PAD - CARD_H - 8, left: cx };
    if (vh - rect.top - rect.height - PAD >= CARD_H + 16)
      return { position: "fixed", top: rect.top + rect.height + PAD + 8, left: cx };
  }
  if (preferSide === "right") {
    if (vw - rect.left - rect.width - PAD >= CARD_W + 12)
      return { position: "fixed", top: Math.max(12, rect.top - 8), left: rect.left + rect.width + PAD + 8 };
  }
  if (preferSide === "left") {
    if (rect.left - PAD >= CARD_W + 12)
      return { position: "fixed", top: Math.max(12, rect.top - 8), left: rect.left - PAD - CARD_W - 8 };
  }
  // Fallback: center
  return { position: "fixed", top: Math.max(12, vh / 2 - CARD_H / 2), left: vw / 2 - CARD_W / 2 };
}

function arrowEdge(tipStyle: React.CSSProperties, rect: Rect): Side {
  const dy = (rect.top + rect.height / 2) - ((tipStyle.top as number ?? 0) + CARD_H / 2);
  const dx = (rect.left + rect.width / 2) - ((tipStyle.left as number ?? 0) + CARD_W / 2);
  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? "bottom" : "top";
  return dx > 0 ? "right" : "left";
}

function Arrow({ edge, tgtMX, tgtMY, tipL, tipT }: {
  edge: Side; tgtMX: number; tgtMY: number; tipL: number; tipT: number;
}) {
  const S = 12;
  const base: React.CSSProperties = {
    position: "absolute", width: S, height: S,
    background: "#0f0f1a", transform: "rotate(45deg)",
  };
  const bdr = "1px solid rgba(124,58,237,0.45)";
  if (edge === "top") {
    const off = Math.min(Math.max(tgtMX - tipL - S / 2, 16), CARD_W - 32);
    return <div style={{ ...base, top: -S/2-1, left: off, borderTop: bdr, borderLeft: bdr }} />;
  }
  if (edge === "bottom") {
    const off = Math.min(Math.max(tgtMX - tipL - S / 2, 16), CARD_W - 32);
    return <div style={{ ...base, bottom: -S/2-1, left: off, borderBottom: bdr, borderRight: bdr }} />;
  }
  if (edge === "left") {
    const off = Math.min(Math.max(tgtMY - tipT - S / 2, 16), CARD_H - 32);
    return <div style={{ ...base, left: -S/2-1, top: off, borderLeft: bdr, borderBottom: bdr }} />;
  }
  const off = Math.min(Math.max(tgtMY - tipT - S / 2, 16), CARD_H - 32);
  return <div style={{ ...base, right: -S/2-1, top: off, borderRight: bdr, borderTop: bdr }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingTour({ habitCount, signedUpAt }: { habitCount: number; signedUpAt: string | null }) {
  const [active,   setActive]   = useState(false);
  const [step,     setStep]     = useState(0);
  const [rect,     setRect]     = useState<Rect | null>(null);
  const [tipStyle, setTipStyle] = useState<React.CSSProperties>({});
  const pendingRef = useRef(false);

  // ── Decide whether to start ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Settings "Restart tour" button sets this key then navigates here
    if (localStorage.getItem(TOUR_FORCE_KEY)) {
      localStorage.removeItem(TOUR_FORCE_KEY);
      setTimeout(() => { setStep(0); setActive(true); }, 500);
      return;
    }

    // Already completed — don't auto-show again
    if (localStorage.getItem(TOUR_DONE_KEY)) return;

    // Already auto-shown once this tab session — don't re-trigger the
    // full-screen overlay on every hard refresh / route remount.
    if (sessionStorage.getItem(TOUR_SESSION_SHOWN_KEY)) return;

    // Auto-trigger for new users only
    if (!signedUpAt) return;
    if (Date.now() - new Date(signedUpAt).getTime() > MS_48H) return;

    if (habitCount > 0) {
      setTimeout(() => {
        sessionStorage.setItem(TOUR_SESSION_SHOWN_KEY, "1");
        setStep(0); setActive(true);
      }, 1500);
    } else {
      // Wait until they add their first habit
      pendingRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for first habit added (new users who land with 0 habits)
  useEffect(() => {
    if (!pendingRef.current) return;
    if (habitCount > 0) {
      pendingRef.current = false;
      setTimeout(() => {
        sessionStorage.setItem(TOUR_SESSION_SHOWN_KEY, "1");
        setStep(0); setActive(true);
      }, 700);
    }
  }, [habitCount]);

  // ── Update spotlight rect when step changes ───────────────────────────────────
  const cur = STEPS[step];

  const measure = useCallback(() => {
    if (!cur?.target) { setRect(null); return; }
    const r = getRect(cur.target);
    setRect(r);
    if (r) setTipStyle(calcTipPos(r, cur.arrowSide));
  }, [cur]);

  useEffect(() => {
    if (!active) return;
    if (cur?.target) scrollToTarget(cur.target);
    const t = setTimeout(measure, 360);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [active, step, measure, cur]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const finish = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, "true");
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (step >= TOTAL - 1) { finish(); return; }
    setStep((s) => s + 1);
  }, [step, finish]);

  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  if (!active || !cur) return null;

  // ── Rendering ─────────────────────────────────────────────────────────────────
  const hasSpot  = !!rect;
  const centered = !cur.target || !hasSpot;
  const spot     = hasSpot
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const tipPos   = centered
    ? {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%,-50%)",
      }
    : tipStyle;
  const edge = hasSpot ? arrowEdge(tipStyle, rect) : "top";

  return (
    <div className="fixed inset-0 z-[80]" aria-live="polite" aria-modal="true">
      {/* Dim overlay — clicking it dismisses */}
      <div className="absolute inset-0 bg-black/72 backdrop-blur-[2px]" onClick={finish} />

      {/* Spotlight ring around target element */}
      {spot && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            top:    spot.top,
            left:   spot.left,
            width:  spot.width,
            height: spot.height,
            boxShadow: "0 0 0 3px rgba(139,92,246,0.95), 0 0 24px 6px rgba(139,92,246,0.35)",
            zIndex: 1,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-10 bg-[#0f0f1a] border border-violet-600/45 rounded-2xl shadow-2xl shadow-violet-950/70 p-5 select-none"
        style={{
          ...tipPos,
          width: CARD_W,
          animation: "toastSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow caret */}
        {hasSpot && !centered && (
          <Arrow
            edge={edge}
            tgtMX={rect.left + rect.width  / 2}
            tgtMY={rect.top  + rect.height / 2}
            tipL={(tipStyle.left as number) ?? 0}
            tipT={(tipStyle.top  as number) ?? 0}
          />
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width:      i === step ? 22 : 7,
                background: i < step ? "#6d28d9" : i === step ? "#8b5cf6" : "#1e1b4b",
              }}
            />
          ))}
          <button
            onClick={finish}
            aria-label="Skip tour"
            className="ml-auto text-slate-700 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-2xl leading-none mb-2">{cur.emoji}</p>
        <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{cur.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{cur.body}</p>

        {/* Navigation row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-700 tabular-nums">{step + 1} / {TOTAL}</span>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 rounded-lg border border-violet-900/30 hover:border-violet-700/50 transition-all"
              >
                <ChevronLeft className="w-3 h-3" />Back
              </button>
            )}
            <button
              onClick={finish}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="flex items-center gap-0.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-violet-900/30"
            >
              {step >= TOTAL - 1 ? "Done ✓" : "Next"}<ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
