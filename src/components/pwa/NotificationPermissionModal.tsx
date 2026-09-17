"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Flame, X, Zap, ChevronRight, Share, AlertTriangle } from "lucide-react";
import CenteredModal from "@/components/ui/CenteredModal";

interface Props {
  onAllow: () => void;
  onDismiss: () => void;
  /** Set when a previous allow() attempt granted permission but failed to
   *  save a subscription — shows a retry state instead of the normal ask. */
  error?: string | null;
  /** True while allow() is mid-flight, to disable the retry button. */
  subscribing?: boolean;
  /** True on iOS Safari that isn't installed to the Home Screen — the
   *  Notification API doesn't exist here at all, so show install
   *  instructions instead of a permission ask that can't work. */
  needsIOSInstall?: boolean;
}

const FEATURES = [
  {
    icon: Clock,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    title: "Daily habit reminders",
    desc: "Get nudged at the right time — before your streak slips.",
  },
  {
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    title: "Streak protection alerts",
    desc: "We'll warn you before you lose a streak you've worked hard for.",
  },
  {
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Smart morning briefing",
    desc: "Start every day knowing exactly what habits are due today.",
  },
];

const IOS_STEPS = [
  <>Open this page in <strong className="text-white">Safari</strong> (not Chrome)</>,
  <>Tap the <strong className="text-white">Share</strong> button at the bottom of the screen</>,
  <>Scroll down and tap <strong className="text-white">Add to Home Screen</strong></>,
  <>Open HabitAI from your Home Screen, then enable notifications there</>,
];

export default function NotificationPermissionModal({ onAllow, onDismiss, error, subscribing, needsIOSInstall }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in after mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }

  function handleAllow() {
    setVisible(false);
    setTimeout(onAllow, 150);
  }

  if (!visible) return null;

  return (
    <CenteredModal onClose={handleDismiss} zIndex="z-[90]" backdrop="bg-black/70 backdrop-blur-sm">
      <div className="modal-center-enter w-full max-w-md bg-[#0d0d1c] border border-violet-700/40 rounded-3xl p-6 shadow-2xl shadow-violet-950/60 max-h-[90vh] overflow-y-auto relative">
          {/* Glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-600/15 blur-3xl pointer-events-none rounded-full" />

          {/* Header */}
          <div className="flex items-start justify-between mb-5 relative">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                style={
                  needsIOSInstall
                    ? { background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)" }
                    : error
                    ? { background: "linear-gradient(135deg, #b45309 0%, #92400e 100%)" }
                    : { background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)" }
                }
              >
                {needsIOSInstall ? (
                  <Share className="w-7 h-7 text-white" />
                ) : error ? (
                  <AlertTriangle className="w-7 h-7 text-white" />
                ) : (
                  <Bell className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight">
                  {needsIOSInstall ? "Install HabitAI first" : error ? "Couldn't enable notifications" : "Stay on track 🎯"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {needsIOSInstall
                    ? "iPhone requires this for notifications"
                    : error
                    ? "Permission was granted, but saving failed"
                    : "Smart reminders that work for you"}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all -mt-1 -mr-1 flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {needsIOSInstall ? (
            <>
              {/* iOS install steps — Apple only allows push to a web app
                  that's been added to the Home Screen; there's nothing
                  Enable can do until that's done. */}
              <div className="space-y-2 mb-6 relative">
                <p className="text-xs text-slate-400 leading-snug mb-3">
                  On iPhone, Safari only allows notifications for apps installed to your Home Screen. It only takes a few seconds:
                </p>
                {IOS_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              <div className="relative">
                <button
                  onClick={handleDismiss}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-violet-900/30"
                  style={{ background: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #7c3aed 100%)" }}
                >
                  Got it
                </button>
              </div>
            </>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 relative">
                  <p className="text-xs text-amber-300 leading-snug">{error}</p>
                </div>
              )}

              {/* Feature list */}
              <div className="space-y-2.5 mb-6 relative">
                {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
                  <div
                    key={title}
                    className={`flex items-start gap-3 p-3 rounded-2xl border ${bg}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="space-y-2 relative">
                <button
                  onClick={handleAllow}
                  disabled={subscribing}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #7c3aed 100%)",
                  }}
                >
                  <Bell className="w-4 h-4" />
                  {error ? (subscribing ? "Retrying…" : "Try again") : "Enable smart reminders"}
                  {!subscribing && <ChevronRight className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 rounded-2xl text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  {error ? "Not now" : "Maybe later"}
                </button>
              </div>

              {/* Privacy note */}
              <p className="text-center text-[10px] text-slate-600 mt-3 leading-snug relative">
                Notifications only when it matters. No spam. Adjust anytime in Settings.
              </p>
            </>
          )}
      </div>
    </CenteredModal>
  );
}
