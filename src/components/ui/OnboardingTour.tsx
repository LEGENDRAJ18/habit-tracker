"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

const TOUR_KEY = "habitai_tour_v1_done";

interface Step {
  emoji: string;
  title: string;
  body: string;
  tourTarget: string;
  tipSide: "bottom" | "left" | "right";
}

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Add your first habit here",
    body: "Tap "Add habit" to create your first habit. Be specific — "Walk 20 minutes" sticks better than "Exercise".",
    tourTarget: "add-habit",
    tipSide: "bottom",
  },
  {
    emoji: "📊",
    title: "Track your progress",
    body: "Head to Analytics to see your streaks, completion rates, and contribution heatmap.",
    tourTarget: "analytics-nav",
    tipSide: "right",
  },
  {
    emoji: "🤖",
    title: "Get AI coaching",
    body: "Your AI coach analyses your habits and gives you a personalised 7-day plan. Upgrade to Plus to unlock it.",
    tourTarget: "ai-insight",
    tipSide: "left",
  },
];

interface Rect { top: number; left: number; width: number; height: number }

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function OnboardingTour() {
  const [step, setStep]   = useState(0);
  const [rect, setRect]   = useState<Rect | null>(null);
  const [show, setShow]   = useState(false);

  const updateRect = useCallback(() => {
    setRect(getRect(STEPS[step]?.tourTarget ?? ""));
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TOUR_KEY)) return;
    // Delay to let layout paint
    const t = setTimeout(() => { setShow(true); updateRect(); }, 1200);
    return () => clearTimeout(t);
  }, [updateRect]);

  useEffect(() => {
    if (!show) return;
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [show, step, updateRect]);

  const done = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    setShow(false);
  }, []);

  const next = () => {
    if (step >= STEPS.length - 1) { done(); return; }
    setStep((s) => s + 1);
  };

  if (!show) return null;

  const current = STEPS[step];
  const hasRect  = rect && rect.width > 0;
  const PAD = 8;

  // Spotlight box coords
  const spotStyle = hasRect
    ? {
        top:    rect.top  - PAD,
        left:   rect.left - PAD,
        width:  rect.width  + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Tooltip card position
  function tooltipStyle(): React.CSSProperties {
    if (!hasRect || !spotStyle) {
      return { bottom: 96, left: "50%", transform: "translateX(-50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = 280;
    const cardH = 160;

    if (current.tipSide === "bottom") {
      const bottom = vh - (rect.top + rect.height + PAD);
      const isOff  = bottom < cardH + 16;
      if (!isOff) {
        return {
          top:   rect.top + rect.height + PAD + 12,
          left:  Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, 12), vw - cardW - 12),
        };
      }
    }
    if (current.tipSide === "right") {
      const tipLeft = rect.left + rect.width + PAD + 12;
      if (tipLeft + cardW < vw - 12) {
        return { top: rect.top, left: tipLeft };
      }
    }
    if (current.tipSide === "left") {
      const tipLeft = rect.left - PAD - cardW - 12;
      if (tipLeft > 12) {
        return { top: rect.top, left: tipLeft };
      }
    }
    // Fallback: below the element or center
    return {
      top:  Math.min(rect.top + rect.height + 16, vh - cardH - 16),
      left: Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, 12), vw - cardW - 12),
    };
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Spotlight cutout via box-shadow trick */}
      {spotStyle && (
        <div
          className="absolute pointer-events-none rounded-xl ring-2 ring-violet-400/70"
          style={{
            top:    spotStyle.top,
            left:   spotStyle.left,
            width:  spotStyle.width,
            height: spotStyle.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            zIndex: 1,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-10 w-[280px] bg-[#0f0f1a] border border-violet-600/40 rounded-2xl shadow-2xl shadow-violet-950/60 p-5"
        style={tooltipStyle()}
      >
        {/* Close */}
        <button
          onClick={done}
          aria-label="Skip tour"
          className="absolute top-3 right-3 text-slate-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? "w-5 bg-violet-500" : i < step ? "w-2 bg-violet-700" : "w-2 bg-slate-700"
              }`}
            />
          ))}
        </div>

        <p className="text-lg leading-none mb-2">{current.emoji}</p>
        <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{current.body}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={done}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {step < STEPS.length - 1 ? "Next →" : "Done ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
