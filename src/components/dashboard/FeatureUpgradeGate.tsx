"use client";

import { Lock, Sparkles, Crown, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  requiredTier: "plus" | "pro";
  featureName: string;
  description: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

export default function FeatureUpgradeGate({ requiredTier, featureName, description, onUpgrade, compact }: Props) {
  const isPro   = requiredTier === "pro";
  const tierLabel = isPro ? "Pro" : "Plus";
  const tierColor = isPro ? "from-amber-500 to-orange-500" : "from-violet-600 to-purple-600";
  const tierBorder = isPro ? "border-amber-500/30" : "border-violet-600/40";
  const tierText  = isPro ? "text-amber-300" : "text-violet-300";
  const Icon = isPro ? Crown : Sparkles;

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${tierBorder} bg-violet-950/30 hover:bg-violet-900/30 transition-all`}
      >
        <Lock className={`w-3 h-3 ${tierText}`} />
        <span className={`text-xs font-semibold ${tierText}`}>{tierLabel} feature</span>
        <ArrowRight className={`w-3 h-3 ${tierText}`} />
      </button>
    );
  }

  return (
    <div className={`relative bg-[#0f0f1a] border ${tierBorder} rounded-2xl p-6 overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
      <div className="relative text-center">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tierColor} flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900/40`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-violet-950/60 border border-violet-800/30 rounded-full px-3 py-1 mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${tierText}`}>{tierLabel} Feature</span>
        </div>
        <h3 className="text-base font-bold text-white mb-2">{featureName}</h3>
        <p className="text-sm text-slate-400 mb-5 leading-relaxed">{description}</p>
        {onUpgrade ? (
          <button
            onClick={onUpgrade}
            className={`w-full py-2.5 bg-gradient-to-r ${tierColor} text-white font-bold rounded-xl text-sm transition-all hover:opacity-90`}
          >
            Upgrade to {tierLabel} →
          </button>
        ) : (
          <Link
            href="/billing"
            className={`block w-full py-2.5 bg-gradient-to-r ${tierColor} text-white font-bold rounded-xl text-sm text-center transition-all hover:opacity-90`}
          >
            Upgrade to {tierLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
