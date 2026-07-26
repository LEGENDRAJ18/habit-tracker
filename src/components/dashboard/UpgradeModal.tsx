"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, Check, Minus, Zap, Loader2, Brain, Crown, Lock, ClipboardList } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useProfile } from "@/hooks/useProfile";
import CenteredModal from "@/components/ui/CenteredModal";
import posthog from "posthog-js";

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
  { label: "Habits",                 free: "Unlimited", plus: "Unlimited",  pro: "Unlimited"  },
  { label: "Full AI coach",          free: "yes",       plus: "yes",        pro: "yes"        },
  { label: "Identity Score",         free: "yes",       plus: "yes",        pro: "yes"        },
  { label: "Friends & leaderboard",  free: "yes",       plus: "yes",        pro: "yes"        },
  { label: "Habit Battles",          free: "2 / month", plus: "Unlimited",  pro: "Unlimited"  },
  { label: "Full Habit DNA",         free: "Basic",     plus: "yes",        pro: "yes"        },
  { label: "Commitment Contracts",   free: "no",        plus: "yes",        pro: "yes"        },
  { label: "Group habits",           free: "no",        plus: "yes",        pro: "yes"        },
  { label: "Weekly AI email report", free: "no",        plus: "yes",        pro: "yes"        },
  { label: "Deep AI Memory",         free: "no",        plus: "no",         pro: "yes",       proOnly: true },
  { label: "University Goal Mode",   free: "no",        plus: "no",         pro: "yes",       proOnly: true },
  { label: "Monthly Wrapped",        free: "no",        plus: "no",         pro: "yes",       proOnly: true },
  { label: "AI Habit Suggestions",   free: "no",        plus: "no",         pro: "yes",       proOnly: true },
];

