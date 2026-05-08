"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Zap, Loader2, Brain, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import CurrencySelector from "@/components/ui/CurrencySelector";

function Soon() {
  return (
    <span className="inline-flex items-center gap-0.5 bg-violet-950/80 border border-violet-700/40 text-violet-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1.5 leading-none align-middle">
      <Clock className="w-2 h-2" />
      Soon
    </span>
  );
}

type FeatureItem = { label: string; soon?: boolean };

const FREE_FEATURES: FeatureItem[] = [
  { label: "Up to 5 active habits" },
  { label: "Basic streak counters" },
  { label: "7-day completion heatmap" },
  { label: "XP & level system" },
  { label: "Friends & leaderboard" },
];

const PLUS_FEATURES: FeatureItem[] = [
  { label: "Unlimited habits" },
  { label: "Full analytics dashboard" },
  { label: "5 AI coaching insights per day" },
  { label: "Streak protection (freeze)" },
  { label: "Daily email reminders" },
  { label: "Full habit history" },
];

const PRO_FEATURES: FeatureItem[] = [
  { label: "Everything in Plus" },
  { label: "Unlimited AI coaching insights" },
  { label: "Weekly AI email report" },
  { label: "CSV data export" },
  { label: "Custom recovery plans" },
  { label: "Priority support" },
];

function PaidPlanButton({ plan, priceId, primary }: { plan: string; priceId: string; primary?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/auth/signup?plan=${plan.toLowerCase()}`); return; }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 mb-4 disabled:opacity-60 disabled:cursor-not-allowed ${
        primary
          ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40"
          : "border border-violet-700/40 text-slate-300 hover:text-white hover:border-violet-500"
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      Get {plan}
    </button>
  );
}

function FeatureRow({ item, bright }: { item: FeatureItem; bright?: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 text-sm ${bright ? "text-slate-200" : "text-slate-300"}`}>
      <Check className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
      <span>{item.label}{item.soon && <Soon />}</span>
    </div>
  );
}

function PriceDisclaimer({ currency }: { currency: string }) {
  return (
    <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">
      Prices shown in {currency} · Charged in USD by Stripe
    </p>
  );
}

export default function Pricing() {
  const { priceParts, currency, loading } = useCurrency();
  const plus = priceParts(7);
  const pro  = priceParts(12);

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            Simple, transparent pricing
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5">
            Start free.{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Scale when ready.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-4">
            No hidden fees. No surprise charges. Upgrade or cancel at any time.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <span>Display currency:</span>
            <CurrencySelector />
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* ── FREE ── */}
          <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-7 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4.5 h-4.5 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Free</span>
            </div>
            <p className="text-sm font-semibold text-slate-300 mb-2">The Foundation</p>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-white">$0</span>
              <span className="text-slate-500 ml-2 text-sm">/ forever</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Everything you need to start building better habits.</p>

            <Link
              href="/auth/signup"
              className="w-full block text-center py-2.5 rounded-xl border border-violet-700/40 text-slate-300 hover:text-white hover:border-violet-500 transition-all text-sm font-semibold mb-6"
            >
              Start for Free
            </Link>

            <div className="space-y-2.5">
              {FREE_FEATURES.map((f) => <FeatureRow key={f.label} item={f} />)}
            </div>
          </div>

          {/* ── PLUS ── */}
          <div className="relative bg-[#0f0f1a] border border-violet-600/40 rounded-2xl p-7 flex flex-col shadow-xl shadow-violet-950/40">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-violet-900/40">
                <Sparkles className="w-3 h-3" />
                Most Popular
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4.5 h-4.5 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">Plus</span>
            </div>
            <p className="text-sm font-semibold text-violet-200 mb-2">The Optimizer</p>
            <div className="mb-0.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-4xl font-extrabold text-white">{loading ? "$7" : plus.main}</span>
              <span className="text-slate-400 text-sm">{loading ? "" : plus.suffix} / mo</span>
            </div>
            <PriceDisclaimer currency={currency} />
            <p className="text-xs text-slate-500 mt-3 mb-4">For the committed tracker who wants zero limits.</p>

            <PaidPlanButton plan="Plus" priceId={process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!} />

            <div className="space-y-2.5">
              {PLUS_FEATURES.map((f) => <FeatureRow key={f.label} item={f} />)}
            </div>
          </div>

          {/* ── PRO ── */}
          <div className="relative bg-gradient-to-b from-violet-950/70 to-[#0f0f1a] border border-violet-500/50 rounded-2xl p-7 flex flex-col shadow-xl shadow-violet-950/60">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-900/40">
                <Brain className="w-3 h-3" />
                Best Value
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4.5 h-4.5 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">Pro</span>
            </div>
            <p className="text-sm font-semibold text-violet-200 mb-2">The Behavioral Scientist</p>
            <div className="mb-0.5 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-4xl font-extrabold text-white">{loading ? "$12" : pro.main}</span>
              <span className="text-slate-400 text-sm">{loading ? "" : pro.suffix} / mo</span>
            </div>
            <PriceDisclaimer currency={currency} />
            <p className="text-xs text-slate-500 mt-3 mb-4">AI-powered coaching for life-changing habits.</p>

            <PaidPlanButton plan="Pro" priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!} primary />

            <div className="space-y-2.5">
              {PRO_FEATURES.map((f) => <FeatureRow key={f.label} item={f} bright />)}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-500 mt-10">
          14-day free trial on paid plans · Cancel anytime · No credit card required to start
        </p>
      </div>
    </section>
  );
}
