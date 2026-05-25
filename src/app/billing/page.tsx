"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CreditCard, Check, Loader2,
  ExternalLink, AlertCircle, CheckCircle2, Sparkles, Crown,
  Zap, Brain, Mic, Calendar, Users, Shield, BarChart3,
  Star, Flame, Globe, Dna, BookOpen, Clock, Bell, Gift,
} from "lucide-react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import type { Plan } from "@/types";
import { useCurrency } from "@/contexts/CurrencyContext";

// ─── Plan feature data ────────────────────────────────────────────────────────

const FREE_FEATURES = [
  { icon: Flame,     text: "Up to 3 habits" },
  { icon: Check,     text: "Basic habit tracking and streaks" },
  { icon: Brain,     text: "Identity Score" },
  { icon: Dna,       text: "Basic Habit DNA preview" },
  { icon: Sparkles,  text: "AI habit suggestions" },
  { icon: Users,     text: "Friends and leaderboard" },
  { icon: Globe,     text: "PWA installable on phone" },
];

const PLUS_FEATURES = [
  { icon: Check,     text: "Everything in Free" },
  { icon: Star,      text: "Unlimited habits" },
  { icon: Dna,       text: "Full Habit DNA shareable card" },
  { icon: Shield,    text: "Habit Battles with friends" },
  { icon: Globe,     text: "Public Commitment Contracts" },
  { icon: BarChart3, text: "Detailed analytics and insights" },
  { icon: Bell,      text: "Priority support" },
];

const PRO_FEATURES = [
  { icon: Check,     text: "Everything in Plus" },
  { icon: Brain,     text: "Deep AI Memory" },
  { icon: Mic,       text: "Voice Check-ins" },
  { icon: Calendar,  text: "Monthly Wrapped shareable report" },
  { icon: Sparkles,  text: "AI calls out your excuses personally" },
  { icon: BarChart3, text: "Advanced performance insights" },
  { icon: Gift,      text: "Early access to new features" },
];

// ─── Annual price helpers ─────────────────────────────────────────────────────

const MONTHLY_PLUS = 4.99;
const MONTHLY_PRO  = 9.99;
const ANNUAL_MULT  = 10 / 12; // 2 months free

function annualMonthly(m: number) { return +(m * ANNUAL_MULT).toFixed(2); }

// ─── PricingCard ──────────────────────────────────────────────────────────────

interface PricingCardProps {
  plan:            Plan;
  currentTier:     Plan;
  annual:          boolean;
  checkoutLoading: Plan | null;
  portalLoading:   boolean;
  onUpgrade:       (plan: Plan) => void;
  onPortal:        () => void;
}

