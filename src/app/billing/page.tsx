"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, ExternalLink, AlertCircle, CheckCircle2,
  Sparkles, Crown, Zap, Shield, CreditCard, Clock, ArrowRight,
} from "lucide-react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import type { Plan } from "@/types";
import { useCurrency } from "@/contexts/CurrencyContext";

// ─── Feature lists ────────────────────────────────────────────────────────────

interface Feature {
  text: string;
  isNew?: boolean;
  isEverything?: boolean;
}

const FREE_FEATURES: Feature[] = [
  { text: "Unlimited habits — no limits" },
  { text: "Full AI coach from day one" },
  { text: "Identity Score" },
  { text: "Mood tracking" },
  { text: "Friends and leaderboard" },
  { text: "Habit Battles (2 per month)" },
  { text: "Basic Habit DNA" },
  { text: "Student Success Pack" },
  { text: "PWA — install on your phone" },
];

const PLUS_FEATURES: Feature[] = [
  { text: "Everything in Free", isEverything: true },
  { text: "Unlimited Habit Battles" },
  { text: "Full Habit DNA shareable card" },
  { text: "Public Commitment Contracts", isNew: true },
  { text: "Group habits", isNew: true },
  { text: "Weekly AI email report" },
  { text: "Advanced analytics and insights" },
  { text: "Priority support" },
];

const PRO_FEATURES: Feature[] = [
  { text: "Everything in Plus", isEverything: true },
  { text: "Deep AI Memory" },
  { text: "Voice check-ins" },
  { text: "Monthly Wrapped shareable report", isNew: true },
  { text: "Organisation and School mode" },
  { text: "AI remembers and calls out your excuses", isNew: true },
  { text: "University Goal Mode", isNew: true },
  { text: "Parent visibility dashboard", isNew: true },
  { text: "Early access to new features" },
];

// ─── Price helpers ────────────────────────────────────────────────────────────

const MONTHLY_PLUS = 4.99;
const MONTHLY_PRO  = 9.99;

function annualMonthly(m: number) { return +(m * (10 / 12)).toFixed(2); }

