"use client";

import { useState } from "react";
import { X, Sparkles, Check, Zap, Loader2 } from "lucide-react";
import { FREE_HABIT_LIMIT } from "@/types";

interface Props {
  onClose: () => void;
}

const plusFeatures = [
  "Up to 10 habits",
  "Full history & archives",
  "Basic analytics",
  "Smart reminders",
];

const proFeatures = [
  "Unlimited habits",
  "Full history & archives",
  "AI-powered insights",
  "Advanced analytics dashboard",
  "Smart reminders",
  "Goal tracking & milestones",
  "Priority support",
];

async function startCheckout(priceId: string): Promise<void> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error ?? 'Checkout failed');
  }
}

export default function UpgradeModal({ onClose }: Props) {
  const [loading, setLoading] = useState<'plus' | 'pro' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (plan: 'plus' | 'pro') => {
    setLoading(plan);
    setError(null);
    try {
      const priceId = plan === 'plus'
        ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
        : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
      await startCheckout(priceId);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-[#0f0f1a] border border-violet-700/40 rounded-2xl shadow-2xl shadow-violet-950/50 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-900/60 to-purple-900/30 px-6 pt-6 pb-5 border-b border-violet-800/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-600/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-violet-400 font-medium uppercase tracking-wider">
                Free plan limit reached
              </p>
              <h2 className="text-lg font-bold text-white">Upgrade your plan</h2>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            You&apos;ve reached the{" "}
            <span className="text-violet-400 font-medium">{FREE_HABIT_LIMIT} habit limit</span> on
            the free plan. Choose a plan to unlock more.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/30 rounded-xl px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Plus */}
            <div className="bg-violet-950/30 border border-violet-800/30 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Plus</span>
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-white">$9</span>
                <span className="text-slate-400 text-xs ml-1">/ mo</span>
              </div>
              <div className="space-y-1.5 mb-4 flex-1">
                {plusFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs text-slate-400">
                    <Check className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout('plus')}
                disabled={loading !== null}
                className="w-full py-2 border border-violet-600/50 hover:border-violet-500 text-violet-300 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === 'plus' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Start Plus Trial
              </button>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-b from-violet-900/40 to-violet-950/20 border border-violet-500/50 rounded-xl p-4 flex flex-col shadow-lg shadow-violet-950/30">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-violet-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                  Best value
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Pro</span>
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-white">$19</span>
                <span className="text-slate-400 text-xs ml-1">/ mo</span>
              </div>
              <div className="space-y-1.5 mb-4 flex-1">
                {proFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check className="w-3 h-3 text-violet-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout('pro')}
                disabled={loading !== null}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === 'pro' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Start Pro Trial
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mb-3">14-day free trial · Cancel anytime</p>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
