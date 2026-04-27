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
      setType(notifType);
      const t = setTimeout(() => setVisible(true), 2200);
      return () => clearTimeout(t);
    }
  }, [tier, habitCount]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!type || !visible) return null;

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm"
      style={{ animation: "slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <div className="flex items-center gap-3 bg-[#0f0f1a] border border-violet-600/35 rounded-2xl px-4 py-3 shadow-2xl shadow-violet-950/70">
        <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
          {type === "upgrade"
            ? <Zap      className="w-4 h-4 text-violet-300" />
            : <Sparkles className="w-4 h-4 text-violet-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-none">
            {type === "upgrade" ? "Unlock unlimited habits" : "Get AI coaching"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {type === "upgrade"
              ? "Add more habits with HabitAI Plus"
              : "Analyse your habits with AI — 5 free today"}
          </p>
        </div>
        <button
          onClick={() => { dismiss(); type === "upgrade" ? onUpgradeClick() : onAIInsightClick(); }}
          className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors flex-shrink-0 mr-1"
        >
          {type === "upgrade" ? "Upgrade" : "Analyse"}
        </button>
        <button onClick={dismiss} className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
