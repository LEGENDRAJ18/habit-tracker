"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Sparkles, Check, Minus, Zap, Loader2, Brain, Crown, Lock, ClipboardList } from "lucide-react";
import { FREE_HABIT_LIMIT } from "@/types";

export type UpgradeReason = "habits" | "ai" | "reminders" | "export" | "pro_feature";

interface Props {
  onClose: () => void;
  reason?: UpgradeReason;
  fromPlus?: boolean; // Plus → Pro only modal
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

type Cell = "yes" | "no" | string;

interface ComparisonRow { label: string; free: Cell; plus: Cell; pro: Cell; proOnly?: boolean }

const ROWS: ComparisonRow[] = [
  { label: "Active habits",          free: `${FREE_HABIT_LIMIT}`,  plus: "Unlimited",  pro: "Unlimited"  },
  { label: "Full analytics",         free: "Basic",   plus: "yes",        pro: "yes"        },
  { label: "AI coaching insights",   free: "no",      plus: "5 / day",    pro: "Unlimited", proOnly: true },
  { label: "Streak protection",      free: "no",      plus: "yes",        pro: "yes"        },
  { label: "Email reminders",        free: "no",      plus: "yes",        pro: "yes"        },
  { label: "Weekly AI email report", free: "no",      plus: "no",         pro: "yes",       proOnly: true },
  { label: "CSV data export",        free: "no",      plus: "no",         pro: "yes",       proOnly: true },
];

const REASON_COPY: Record<UpgradeReason, { title: string; sub: string }> = {
  habits:      { title: `You've hit the ${FREE_HABIT_LIMIT} habit limit`, sub: "Upgrade to Plus for unlimited habits and full analytics." },
  ai:          { title: "AI coaching is a Plus & Pro feature",            sub: "Upgrade to unlock personalized AI insights and 7-day plans." },
  reminders:   { title: "Email reminders are a Plus feature",             sub: "Upgrade to Plus to set daily reminder emails for your habits." },
  export:      { title: "Data export is a Pro feature",                   sub: "Upgrade to Pro to download your full habit history as CSV." },
  pro_feature: { title: "This is a Pro-exclusive feature",                sub: "Upgrade to Pro to unlock unlimited AI, weekly reports, and data export." },
};

function CellValue({ value, highlight, proOnly }: { value: Cell; highlight?: boolean; proOnly?: boolean }) {
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
  return (
    <p className={`text-center text-xs font-medium ${highlight ? proOnly ? "text-amber-300" : "text-slate-200" : "text-slate-400"}`}>
      {value}
    </p>
  );
}

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 bg-amber-900/30 border border-amber-600/40 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 leading-none">
      <Crown className="w-2 h-2" />
      PRO
    </span>
  );
}

const CONSENT_BULLETS: Record<"plus" | "pro", string[]> = {
  plus: [
    "Free for 7 days — no charge today",
    "Then $7 NZD/month, billed monthly",
    "Cancel anytime before trial ends — no charge",
    "7-day money back guarantee after first charge",
  ],
  pro: [
    "$12 NZD/month, billed monthly",
    "Cancel anytime — no cancellation fees",
    "7-day money back guarantee on first payment",
  ],
};

