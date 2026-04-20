"use client";

import { X, Sparkles, Check, Zap } from "lucide-react";
import { FREE_HABIT_LIMIT } from "@/types";

interface Props {
  onClose: () => void;
}

const proFeatures = [
  "Unlimited habits",
  "Full history & archives",
  "AI-powered insights",
  "Advanced analytics dashboard",
  "Smart reminders",
  "Goal tracking & milestones",
  "Priority support",
];

export default function UpgradeModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0f0f1a] border border-violet-700/40 rounded-2xl shadow-2xl shadow-violet-950/50 overflow-hidden">
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
              <h2 className="text-lg font-bold text-white">Upgrade to Pro</h2>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            You&apos;ve reached the{" "}
            <span className="text-violet-400 font-medium">{FREE_HABIT_LIMIT} habit limit</span> on
            the free plan. Upgrade to Pro for unlimited habits and AI-powered insights.
          </p>
        </div>

        <div className="p-6">
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-4xl font-bold text-white">$9</span>
            <span className="text-slate-400 text-sm">/ month</span>
            <span className="text-xs text-green-400 bg-green-950/40 border border-green-800/30 px-2 py-0.5 rounded-full ml-auto">
              14-day free trial
            </span>
          </div>

          {/* Features */}
          <div className="space-y-2.5 mb-6">
            {proFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                <div className="w-4 h-4 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-violet-400" />
                </div>
                {f}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 mb-3">
            <Sparkles className="w-4 h-4" />
            Start Free Trial
          </button>

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
