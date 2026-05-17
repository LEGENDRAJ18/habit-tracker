"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const TOUR_DONE_KEY    = "habitai-tour-done";
// Legacy aliases kept for settings page reset button
export const TOUR_STORAGE_KEY = TOUR_DONE_KEY;
export const TOUR_SESSION_KEY = "habitai-tour-session-legacy";
const TOUR_P1_KEY             = "habitai-tour-p1";      // step 0 was shown
const TOUR_P2_KEY             = "habitai-tour-p2-step"; // "0"|"1"|"2" for steps 1-3
const MS_48H = 48 * 60 * 60 * 1000;

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEP_0 = {
  emoji:      "✨",
  title:      "Add your first habit",
  body:       "Tap Add Habit to get started. Be specific — \"Walk 20 min\" sticks better than \"Exercise\".",
  target:     "add-habit",
  arrowSide:  "bottom" as Side,
};

type Side = "top" | "bottom" | "left" | "right";

interface Step {
  emoji:     string;
  title:     string;
  body:      string;
  target:    string;
  arrowSide: Side;
}

const PHASE2_STEPS: Step[] = [
  {
    emoji:      "⭕",
    title:      "Check this circle when done",
    body:       "Tap the circle to complete the habit and earn XP. You'll see a satisfying pop and particles.",
    target:     "first-habit-checkbox",
    arrowSide:  "bottom",
  },
  {
    emoji:      "🔥",
    title:      "Build a streak by completing daily",
    body:       "Come back every day and check off your habits. The streak number grows the more consistent you are.",
    target:     "first-habit-streak",
    arrowSide:  "bottom",
  },
  {
    emoji:      "⚡",
    title:      "Level up to unlock rewards",
    body:       "Each completion earns XP. Hit new levels to unlock badges and premium rewards.",
    target:     "xp-level",
    arrowSide:  "bottom",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface Rect { top: number; left: number; width: number; height: number; bottom: number; right: number }

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

function scrollToTarget(target: string) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

const CARD_W = 288;
const CARD_H = 168;
const PAD    = 10;

function calcTooltipPos(rect: Rect, preferSide: Side): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const clampX = (left: number) =>
    Math.min(Math.max(left, 12), vw - CARD_W - 12);

  const centeredX = clampX(rect.left + rect.width / 2 - CARD_W / 2);

  if (preferSide === "bottom") {
    const spaceBelow = vh - rect.bottom - PAD;
    if (spaceBelow >= CARD_H + 16) {
      return { position: "fixed", top: rect.bottom + PAD + 8, left: centeredX };
    }
    // Not enough below — go above
    const top = rect.top - PAD - CARD_H - 8;
    if (top > 0) return { position: "fixed", top, left: centeredX };
  }

  if (preferSide === "right") {
    const spaceRight = vw - rect.right - PAD;
    if (spaceRight >= CARD_W + 12) {
      return { position: "fixed", top: rect.top, left: rect.right + PAD + 8 };
    }
  }

  if (preferSide === "left") {
    const spaceLeft = rect.left - PAD;
    if (spaceLeft >= CARD_W + 12) {
      return { position: "fixed", top: rect.top, left: rect.left - PAD - CARD_W - 8 };
    }
  }

  // Fallback: below
  const top = Math.min(rect.bottom + PAD + 8, vh - CARD_H - 16);
  return { position: "fixed", top, left: centeredX };
}

// Which edge of the TOOLTIP card the arrow sits on (pointing toward the target)
function arrowEdge(tooltipStyle: React.CSSProperties, targetRect: Rect): Side {
  const tTop  = (tooltipStyle.top  as number) ?? 0;
  const tLeft = (tooltipStyle.left as number) ?? 0;
  const tooltipMidY = tTop  + CARD_H / 2;
  const tooltipMidX = tLeft + CARD_W / 2;
  const targetMidY  = targetRect.top  + targetRect.height / 2;
  const targetMidX  = targetRect.left + targetRect.width  / 2;

  const dy = targetMidY - tooltipMidY;
  const dx = targetMidX - tooltipMidX;

  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? "bottom" : "top";
  return dx > 0 ? "right" : "left";
}

interface ArrowProps {
  edge: Side;
  targetMidX: number;
  targetMidY: number;
  tooltipLeft: number;
  tooltipTop: number;
}

function Arrow({ edge, targetMidX, targetMidY, tooltipLeft, tooltipTop }: ArrowProps) {
  const S = 12;
  const base: React.CSSProperties = {
    position:  "absolute",
    width:     S,
    height:    S,
    background: "#0f0f1a",
    transform: "rotate(45deg)",
  };

  if (edge === "top") {
    const offset = Math.min(Math.max(targetMidX - tooltipLeft - S / 2, 16), CARD_W - 32);
    return (
      <div style={{
        ...base,
        top:    -S / 2 - 1,
        left:   offset,
        borderTop:  "1px solid rgba(124,58,237,0.4)",
        borderLeft: "1px solid rgba(124,58,237,0.4)",
      }} />
    );
  }
  if (edge === "bottom") {
    const offset = Math.min(Math.max(targetMidX - tooltipLeft - S / 2, 16), CARD_W - 32);
    return (
      <div style={{
        ...base,
        bottom:       -S / 2 - 1,
        left:         offset,
        borderBottom: "1px solid rgba(124,58,237,0.4)",
        borderRight:  "1px solid rgba(124,58,237,0.4)",
      }} />
    );
  }
  if (edge === "left") {
    const offset = Math.min(Math.max(targetMidY - tooltipTop - S / 2, 16), CARD_H - 32);
    return (
      <div style={{
        ...base,
        left:       -S / 2 - 1,
        top:        offset,
        borderLeft:   "1px solid rgba(124,58,237,0.4)",
        borderBottom: "1px solid rgba(124,58,237,0.4)",
      }} />
    );
  }
  // right
  const offset = Math.min(Math.max(targetMidY - tooltipTop - S / 2, 16), CARD_H - 32);
  return (
    <div style={{
      ...base,
      right:      -S / 2 - 1,
      top:        offset,
      borderRight: "1px solid rgba(124,58,237,0.4)",
      borderTop:   "1px solid rgba(124,58,237,0.4)",
    }} />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  habitCount: number;
  signedUpAt: string | null;
}

type Phase = "idle" | "phase1" | "waiting" | "phase2" | "done";

export default function OnboardingTour({ habitCount, signedUpAt }: Props) {
  const [phase,   setPhase]   = useState<Phase>("idle");
  const [p2Step,  setP2Step]  = useState(0); // 0-2 within PHASE2_STEPS
  const [rect,    setRect]    = useState<Rect | null>(null);
  const [tipPos,  setTipPos]  = useState<React.CSSProperties>({});
  const prevCountRef = useRef(habitCount);

  // ── Decide initial phase once at mount ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TOUR_DONE_KEY)) return;

    // If we're in the middle of phase 2 (user refreshed after adding first habit)
    const p2Stored = localStorage.getItem(TOUR_P2_KEY);
    if (p2Stored !== null && habitCount > 0) {
      const stored = parseInt(p2Stored, 10);
      setP2Step(isNaN(stored) ? 0 : stored);
      const t = setTimeout(() => setPhase("phase2"), 800);
      return () => clearTimeout(t);
    }

    // Phase 1: new user, no habits
    const p1Done = !!localStorage.getItem(TOUR_P1_KEY);
    if (!p1Done && habitCount === 0) {
      if (!signedUpAt || Date.now() - new Date(signedUpAt).getTime() > MS_48H) return;
      const t = setTimeout(() => setPhase("phase1"), 1200);
      return () => clearTimeout(t);
    }

    // Phase 1 done, still 0 habits — waiting for user to add one
    if (p1Done && habitCount === 0) {
      setPhase("waiting");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — data is final when parent renders this component

  // ── Detect habit count 0 → 1 to auto-trigger phase 2 ───────────────────────
  useEffect(() => {
    if (phase !== "waiting" && phase !== "phase1") {
      prevCountRef.current = habitCount;
      return;
    }
    if (prevCountRef.current === 0 && habitCount > 0) {
      localStorage.setItem(TOUR_P2_KEY, "0");
      setP2Step(0);
      // Small delay so the habit card has time to render
      setTimeout(() => setPhase("phase2"), 600);
    }
    prevCountRef.current = habitCount;
  }, [habitCount, phase]);

  // ── Update rect whenever phase/step changes ──────────────────────────────────
  const target = phase === "phase1"
    ? STEP_0.target
    : PHASE2_STEPS[p2Step]?.target ?? "";

  const updateRect = useCallback(() => {
    const r = getRect(target);
    setRect(r);
    if (r) setTipPos(calcTooltipPos(r, phase === "phase1" ? STEP_0.arrowSide : (PHASE2_STEPS[p2Step]?.arrowSide ?? "bottom")));
  }, [target, phase, p2Step]);

  useEffect(() => {
    if (phase !== "phase1" && phase !== "phase2") return;
    // Scroll then measure (give the scroll time to finish)
    scrollToTarget(target);
    const t = setTimeout(updateRect, 350);
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, [phase, target, updateRect]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const done = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, "true");
    localStorage.removeItem(TOUR_P2_KEY);
    setPhase("done");
  }, []);

  const next = useCallback(() => {
    if (phase === "phase1") {
      // Mark phase 1 done and wait for habit
      localStorage.setItem(TOUR_P1_KEY, "1");
      setPhase("waiting");
      return;
    }
    if (phase === "phase2") {
      if (p2Step >= PHASE2_STEPS.length - 1) { done(); return; }
      const next = p2Step + 1;
      localStorage.setItem(TOUR_P2_KEY, String(next));
      setP2Step(next);
    }
  }, [phase, p2Step, done]);

  if (phase !== "phase1" && phase !== "phase2") return null;

  const isPhase1  = phase === "phase1";
  const totalSteps = 1 + PHASE2_STEPS.length; // 4 total
  const stepIndex  = isPhase1 ? 0 : 1 + p2Step;
  const current    = isPhase1 ? STEP_0 : PHASE2_STEPS[p2Step];
  const hasRect    = rect && rect.width > 0;

  const spotStyle = hasRect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  const edge = hasRect ? arrowEdge(tipPos, rect) : "top";

  return (
    <div className="fixed inset-0 z-[80]" aria-live="polite">
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={done} />

      {/* Spotlight cutout */}
      {spotStyle && (
        <div
          className="absolute pointer-events-none rounded-xl ring-2 ring-violet-400/80"
          style={{
            top:    spotStyle.top,
            left:   spotStyle.left,
            width:  spotStyle.width,
            height: spotStyle.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.0)",
            background: "transparent",
            zIndex: 1,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-10 bg-[#0f0f1a] border border-violet-600/40 rounded-2xl shadow-2xl shadow-violet-950/70 p-5 select-none"
        style={{ ...tipPos, width: CARD_W, animation: "toastSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        {/* Arrow caret */}
        {hasRect && (
          <Arrow
            edge={edge}
            targetMidX={rect.left + rect.width / 2}
            targetMidY={rect.top  + rect.height / 2}
            tooltipLeft={(tipPos.left as number) ?? 0}
            tooltipTop={(tipPos.top  as number) ?? 0}
          />
        )}

        {/* Header: progress dots + close */}
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width:      i === stepIndex ? 20 : 8,
                background: i < stepIndex ? "#6d28d9" : i === stepIndex ? "#8b5cf6" : "#1e1b4b",
              }}
            />
          ))}
          <button
            onClick={done}
            aria-label="Skip tour"
            className="ml-auto text-slate-700 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-2xl leading-none mb-2">{current.emoji}</p>
        <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{current.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{current.body}</p>

        {/* Step counter + actions */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-700 tabular-nums">
            {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={done}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-violet-900/30"
            >
              {isPhase1
                ? "Got it →"
                : p2Step < PHASE2_STEPS.length - 1
                  ? "Next →"
                  : "Done ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