// ─── Plan card ────────────────────────────────────────────────────────────────

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
  const [hovered, setHovered] = useState(false);

  const isCurrent  = currentTier === plan;
  const canUpgrade = plan !== "free" && (
    (plan === "plus" && currentTier === "free") ||
    (plan === "pro"  && currentTier !== "pro")
  );

  const monthlyBase    = plan === "plus" ? MONTHLY_PLUS : plan === "pro" ? MONTHLY_PRO : 0;
  const displayMonthly = annual ? annualMonthly(monthlyBase) : monthlyBase;
  const fmtPrice       = (v: number) => currencyLoading ? `$${v.toFixed(2)}` : formatPrice(v);

  const features = plan === "free" ? FREE_FEATURES : plan === "plus" ? PLUS_FEATURES : PRO_FEATURES;

  // Per-plan visual config
  const isPlus = plan === "plus";
  const isPro  = plan === "pro";
  const isFree = plan === "free";

  const cardStyle: React.CSSProperties = {
    background: isPro
      ? "linear-gradient(160deg, #0d0a1a 0%, #0f0c1a 60%, #100f18 100%)"
      : isPlus
      ? "linear-gradient(160deg, #0c0c1f 0%, #0e0c1c 60%, #0d0c1a 100%)"
      : "#0c0c18",
    border: isPro
      ? "1px solid rgba(251,191,36,0.35)"
      : isPlus
      ? "1px solid rgba(139,92,246,0.5)"
      : "1px solid rgba(99,102,241,0.15)",
    boxShadow: hovered
      ? isPro
        ? "0 24px 60px rgba(251,191,36,0.12), 0 0 0 1px rgba(251,191,36,0.2)"
        : isPlus
        ? "0 24px 60px rgba(139,92,246,0.18), 0 0 0 1px rgba(139,92,246,0.25)"
        : "0 16px 40px rgba(0,0,0,0.4)"
      : isPro
      ? "0 8px 32px rgba(251,191,36,0.06)"
      : isPlus
      ? "0 8px 32px rgba(139,92,246,0.10)"
      : "none",
    transform: hovered ? "translateY(-4px)" : "translateY(0)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const checkBg = isPro
    ? "rgba(251,191,36,0.15)"
    : isPlus
    ? "rgba(139,92,246,0.18)"
    : "rgba(52,211,153,0.12)";

  const checkColor = isPro ? "#fbbf24" : isPlus ? "#a78bfa" : "#34d399";

  const btnStyle: React.CSSProperties = isPro
    ? { background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 8px 24px rgba(245,158,11,0.30)" }
    : isPlus
    ? { background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", boxShadow: "0 8px 24px rgba(124,58,237,0.35)" }
    : {};

  return (
    <div
      style={cardStyle}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badge */}
      {isPlus && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px z-10">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-b-xl shadow-lg shadow-violet-900/40 tracking-wide">
            Most Popular 🔥
          </div>
        </div>
      )}
      {isPro && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px z-10">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-extrabold px-4 py-1 rounded-b-xl shadow-lg shadow-amber-900/40 tracking-wide">
            Best Value ⚡
          </div>
        </div>
      )}

      {/* Glow overlay for Plus */}
      {isPlus && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(139,92,246,0.10), transparent)",
        }} />
      )}
      {isPro && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(251,191,36,0.07), transparent)",
        }} />
      )}

      {/* Header */}
      <div className={`relative px-6 ${isPlus || isPro ? "pt-10" : "pt-6"} pb-6 border-b border-white/[0.06]`}>
        {/* Plan name + icon */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
            background: isPro
              ? "rgba(251,191,36,0.15)"
              : isPlus
              ? "rgba(139,92,246,0.20)"
              : "rgba(100,116,139,0.15)",
            border: isPro
              ? "1px solid rgba(251,191,36,0.25)"
              : isPlus
              ? "1px solid rgba(167,139,250,0.25)"
              : "1px solid rgba(100,116,139,0.2)",
          }}>
            {isPro ? <Crown className="w-4.5 h-4.5 text-amber-400" style={{ width: 18, height: 18 }} />
              : isPlus ? <Sparkles className="w-4.5 h-4.5 text-violet-300" style={{ width: 18, height: 18 }} />
              : <Zap className="w-4.5 h-4.5 text-slate-400" style={{ width: 18, height: 18 }} />}
          </div>
          <div>
            <p className={`text-lg font-extrabold leading-none ${isPro ? "text-amber-200" : isPlus ? "text-violet-200" : "text-slate-200"}`}>
              {isFree ? "Free" : isPlus ? "Plus" : "Pro"}
            </p>
            {isCurrent && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                Your plan
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        {isFree ? (
          <div className="flex items-end gap-1.5">
            <span className="text-4xl font-black text-white leading-none">$0</span>
            <span className="text-sm text-slate-500 mb-1">/ forever</span>
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-1">
              <span className={`text-4xl font-black leading-none ${isPro ? "text-amber-100" : "text-white"}`}>
                {fmtPrice(displayMonthly)}
              </span>
              <span className="text-sm text-slate-400 mb-1.5">/ mo</span>
            </div>
            {annual ? (
              <p className="text-[12px] text-emerald-400 font-semibold mt-1">
                Billed {fmtPrice(displayMonthly * 10)}/yr · 2 months free 🎉
              </p>
            ) : (
              <p className="text-[11px] text-slate-600 mt-1">
                or {fmtPrice(annualMonthly(monthlyBase))}/mo billed annually
              </p>
            )}
            {!currencyLoading && (
              <p className="text-[10px] text-slate-700 mt-0.5">Prices in {currency} · Charged in USD</p>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="relative px-6 py-5 flex-1">
        <ul className="space-y-3">
          {features.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              {/* Checkmark */}
              <div
                className="w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  width: 18, height: 18,
                  background: f.isEverything ? "rgba(52,211,153,0.15)" : checkBg,
                  border: `1px solid ${f.isEverything ? "rgba(52,211,153,0.25)" : checkColor + "40"}`,
                }}
              >
                <Check
                  style={{ width: 10, height: 10, color: f.isEverything ? "#34d399" : checkColor, strokeWidth: 3 }}
                />
              </div>
              {/* Text */}
              <div className="flex items-center gap-2 flex-wrap leading-snug">
                <span className={`text-sm ${
                  f.isEverything
                    ? "font-bold text-emerald-300"
                    : "text-slate-300 font-medium"
                }`}>
                  {f.text}
                </span>
                {f.isNew && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(232,121,249,0.15)",
                      border: "1px solid rgba(232,121,249,0.30)",
                      color: "#e879f9",
                    }}>
                    New ✨
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="relative px-6 pb-6">
        {isCurrent && !isFree ? (
          <button
            onClick={onPortal}
            disabled={portalLoading}
            className="w-full py-3.5 border border-violet-800/40 hover:border-violet-600/60 text-slate-400 hover:text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manage subscription
          </button>
        ) : isCurrent && isFree ? (
          <div className="w-full py-3.5 bg-slate-800/50 text-slate-500 text-sm font-semibold rounded-xl text-center">
            Current plan
          </div>
        ) : canUpgrade ? (
          <div>
            <button
              onClick={() => onUpgrade(plan)}
              disabled={!!checkoutLoading}
              className="relative w-full py-3.5 text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden text-white"
              style={checkoutLoading ? {} : btnStyle}
            >
              {checkoutLoading === plan ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <>
                  {isPlus ? "Start 30-day free trial" : "Upgrade to Pro"}
                  <ArrowRight className="w-4 h-4" />
                  <span className="absolute inset-0 pointer-events-none" style={{
                    background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.12) 50%,transparent 60%)",
                    animation: "shimmer 2.5s linear infinite",
                  }} />
                </>
              )}
            </button>
            {isPlus && (
              <p className="text-center text-[10px] text-slate-600 mt-2">No credit card needed · Cancel before day 30 and pay nothing</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Comparison table row ────────────────────────────────────────────────────

function CompRow({ label, free, plus, pro }: { label: string; free: string | boolean; plus: string | boolean; pro: string | boolean }) {
  const cell = (v: string | boolean) =>
    typeof v === "boolean" ? (
      v
        ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
        : <span className="text-slate-700 text-lg leading-none mx-auto block text-center">—</span>
    ) : (
      <span className="text-xs text-slate-300 text-center block">{v}</span>
    );

  return (
    <tr className="border-t border-violet-900/15">
      <td className="py-3 pr-4 text-sm text-slate-400">{label}</td>
      <td className="py-3 text-center">{cell(free)}</td>
      <td className="py-3 text-center">{cell(plus)}</td>
      <td className="py-3 text-center">{cell(pro)}</td>
    </tr>
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
    if (upgradeParam === "success") setSuccessMsg("Plan updated! Welcome to your new plan.");
    if (upgradeParam === "cancel")  setError("Checkout cancelled. No charge was made.");

    supabase.from("profiles").select("subscription_tier").single().then(({ data }) => {
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
    setPortalLoading(true); setError(null);
    try {
      const res  = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setError(data.error ?? "Could not open billing portal."); setPortalLoading(false); }
    } catch { setError("Network error. Please try again."); setPortalLoading(false); }
  };

  const startCheckout = async (plan: Plan) => {
    posthog.capture("upgrade_clicked", { plan });
    const priceId = plan === "plus"
      ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
    setCheckoutLoading(plan); setError(null);
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
    <div className="min-h-screen bg-[#09090f] pb-24 sm:pb-12">

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.14), transparent 70%)" }} />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05), transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.04), transparent 70%)", filter: "blur(60px)" }} />
      </div>

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

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-700/40 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">30-day Plus trial · No credit card needed · Cancel anytime</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
            Start free.<br className="sm:hidden" /> Grow when you{"'"}re ready.
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            The free plan is genuinely unlimited — unlimited habits, full AI coach, battles with friends.
            Upgrade for the features that compound your results.
          </p>

          {/* Annual / Monthly toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-semibold transition-colors ${!annual ? "text-white" : "text-slate-500"}`}>Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              role="switch"
              aria-checked={annual}
              className="relative flex-shrink-0"
              style={{
                width: 52, height: 28, borderRadius: 14,
                background: annual ? "linear-gradient(135deg, #7c3aed, #8b5cf6)" : "#1e1e2e",
                border: annual ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(99,102,241,0.2)",
                transition: "all 0.2s",
                boxShadow: annual ? "0 0 16px rgba(139,92,246,0.3)" : "none",
              }}
            >
              <span style={{
                position: "absolute", top: 3,
                left: annual ? 27 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "white",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                transition: "left 0.2s",
              }} />
            </button>
            <span className={`text-sm font-semibold transition-colors ${annual ? "text-white" : "text-slate-500"}`}>
              Annual
            </span>
            {annual && (
              <span className="text-[11px] font-extrabold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2.5 py-1 rounded-full">
                Save 2 months free 🎉
              </span>
            )}
            {!annual && (
              <span className="text-[11px] font-bold text-slate-600 border border-slate-800 px-2.5 py-1 rounded-full">
                Save 2 months →
              </span>
            )}
          </div>
        </div>

        {/* ── Status messages ──────────────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 text-sm text-emerald-300 mb-8">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-800/40 rounded-2xl p-4 text-sm text-red-300 mb-8">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* ── Plan cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
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

        {/* ── Trust signals ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-700" />
            Secure checkout via Stripe
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            Cancel anytime
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-slate-700" />
            No hidden fees
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
            7-day money-back guarantee
          </span>
        </div>

        {/* ── Feature comparison table ─────────────────────────────────────── */}
        <div className="mt-14">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Full feature comparison</h2>
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-violet-900/20">
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">Feature</th>
                    <th className="py-4 px-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Free</th>
                    <th className="py-4 px-3 text-center text-xs font-bold text-violet-400 uppercase tracking-wider">Plus</th>
                    <th className="py-4 px-3 text-center text-xs font-bold text-amber-400 uppercase tracking-wider">Pro</th>
                  </tr>
                </thead>
                <tbody className="px-5">
                  <tr className="border-t border-violet-900/15">
                    <td className="py-2.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider" colSpan={4}>Core</td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Habits</td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-emerald-400 font-semibold">Unlimited</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-violet-300 font-semibold">Unlimited</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-amber-300 font-semibold">Unlimited</span></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Streak tracking</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Identity Score</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Friends &amp; leaderboard</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Mood tracking</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">PWA (install on phone)</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-2.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider" colSpan={4}>AI &amp; Insights</td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">AI habit suggestions</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Full AI coach</td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Habit Battles</td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-slate-400">2 per month</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-violet-300 font-semibold">Unlimited</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-amber-300 font-semibold">Unlimited</span></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Habit DNA card</td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-slate-500">Basic preview</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-violet-300 font-semibold">Full + shareable</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-amber-300 font-semibold">Full + shareable</span></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Deep AI Memory</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Weekly AI email report</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Voice check-ins</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Monthly Wrapped report</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-2.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider" colSpan={4}>Social &amp; Teams</td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Habit Battles</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Group habits</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Public Commitment Contracts</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Organisation / School mode</td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-slate-700 text-lg leading-none block text-center">—</span></td>
                    <td className="py-3 px-3 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-2.5 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider" colSpan={4}>Support</td>
                  </tr>
                  <tr className="border-t border-violet-900/15">
                    <td className="py-3 px-5 text-sm text-slate-400">Support level</td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-slate-500">Community</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-violet-300 font-semibold">Priority email</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-xs text-amber-300 font-semibold">Priority + early access</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Manage billing (paid only) ───────────────────────────────────── */}
        {tier !== "free" && (
          <div className="mt-10 bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1.5">
              <CreditCard className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-semibold text-white">Manage subscription</p>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Update your payment method, view invoices, or cancel through Stripe.
            </p>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all"
            >
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Open billing portal
            </button>
          </div>
        )}

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <div className="mt-12 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Common questions</p>
          {[
            { q: "Can I switch between plans?", a: "Yes. Upgrade instantly anytime. Downgrades take effect at the end of your current billing period — no surprise charges." },
            { q: "What happens when I cancel?", a: "Your plan stays active until the end of the period. After that you drop to Free — all your habits and history are preserved." },
            { q: "Do you offer refunds?", a: "We offer a 7-day money-back guarantee. Email support@habitaiapp.com within 7 days of any charge and we'll sort it out, no questions asked." },
            { q: "Is my data safe?", a: "Yes. Your habits, streaks, and history are stored securely and preserved regardless of plan. We'll never delete your data without notice." },
          ].map(({ q, a }) => (
            <div key={q} className="bg-[#0f0f1a] border border-violet-900/15 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-white mb-1.5">{q}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%);  }
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
