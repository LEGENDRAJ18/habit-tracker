"use client";

import { AlertTriangle, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";

export default function CancellationBanner() {
  const { cancelAtPeriodEnd, currentPeriodEnd, tier, profileLoading } = useProfile();
  const [dismissed, setDismissed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  if (profileLoading || dismissed) return null;
  if (!cancelAtPeriodEnd || !currentPeriodEnd) return null;
  if (tier === "free") return null;

  const endDate = new Date(currentPeriodEnd).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleResubscribe = async () => {
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
    <div className="w-full bg-amber-900/30 border-b border-amber-700/40 px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-200 min-w-0">
        Your{" "}
        <span className="font-semibold capitalize">{tier}</span>{" "}
        plan ends on <span className="font-semibold">{endDate}</span>.{" "}
        Resubscribe anytime to keep your benefits.
      </p>
      <button
        onClick={handleResubscribe}
        disabled={redirecting}
        className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all disabled:opacity-60 flex items-center gap-1.5"
      >
        {redirecting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Resubscribe
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-amber-600 hover:text-amber-300 transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
