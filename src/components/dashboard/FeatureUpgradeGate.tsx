"use client";

import { Lock, Sparkles, Crown, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

interface Props {
  requiredTier: "plus" | "pro";
  featureName: string;
  description: string;
  features?: string[];
  onUpgrade?: () => void;
  compact?: boolean;
}

const TIER_STYLES = {
  plus: {
    gradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    glow: "rgba(139,92,246,0.4)",
    ambient: "rgba(109,40,217,0.08)",
    border: "rgba(139,92,246,0.3)",
    shimmer: "rgba(167,139,250,0.15)",
    text: "text-violet-300",
    label: "Plus",
    Icon: Sparkles,
  },
  pro: {
    gradient: "linear-gradient(135deg, #b45309, #d97706)",
    glow: "rgba(245,158,11,0.4)",
    ambient: "rgba(180,83,9,0.08)",
    border: "rgba(245,158,11,0.3)",
    shimmer: "rgba(251,191,36,0.12)",
    text: "text-amber-300",
    label: "Pro",
    Icon: Crown,
  },
} as const;

export default function FeatureUpgradeGate({ requiredTier, featureName, description, features, onUpgrade, compact }: Props) {
  const s = TIER_STYLES[requiredTier];
  const { Icon } = s;

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:brightness-110 ${s.text}`}
        style={{ background: s.ambient, border: `1px solid ${s.border}` }}
      >
        <Lock className="w-3 h-3" />
        <span className="text-xs font-semibold">{s.label} feature</span>
        <ArrowRight className="w-3 h-3" />
      </button>
    );
  }

  const CTA = (
    <div
      className="relative w-full py-3 text-white font-bold rounded-2xl text-sm text-center overflow-hidden transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
      style={{ background: s.gradient, boxShadow: `0 4px 20px ${s.glow}` }}
    >
      {/* Shimmer sweep */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${s.shimmer} 50%, transparent 60%)`,
          animation: "gateShimmer 2.8s linear infinite",
        }}
      />
      <span className="relative">Upgrade to {s.label} →</span>
    </div>
  );

  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{ background: s.ambient, border: `1px solid ${s.border}` }}
    >
      {/* Ambient radial glow top-center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at center top, ${s.glow.replace("0.4", "0.18")}, transparent)` }} />

      <div className="relative text-center">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: s.gradient, boxShadow: `0 0 28px ${s.glow}` }}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Tier badge */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 ${s.text}`}
          style={{ background: s.ambient, border: `1px solid ${s.border}` }}
        >
          <Lock className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{s.label} Feature</span>
        </div>

        <h3 className="text-base font-bold text-white mb-1.5">{featureName}</h3>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">{description}</p>

        {/* Optional bullet features */}
        {features && features.length > 0 && (
          <ul className="text-left mb-4 space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${s.text}`} />
                {f}
              </li>
            ))}
          </ul>
        )}

        {onUpgrade ? (
          <button onClick={onUpgrade} className="w-full">{CTA}</button>
        ) : (
          <Link href="/billing" className="block w-full">{CTA}</Link>
        )}
      </div>

      <style>{`
        @keyframes gateShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%);  }
        }
      `}</style>
    </div>
  );
}