function PricingCard({ plan, currentTier, annual, checkoutLoading, portalLoading, onUpgrade, onPortal }: PricingCardProps) {
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();
  const isCurrent = currentTier === plan;
  const canUpgrade = plan !== "free" && (
    (plan === "plus" && currentTier === "free") ||
    (plan === "pro"  && currentTier !== "pro")
  );

  const monthlyBase = plan === "plus" ? MONTHLY_PLUS : plan === "pro" ? MONTHLY_PRO : 0;
  const displayMonthly = annual ? annualMonthly(monthlyBase) : monthlyBase;

  const fmtPrice = (v: number) => currencyLoading ? `$${v.toFixed(2)}` : formatPrice(v);

  // Style config per plan
  const cfg = {
    free: {
      badge:      null,
      badgeCls:   "",
      border:     "border-violet-900/25",
      ring:       "",
      headerGrad: "from-slate-800/60 to-slate-900/40",
      iconBg:     "bg-slate-800/80",
      Icon:       Zap,
      iconCls:    "text-slate-400",
      nameCls:    "text-slate-200",
      checkCls:   "text-emerald-400",
      btnCls:     "",
      btnLabel:   "Current plan",
    },
    plus: {
      badge:      "Most Popular",
      badgeCls:   "bg-violet-600 text-white",
      border:     "border-violet-500/50",
      ring:       "ring-2 ring-violet-500/20",
      headerGrad: "from-violet-900/50 to-violet-950/30",
      iconBg:     "bg-violet-700/50",
      Icon:       Crown,
      iconCls:    "text-violet-300",
      nameCls:    "text-violet-200",
      checkCls:   "text-violet-400",
      btnCls:     "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25",
      btnLabel:   "Upgrade to Plus",
    },
    pro: {
      badge:      "Best Value",
      badgeCls:   "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
      border:     "border-amber-400/40",
      ring:       "ring-2 ring-amber-400/15",
      headerGrad: "from-amber-900/30 to-amber-950/20",
      iconBg:     "bg-amber-700/30",
      Icon:       BookOpen,
      iconCls:    "text-amber-300",
      nameCls:    "text-amber-200",
      checkCls:   "text-amber-400",
      btnCls:     "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25",
      btnLabel:   currentTier === "plus" ? "Upgrade to Pro" : "Upgrade to Pro",
    },
  }[plan];

  const features = plan === "free" ? FREE_FEATURES : plan === "plus" ? PLUS_FEATURES : PRO_FEATURES;

  return (
    <div className={`relative bg-[#0c0c18] border ${cfg.border} ${cfg.ring} rounded-2xl overflow-hidden flex flex-col`}>
      {/* Popular / Best Value badge */}
      {cfg.badge && (
        <div className="absolute top-0 right-0">
          <div className={`${cfg.badgeCls} text-[10px] font-bold px-3 py-1 rounded-bl-xl`}>
            {cfg.badge}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`bg-gradient-to-br ${cfg.headerGrad} px-5 pt-6 pb-5 border-b border-white/5`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 ${cfg.iconBg} rounded-xl flex items-center justify-center`}>
            <cfg.Icon className={`w-5 h-5 ${cfg.iconCls}`} />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${cfg.nameCls}`}>
              {plan === "free" ? "Free" : plan === "plus" ? "Plus" : "Pro"}
            </h3>
            {isCurrent && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                Your plan
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        {plan === "free" ? (
          <div>
            <span className="text-3xl font-black text-white">$0</span>
            <span className="text-sm text-slate-500 ml-1">forever</span>
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-white">{fmtPrice(displayMonthly)}</span>
              <span className="text-sm text-slate-400 mb-1">/mo</span>
            </div>
            {annual && (
              <p className="text-[11px] text-emerald-400 mt-0.5">
                Billed {fmtPrice(displayMonthly * 10)}/yr · 2 months free
              </p>
            )}
            {!annual && (
              <p className="text-[11px] text-slate-600 mt-0.5">or {fmtPrice(annualMonthly(monthlyBase))}/mo billed annually</p>
            )}
            {!currencyLoading && (
              <p className="text-[9px] text-slate-700 mt-0.5">Prices shown in {currency} · Charged in USD</p>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="px-5 py-4 flex-1">
        <ul className="space-y-2.5">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                text.startsWith("Everything") ? "bg-emerald-950/50" : `bg-${plan === "pro" ? "amber" : plan === "plus" ? "violet" : "emerald"}-950/50`
              }`}>
                <Check className={`w-2.5 h-2.5 ${cfg.checkCls}`} />
              </div>
              <span className={`text-sm leading-snug ${text.startsWith("Everything") ? "font-semibold text-slate-300" : "text-slate-400"}`}>
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        {isCurrent && plan !== "free" ? (
          <button
            onClick={onPortal}
            disabled={portalLoading}
            className="w-full py-3 border border-violet-800/40 text-slate-400 hover:text-white hover:border-violet-600/60 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Manage subscription
          </button>
        ) : isCurrent && plan === "free" ? (
          <div className="w-full py-3 bg-slate-800/50 text-slate-500 text-sm font-semibold rounded-xl text-center">
            Current plan
          </div>
        ) : canUpgrade ? (
          <button
            onClick={() => onUpgrade(plan)}
            disabled={!!checkoutLoading}
            className={`relative w-full py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden ${cfg.btnCls}`}
          >
            {checkoutLoading === plan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {checkoutLoading !== plan && cfg.btnLabel}
            {checkoutLoading === plan && "Processing…"}
            {/* shimmer */}
            {checkoutLoading !== plan && (
              <span className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.08) 50%,transparent 60%)", animation: "pricingShimmer 2.5s linear infinite" }} />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [tier,            setTier]            = useState<Plan>("free");
  const [annual,          setAnnual]          = useState(false);
  const [pageLoading,     setPageLoading]     = useState(true);
  const [portalLoading,   setPortalLoading]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [successMsg,      setSuccessMsg]      = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => { if (!user) router.push("/auth/login"); })
      .catch(() => router.push("/auth/login"));

    const upgradeParam = new URLSearchParams(window.location.search).get("upgrade");
    if (upgradeParam === "success") setSuccessMsg("Plan updated successfully! Welcome to your new plan.");
    if (upgradeParam === "cancel")  setError("Checkout was cancelled. No charge was made.");

    supabase
      .from("profiles")
      .select("subscription_tier")
      .single()
      .then(({ data }) => {
        const newTier = (data?.subscription_tier as Plan) ?? "free";
        if (data?.subscription_tier) setTier(newTier);
        setPageLoading(false);

        if (upgradeParam === "success" && !sessionStorage.getItem("ph_upgrade_tracked")) {
          sessionStorage.setItem("ph_upgrade_tracked", "1");
          if (newTier === "plus") posthog.capture("upgraded_to_plus");
          else if (newTier === "pro") posthog.capture("upgraded_to_pro");
        }
      });
  }, [supabase, router]);

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setError(data.error ?? "Could not open billing portal."); setPortalLoading(false); }
    } catch { setError("Network error. Please try again."); setPortalLoading(false); }
  };

  const startCheckout = async (plan: Plan) => {
    // Annual toggle shows discounted price UI but routes to same monthly Stripe until annual SKUs are live
    const priceId = plan === "plus"
      ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
    setCheckoutLoading(plan);
    setError(null);
    try {
      const res  = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceId }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setError(data.error ?? "Could not start checkout."); setCheckoutLoading(null); }
    } catch { setError("Network error. Please try again."); setCheckoutLoading(null); }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-24 sm:pb-8">
      {/* Ambient top glow */}
      <div className="fixed inset-x-0 top-0 h-72 pointer-events-none"
           style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(109,40,217,0.12), transparent)" }} />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">Pricing</span>
        </div>
      </div>

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Title */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>

          {/* Annual / Monthly toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium transition-colors ${!annual ? "text-white" : "text-slate-500"}`}>Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              role="switch"
              aria-checked={annual}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${annual ? "bg-violet-600" : "bg-slate-700"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${annual ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm font-medium transition-colors ${annual ? "text-white" : "text-slate-500"}`}>
              Annual
              <span className="ml-1.5 text-[10px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-1.5 py-0.5 rounded-full">2 months free</span>
            </span>
          </div>
        </div>

        {/* Status messages */}
        {successMsg && (
          <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 text-sm text-emerald-300 mb-6">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-800/40 rounded-xl p-3.5 text-sm text-red-300 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {(["free", "plus", "pro"] as Plan[]).map((plan) => (
            <PricingCard
              key={plan}
              plan={plan}
              currentTier={tier}
              annual={annual}
              checkoutLoading={checkoutLoading}
              portalLoading={portalLoading}
              onUpgrade={startCheckout}
              onPortal={openPortal}
            />
          ))}
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-slate-700" /> Secure checkout via Stripe</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-700" /> Cancel anytime</span>
          <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-slate-700" /> No hidden fees</span>
        </div>

        {/* Manage billing (paid only) */}
        {tier !== "free" && (
          <div className="mt-8 bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold text-white">Manage subscription</p>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Update your payment method, view invoices, change plans, or cancel through the Stripe billing portal.
            </p>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all"
            >
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Open billing portal
            </button>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Common questions</p>
          {[
            { q: "When is my next billing date?", a: "Your billing date is set from when you first subscribed. Open the billing portal to see your exact next charge date." },
            { q: "Can I switch between Plus and Pro?", a: "Yes. Use the billing portal to change plans. Upgrades take effect immediately; downgrades take effect at the end of the current period." },
            { q: "Do you offer refunds?", a: "We don't offer pro-rated refunds but will consider exceptions. Contact support@habitai.app within 14 days of a charge." },
            { q: "Is my data safe if I cancel?", a: "Yes. Your habits and history are preserved for 90 days after cancellation. You can re-subscribe and pick up where you left off." },
          ].map(({ q, a }) => (
            <div key={q} className="bg-[#0f0f1a] border border-violet-900/15 rounded-xl px-4 py-4">
              <p className="text-sm font-semibold text-white mb-1.5">{q}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes pricingShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%);  }
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
