"use client";

import { useState } from "react";
import { X, Sparkles, Check, Minus, Zap, Loader2, Brain, Clock } from "lucide-react";
import { FREE_HABIT_LIMIT } from "@/types";

interface Props {
  onClose: () => void;
}

function Soon() {
  return (
    <span className="inline-flex items-center gap-0.5 bg-violet-950 border border-violet-700/40 text-violet-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 leading-none">
      <Clock className="w-2 h-2" />
      Soon
    </span>
  );
}

async function startCheckout(priceId: string): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error ?? "Checkout failed");
  }
}

type Cell = "yes" | "no" | "soon" | string;

interface ComparisonRow {
  label: string;
  free: Cell;
  plus: Cell;
  pro: Cell;
  soon?: boolean;
}

const ROWS: ComparisonRow[] = [
  { label: "Active habits",            free: "5",          plus: "Unlimited",  pro: "Unlimited" },
  { label: "Streak tracking",          free: "yes",        plus: "yes",        pro: "yes" },
  { label: "History",                  free: "7 days",     plus: "Full",       pro: "Full" },
  { label: "Daily reminders",          free: "Basic",      plus: "Unlimited",  pro: "Unlimited" },
  { label: "Global Challenges",        free: "yes",        plus: "yes",        pro: "yes" },
  { label: "Off Mode (rest days)",     free: "no",         plus: "yes",        pro: "yes" },
  { label: "Habit checklists",         free: "no",         plus: "yes",        pro: "yes" },
  { label: "Predictive nudges",        free: "no",         plus: "yes",        pro: "yes" },
  { label: "Advanced streak protect",  free: "no",         plus: "yes",        pro: "yes" },
  { label: "Health & Calendar sync",   free: "no",         plus: "soon",       pro: "soon" },
  { label: "Autonomous AI Coach",      free: "no",         plus: "no",         pro: "yes" },
  { label: "AI reflection sessions",   free: "no",         plus: "no",         pro: "yes" },
  { label: "Custom recovery plans",    free: "no",         plus: "no",         pro: "yes" },
  { label: "API & Webhook access",     free: "no",         plus: "no",         pro: "yes" },
  { label: "Identity & Sentiment AI",  free: "no",         plus: "no",         pro: "yes" },
  { label: "Team & Family Spaces",     free: "no",         plus: "no",         pro: "soon" },
  { label: "Zapier / IFTTT",           free: "no",         plus: "no",         pro: "soon" },
];

function CellValue({ value, highlight }: { value: Cell; highlight?: boolean }) {
  if (value === "yes") {
    return (
      <div className="flex justify-center">
        <Check className={`w-4 h-4 ${highlight ? "text-violet-400" : "text-violet-500/70"}`} />
      </div>
    );
  }
  if (value === "no") {
    return (
      <div className="flex justify-center">
        <Minus className="w-4 h-4 text-slate-700" />
      </div>
    );
  }
  if (value === "soon") {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-0.5 bg-violet-950 border border-violet-700/40 text-violet-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          <Clock className="w-2 h-2" />
          Soon
        </span>
      </div>
    );
  }
  return (
    <p className={`text-center text-xs font-medium ${highlight ? "text-slate-200" : "text-slate-400"}`}>
      {value}
    </p>
  );
}

export default function UpgradeModal({ onClose }: Props) {
  const [loading, setLoading] = useState<"plus" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (plan: "plus" | "pro") => {
    setLoading(plan);
    setError(null);
    try {
      const priceId =
        plan === "plus"
          ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
          : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
      await startCheckout(priceId);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-[#0f0f1a] border border-violet-700/40 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-900/60 to-purple-900/30 px-6 pt-6 pb-5 border-b border-violet-800/30 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-600/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
                Free plan limit reached
              </p>
              <h2 className="text-lg font-bold text-white">Choose your plan</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            You&apos;ve reached the{" "}
            <span className="text-violet-400 font-medium">{FREE_HABIT_LIMIT} habit limit</span> on
            the free plan. Upgrade to unlock everything.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/30 rounded-xl px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {/* Plan cards — 3 columns */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Free */}
            <div className="bg-[#0a0a14] border border-violet-900/20 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Free</span>
              </div>
              <p className="text-[10px] text-slate-600 mb-2 font-medium">The Foundation</p>
              <div className="mb-4">
                <span className="text-2xl font-extrabold text-white">$0</span>
                <span className="text-slate-600 text-xs ml-1">/ mo</span>
              </div>
              <div className="mt-auto">
                <button
                  onClick={onClose}
                  className="w-full py-2 border border-violet-900/40 text-slate-500 text-xs font-semibold rounded-lg transition-all hover:text-slate-300 hover:border-violet-800/50"
                >
                  Current plan
                </button>
              </div>
            </div>

            {/* Plus */}
            <div className="relative bg-violet-950/30 border border-violet-600/50 rounded-xl p-4 flex flex-col">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-0.5 bg-violet-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-violet-900/40">
                  <Sparkles className="w-2.5 h-2.5" />
                  Most Popular
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wide">Plus</span>
              </div>
              <p className="text-[10px] text-violet-400/70 mb-2 font-medium">The Optimizer</p>
              <div className="mb-4">
                <span className="text-2xl font-extrabold text-white">$7</span>
                <span className="text-slate-400 text-xs ml-1">/ mo</span>
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => handleCheckout("plus")}
                  disabled={loading !== null}
                  className="w-full py-2 border border-violet-500/60 hover:border-violet-400 text-violet-300 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading === "plus" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  Get Plus
                </button>
              </div>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-b from-violet-900/35 to-violet-950/20 border border-violet-500/60 rounded-xl p-4 flex flex-col shadow-lg shadow-violet-950/30">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-orange-900/40">
                  <Brain className="w-2.5 h-2.5" />
                  Best Value
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wide">Pro</span>
              </div>
              <p className="text-[10px] text-violet-400/70 mb-2 font-medium">Behavioral Scientist</p>
              <div className="mb-4">
                <span className="text-2xl font-extrabold text-white">$12</span>
                <span className="text-slate-400 text-xs ml-1">/ mo</span>
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => handleCheckout("pro")}
                  disabled={loading !== null}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading === "pro" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Get Pro
                </button>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="border border-violet-900/25 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_72px_72px_72px] bg-[#0a0a14] border-b border-violet-900/20 px-4 py-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Feature</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Free</p>
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider text-center">Plus</p>
              <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wider text-center">Pro</p>
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_72px_72px_72px] px-4 py-2.5 items-center ${
                  i % 2 === 0 ? "bg-[#0f0f1a]" : "bg-[#0a0a14]"
                }`}
              >
                <p className="text-xs text-slate-400">{row.label}</p>
                <CellValue value={row.free} />
                <CellValue value={row.plus} highlight />
                <CellValue value={row.pro} highlight />
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">
            14-day free trial · Cancel anytime · No credit card required
          </p>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mt-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
