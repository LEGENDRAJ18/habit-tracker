"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const DISMISS_KEY  = "promo_banner_dismissed_at";
const SEVEN_DAYS   = 7 * 24 * 60 * 60 * 1000;

interface Props {
  tier: string;
}

export default function PromoBanner({ tier }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (tier !== "free") return;
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts || Date.now() - Number(ts) > SEVEN_DAYS) setVisible(true);
  }, [tier]);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="bg-gradient-to-r from-violet-900/80 via-violet-800/70 to-fuchsia-900/60 border-b border-violet-600/30 py-2 px-4">
      <div className="max-w-[1340px] mx-auto flex items-center justify-center gap-3">
        <p className="text-[13px] text-violet-100 text-center">
          🎉 <strong>Limited offer:</strong> Get HabitAI Plus for 50% off your first month — Use code{" "}
          <span className="font-bold text-white bg-violet-600/40 px-1.5 py-0.5 rounded-md">HABIT50</span>
        </p>
        <button
          onClick={handleDismiss}
          className="text-violet-400 hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