const REASON_COPY: Record<UpgradeReason, { title: string; sub: string }> = {
  habits:      { title: "Unlock the full HabitAI experience",             sub: "Start your 7-day Plus trial — no credit card needed." },
  ai:          { title: "Unlock advanced AI coaching",                    sub: "Get personalised weekly game plans, deep memory, and voice check-ins." },
  reminders:   { title: "Email reminders are a Plus feature",             sub: "Upgrade to Plus to set daily reminder emails for your habits." },
  export:      { title: "Data export is a Pro feature",                   sub: "Upgrade to Pro to download your full habit history as CSV." },
  pro_feature: { title: "This is a Pro-exclusive feature",                sub: "Unlock deep AI memory, University Goal Mode, Monthly Wrapped, and more." },
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

function consentBullets(plan: "plus" | "pro", plusPrice: string, proPrice: string): string[] {
  if (plan === "plus") return [
    "Free for 7 days — no charge today",
    `Then ${plusPrice}/month, billed monthly`,
    "Cancel anytime before trial ends — no charge",
    "7-day Plus trial, no credit card required",
  ];
  return [
    `Billed ${proPrice}/month immediately`,
    "Cancel anytime — no lock-in",
    "7-day money-back guarantee",
  ];
}

interface ConsentModalProps {
  plan: "plus" | "pro";
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  plusPrice: string;
  proPrice: string;
  currency: string;
}

function ConsentModal({ plan, loading, onConfirm, onCancel, plusPrice, proPrice, currency }: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const bullets = consentBullets(plan, plusPrice, proPrice);
  return (
    <CenteredModal onClose={onCancel} zIndex="z-[60]" backdrop="bg-black/60 backdrop-blur-sm">
      <div className="modal-center-enter w-full max-w-sm bg-[#0f0f1a] border border-violet-700/40 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden">
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

          {/* Currency disclaimer */}
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Prices shown in {currency} · Charged in USD by Stripe
          </p>

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
    </CenteredModal>
  );
}

export default function UpgradeModal({ onClose, reason = "habits", fromPlus = false }: Props) {
  const [loading, setLoading] = useState<"plus" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"plus" | "pro" | null>(null);
  const copy = REASON_COPY[reason];
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();
  const { tier: currentTier } = useProfile();
  const plusPrice = currencyLoading ? "$4.99" : formatPrice(4.99);
  const proPrice  = currencyLoading ? "$9.99"  : formatPrice(9.99);

  useEffect(() => {
    posthog.capture("upgrade_modal_viewed", { reason, from_plus: fromPlus });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (plan: "plus" | "pro") => {
    setLoading(plan);
    setError(null);
    try {
      const priceId =
        plan === "plus"
          ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
          : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10_000)
      );
      await Promise.race([startCheckout(priceId), timeout]);
    } catch (err) {
      setError(err instanceof Error && err.message === "timeout"
        ? "Payment page is taking too long. Please try again."
        : "Something went wrong. Please try again.");
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
        plusPrice={plusPrice}
        proPrice={proPrice}
        currency={currency}
      />
    )}
    <CenteredModal onClose={onClose} backdrop="bg-black/70 backdrop-blur-sm">
      <div className="modal-center-enter w-full max-w-2xl bg-[#0f0f1a] border border-violet-700/40 rounded-2xl shadow-2xl shadow-violet-950/60 overflow-hidden flex flex-col max-h-[90vh]">

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
                <ul className="space-y-1 mb-4">
                  {[
                    { f: "Unlimited habits", ok: true },
                    { f: "Full AI coach", ok: true },
                    { f: "Friends & leaderboard", ok: true },
                    { f: "Habit Battles (2/month)", ok: true },
                    { f: "XP & leveling system", ok: true },
                    { f: "Unlimited Battles", ok: false },
                    { f: "Group habits", ok: false },
                  ].map(({ f, ok }) => (
                    <li key={f} className={`flex items-center gap-1.5 text-[10px] ${ok ? "text-slate-400" : "text-slate-600"}`}>
                      {ok ? <Check className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <Minus className="w-3 h-3 text-slate-700 flex-shrink-0" />}
                      {f}
                    </li>
                  ))}
                </ul>
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
                <p className="text-[10px] text-slate-500 mb-1">then {plusPrice} / mo</p>
                <p className="text-[9px] text-slate-700 mb-3">Prices shown in {currency} · Charged in USD</p>
                <ul className="space-y-1 mb-4">
                  {[
                    { f: "Everything in Free", ok: true },
                    { f: "Unlimited Habit Battles", ok: true },
                    { f: "Full Habit DNA shareable card", ok: true },
                    { f: "Commitment Contracts", ok: true },
                    { f: "Group habits", ok: true },
                    { f: "Weekly AI email report", ok: true },
                    { f: "Priority support", ok: true },
                    { f: "Deep AI memory", ok: false },
                    { f: "University Goal Mode", ok: false },
                    { f: "Monthly Wrapped", ok: false },
                  ].map(({ f, ok }) => (
                    <li key={f} className={`flex items-center gap-1.5 text-[10px] ${ok ? "text-slate-400" : "text-slate-600"}`}>
                      {ok ? <Check className="w-3 h-3 text-violet-500 flex-shrink-0" /> : <Minus className="w-3 h-3 text-slate-700 flex-shrink-0" />}
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {currentTier === "plus" ? (
                    <button disabled className="w-full py-2 border border-violet-700/30 text-violet-600 text-xs font-bold rounded-lg cursor-default opacity-60">
                      Current plan
                    </button>
                  ) : currentTier === "pro" ? (
                    <button disabled className="w-full py-2 border border-violet-700/30 text-violet-600 text-xs font-bold rounded-lg cursor-default opacity-60">
                      ✓ Already included
                    </button>
                  ) : (
                    <button
                      onClick={() => requestCheckout("plus")}
                      disabled={loading !== null}
                      className="w-full py-2 border border-violet-500/60 hover:border-violet-400 text-violet-300 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading === "plus" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Start 7-day free trial
                    </button>
                  )}
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
              <p className="text-[10px] text-amber-400/70 mb-2 font-medium">The Full Experience</p>
              <div className="mb-1">
                <span className="text-2xl font-extrabold text-white">{proPrice}</span>
                <span className="text-slate-400 text-xs ml-1">/ mo</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-1">Billed immediately · 7-day money-back guarantee</p>
              <p className="text-[9px] text-slate-700 mb-3">Prices shown in {currency} · Charged in USD</p>
              <ul className="space-y-1 mb-4">
                {[
                  { f: "Everything in Plus" },
                  { f: "Deep AI Memory" },
                  { f: "Voice check-ins" },
                  { f: "Monthly Wrapped summary" },
                  { f: "University Goal Mode" },
                  { f: "AI remembers your excuses" },
                  { f: "Early access to new features" },
                ].map(({ f }) => (
                  <li key={f} className="flex items-center gap-1.5 text-[10px] text-amber-200/80">
                    <Check className="w-3 h-3 text-amber-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {currentTier === "pro" ? (
                  <button disabled className="w-full py-2 bg-gradient-to-r from-amber-500/40 to-orange-500/40 text-white/60 text-xs font-bold rounded-lg cursor-default">
                    Current plan
                  </button>
                ) : (
                  <button
                    onClick={() => requestCheckout("pro")}
                    disabled={loading !== null}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-orange-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading === "pro" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3 h-3" />}
                    Upgrade to Pro
                  </button>
                )}
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
            Plus: 7-day free trial · No credit card needed
          </p>

          <p className="text-center text-[11px] text-slate-700 mt-3">
            By subscribing you agree to our{" "}
            <Link href="/payment-policy" className="text-slate-600 hover:text-slate-400 underline underline-offset-2 transition-colors" target="_blank">
              Payment Policy
            </Link>
            {" "}· Plus: free for 7 days, then billed monthly · Pro: billed immediately
          </p>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors mt-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </CenteredModal>
    </>
  );
}
