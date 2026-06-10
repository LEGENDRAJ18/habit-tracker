"use client";

import { useState, useEffect } from "react";
import { X, Zap, Sparkles } from "lucide-react";

type NotifType = "upgrade" | "ai_coaching";

const DISMISS_KEY = "smart_notif_dismissed_at";
const SHOWN_KEY   = "smart_notif_shown";
const TWENTY_FOUR = 24 * 60 * 60 * 1000;

interface Props {
  tier: string;
  habitCount: number;
  onUpgradeClick: () => void;
  onAIInsightClick: () => void;
}

/**
 * Inline contextual banner — renders as a normal document element so it
 * pushes content down rather than floating over it.
 * Place it at the top of <main> in the calling page.
 */
export default function SmartNotification({ tier, habitCount, onUpgradeClick, onAIInsightClick }: Props) {
  const [type, setType]       = useState<NotifType | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    const ts = localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - Number(ts) < TWENTY_FOUR) return;

    let notifType: NotifType | null = null;
    if (tier === "free" && habitCount >= 2) notifType = "upgrade";
    else if (tier === "plus" || tier === "pro") notifType = "ai_coaching";

    if (notifType) {
      sessionStorage.setItem(SHOWN_KEY, "1");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(notifType);
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, [tier, habitCount]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setType(null);
  };

  if (!type || !visible) return null;

  return (
    <div
      className="flex items-center gap-3 bg-violet-950/25 border border-violet-700/25 rounded-xl px-4 py-3 mb-5"
      style={{ animation: "fadeIn 0.3s ease-out both" }}
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
        {type === "upgrade"
          ? <Zap      className="w-3.5 h-3.5 text-violet-300" />
          : <Sparkles className="w-3.5 h-3.5 text-violet-300" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white leading-none">
          {type === "upgrade" ? "Unlock unlimited habits" : "Get AI coaching"}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          {type === "upgrade"
            ? "You're getting close to the free habit limit — upgrade for unlimited"
            : "Analyse your habits with AI — 5 free coaching sessions today"}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => { dismiss(); type === "upgrade" ? onUpgradeClick() : onAIInsightClick(); }}
        className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors flex-shrink-0 whitespace-nowrap"
      >
        {type === "upgrade" ? "Upgrade →" : "Analyse →"}
      </button>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
