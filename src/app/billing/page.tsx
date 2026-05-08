"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CreditCard, Zap, Brain, Check, Loader2,
  ExternalLink, AlertCircle, CheckCircle2, Crown, Diamond,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import type { Plan } from "@/types";
import { useCurrency } from "@/contexts/CurrencyContext";

const PLAN_META: Record<Plan, { label: string; desc: string; icon: React.ReactNode; color: string; border: string }> = {
  free: {
    label: "Free",
    desc:  "The Foundation — great for getting started.",
    icon:  <Zap className="w-5 h-5 text-slate-400" />,
    color: "text-slate-300",
    border: "border-violet-900/20",
  },
  plus: {
    label: "Plus",
    desc:  "The Optimizer — unlimited habits, full history.",
    icon:  <Crown className="w-5 h-5 text-violet-400" />,
    color: "text-violet-300",
    border: "border-violet-600/40",
  },
  pro: {
    label: "Pro",
    desc:  "The Behavioral Scientist — AI coaching & more.",
    icon:  <Diamond className="w-5 h-5 text-amber-300" />,
    color: "text-amber-300",
    border: "border-amber-400/40",
  },
};

function PlanCard({ tier, current }: { tier: Plan; current: boolean }) {
  const meta = PLAN_META[tier];
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();
  const planPrice = tier === "free" ? "$0/mo"
    : tier === "plus" ? (currencyLoading ? "$5.99/mo" : `${formatPrice(5.99)}/mo`)
    : (currencyLoading ? "$9.99/mo" : `${formatPrice(9.99)}/mo`);
  return (
    <div className={`relative bg-[#0f0f1a] border ${meta.border} rounded-2xl p-5 flex items-start gap-4 ${current ? "ring-2 ring-violet-600/30" : ""}`}>
      {current && (
        <div className="absolute -top-3 left-4">
          <span className="inline-flex items-center gap-1 bg-violet-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <Check className="w-2.5 h-2.5" /> Current plan
          </span>
        </div>
      )}
      <div className="mt-0.5 flex-shrink-0">{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`font-bold text-base ${meta.color}`}>{meta.label}</p>
          <div className="text-right">
            <span className="text-sm font-semibold text-slate-400">{planPrice}</span>
            {tier !== "free" && !currencyLoading && (
              <p className="text-[9px] text-slate-700 mt-0.5">Prices in {currency} · Charged in USD</p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();

  const [tier,        setTier]        = useState<Plan>("free");
  const [pageLoading, setPageLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
    });
    supabase
      .from("profiles")
      .select("subscription_tier")
      .single()
      .then(({ data }) => {
        if (data?.subscription_tier) setTier(data.subscription_tier as Plan);
        setPageLoading(false);
      });

    // Handle Stripe return params
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "success") setSuccessMsg("Plan updated successfully! Welcome to your new plan.");
    if (params.get("upgrade") === "cancel")  setError("Checkout was cancelled. No charge was made.");
  }, [supabase, router]);

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setPortalLoading(false);
    }
  };

  const startCheckout = async (plan: Plan) => {
    const priceId =
      plan === "plus"
        ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
        : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
    setCheckoutLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not start checkout.");
        setCheckoutLoading(null);
      }
    } catch {
      setError("Network error. Please try again.");
      setCheckoutLoading(null);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  const isPaid = tier !== "free";

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">Billing</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Status messages */}
        {successMsg && (
          <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Current plan */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Current Plan</h2>
          </div>
          <PlanCard tier={tier} current />

          {/* Manage billing (paid only) */}
          {isPaid && (
            <div className="mt-4 bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-1">Manage subscription</p>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Update your payment method, view invoices, change plans, or cancel your
                subscription through the Stripe billing portal.
              </p>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all"
              >
                {portalLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ExternalLink className="w-3.5 h-3.5" />}
                Open billing portal
              </button>
            </div>
          )}
        </section>

        {/* Upgrade options (non-pro users) */}
        {tier !== "pro" && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">
                {tier === "free" ? "Upgrade your plan" : "Upgrade to Pro"}
              </h2>
            </div>

            <div className="space-y-3">
              {(tier === "free" ? (["plus", "pro"] as Plan[]) : (["pro"] as Plan[])).map((plan) => {
                const meta = PLAN_META[plan];
                const features =
                  plan === "plus"
                    ? ["Unlimited habits", "Full analytics dashboard", "5 AI insights/day", "Streak protection", "Daily email reminders"]
                    : ["Everything in Plus", "Unlimited AI insights", "Weekly AI email report", "CSV data export"];

                return (
                  <div
                    key={plan}
                    className={`bg-[#0f0f1a] border ${meta.border} rounded-2xl p-5`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div>{meta.icon}</div>
                        <div>
                          <p className={`font-bold ${meta.color}`}>{meta.label}</p>
                          <p className="text-xs text-slate-500">
                            {currencyLoading
                              ? (plan === "plus" ? "$5.99/mo" : "$9.99/mo")
                              : `${formatPrice(plan === "plus" ? 5.99 : 9.99)}/mo`}
                          </p>
                          {!currencyLoading && (
                            <p className="text-[9px] text-slate-700 mt-0.5">
                              Prices in {currency} · Charged in USD
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startCheckout(plan)}
                        disabled={!!checkoutLoading}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                          plan === "pro"
                            ? "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300"
                            : "bg-violet-600 hover:bg-violet-500 text-white"
                        }`}
                      >
                        {checkoutLoading === plan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Upgrade
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                          <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Cancellation note */}
        {isPaid && (
          <div className="bg-[#0f0f1a] border border-violet-900/15 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 mb-2">Cancel anytime</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              To cancel your subscription, open the billing portal above and choose
              &quot;Cancel plan&quot;. Your access continues until the end of the current billing period —
              you will not be charged again.
            </p>
          </div>
        )}

        {/* FAQ */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Common questions</p>
          {[
            {
              q: "When is my next billing date?",
              a: "Your billing date is set from when you first subscribed. Open the billing portal to see your exact next charge date.",
            },
            {
              q: "Can I switch between Plus and Pro?",
              a: "Yes. Use the billing portal to change plans. Upgrades take effect immediately; downgrades take effect at the end of the current period.",
            },
            {
              q: "Do you offer refunds?",
              a: "We don't offer pro-rated refunds but will consider exceptions. Contact support@habitai.app within 14 days of a charge.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="bg-[#0f0f1a] border border-violet-900/15 rounded-xl px-4 py-4">
              <p className="text-sm font-semibold text-white mb-1.5">{q}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
