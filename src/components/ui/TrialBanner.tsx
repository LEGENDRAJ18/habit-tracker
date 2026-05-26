"use client";

import { Sparkles, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";

export default function TrialBanner() {
  const { subscriptionStatus, trialEndDate, profileLoading } = useProfile();
  const [dismissed, setDismissed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  if (profileLoading || dismissed) return null;
  if (subscriptionStatus !== "trialing" || !trialEndDate) return null;

  const endDate = new Date(trialEndDate).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / 86400000),
  );

  const handleManage = async () => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setRedirecting(false);
    }
  };

  return (
    <div className="w-full bg-violet-900/40 border-b border-violet-700/40 px-4 py-2.5 flex items-center gap-3">
      <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
      <p className="flex-1 text-sm text-violet-200 min-w-0">
        <span className="font-semibold">Plus trial active</span>
        {" — "}
        {daysLeft > 0
          ? <>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left · cancel before <span className="font-semibold">{endDate}</span> and you won&apos;t be charged.</>
          : <>Trial ends today — cancel now if you don&apos;t want to be charged.</>}
      </p>
      <button
        onClick={handleManage}
        disabled={redirecting}
        className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 transition-all disabled:opacity-60 flex items-center gap-1.5"
      >
        {redirecting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Manage
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-violet-600 hover:text-violet-300 transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