interface ConsentModalProps {
  plan: "plus" | "pro";
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConsentModal({ plan, loading, onConfirm, onCancel }: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const bullets = CONSENT_BULLETS[plan];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-violet-700/40 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-900/50 to-purple-900/20 px-5 pt-5 pb-4 border-b border-violet-800/30">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/25 border border-violet-600/40 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Review &amp; confirm</p>
              <h2 className="text-base font-bold text-white leading-tight">Before you continue 📋</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Summary bullets */}
          <ul className="space-y-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <div className="h-px bg-violet-900/20" />

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border transition-all ${
                  agreed
                    ? "bg-violet-600 border-violet-500"
                    : "bg-transparent border-violet-700/60 group-hover:border-violet-600/80"
                } flex items-center justify-center`}
              >
                {agreed && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
            </div>
            <span className="text-xs text-slate-400 leading-relaxed">
              I agree to the{" "}
              <Link
                href="/payment-policy"
                target="_blank"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Payment Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </Link>
            </span>
          </label>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={onConfirm}
              disabled={!agreed || loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continue to payment →
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeModal({ onClose, reason = "habits", fromPlus = false }: Props) {
  const [loading, setLoading] = useState<"plus" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"plus" | "pro" | null>(null);
  const copy = REASON_COPY[reason];

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

  const requestCheckout = (plan: "plus" | "pro") => {
    setPendingPlan(plan);
  };

  return (
    <>
    {pendingPlan && (
      <ConsentModal
        plan={pendingPlan}
        loading={loading === pendingPlan}
        onConfirm={() => handleCheckout(pendingPlan)}
        onCancel={() => setPendingPlan(null)}
      />
    )}
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
              {fromPlus ? <Crown className="w-5 h-5 text-amber-400" /> : <Lock className="w-5 h-5 text-violet-400" />}
            </div>
            <div>
              <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
                {fromPlus ? "Upgrade to Pro" : "Upgrade your plan"}
              </p>
              <h2 className="text-lg font-bold text-white">{copy.title}</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400">{copy.sub}</p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/30 rounded-xl px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {/* Plan cards */}
          <div className={`grid gap-3 mb-6 ${fromPlus ? "grid-cols-1 max-w-xs mx-auto" : "grid-cols-3"}`}>
            {!fromPlus && (
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
            )}

            {!fromPlus && (
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
                <div className="mb-1">
                  <span className="text-2xl font-extrabold text-white">Free</span>
                  <span className="text-violet-300 text-xs ml-1 font-semibold">7-day trial</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">then $7 NZD / mo</p>
                <ul className="space-y-1 mb-4">
                  {["Unlimited habits", "Full analytics", "5 AI insights/day", "Streak protection", "Email reminders"].map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Check className="w-3 h-3 text-violet-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <button
                    onClick={() => requestCheckout("plus")}
                    disabled={loading !== null}
                    className="w-full py-2 border border-violet-500/60 hover:border-violet-400 text-violet-300 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading === "plus" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Start free trial
                  </button>
                </div>
              </div>
            )}

            <div className="relative bg-gradient-to-b from-violet-900/35 to-violet-950/20 border border-amber-500/40 rounded-xl p-4 flex flex-col shadow-lg shadow-violet-950/30">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-orange-900/40">
                  <Brain className="w-2.5 h-2.5" />
                  {fromPlus ? "Unlock Everything" : "Best Value"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">Pro</span>
              </div>
              <p className="text-[10px] text-amber-400/70 mb-2 font-medium">The Behavioral Scientist</p>
              <div className="mb-4">
                <span className="text-2xl font-extrabold text-white">$12</span>
                <span className="text-slate-400 text-xs ml-1">/ mo</span>
              </div>
              <ul className="space-y-1 mb-4">
                {["Everything in Plus", "Unlimited AI insights", "Weekly AI email report", "CSV data export"].map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-[10px] text-amber-200/80">
                    <Check className="w-3 h-3 text-amber-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <button
                  onClick={() => requestCheckout("pro")}
                  disabled={loading !== null}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-orange-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading === "pro" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3 h-3" />}
                  Get Pro — $12/mo
                </button>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          {!fromPlus && (
            <div className="border border-violet-900/25 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_72px_72px_72px] bg-[#0a0a14] border-b border-violet-900/20 px-4 py-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Feature</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Free</p>
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider text-center">Plus</p>
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider text-center">Pro</p>
              </div>
              {ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1fr_72px_72px_72px] px-4 py-2.5 items-center ${i % 2 === 0 ? "bg-[#0f0f1a]" : "bg-[#0a0a14]"}`}
                >
                  <p className="text-xs text-slate-400">
                    {row.label}
                    {row.proOnly && <ProBadge />}
                  </p>
                  <CellValue value={row.free} />
                  <CellValue value={row.plus} highlight />
                  <CellValue value={row.pro} highlight proOnly={row.proOnly} />
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-600 mt-4">
            Cancel anytime · No credit card required for free plan
          </p>

          <p className="text-center text-[11px] text-slate-700 mt-3">
            By subscribing you agree to our{" "}
            <Link href="/payment-policy" className="text-slate-600 hover:text-slate-400 underline underline-offset-2 transition-colors" target="_blank">
              Payment Policy
            </Link>
            {" "}· 7-day money-back guarantee
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
    </>
  );
}
