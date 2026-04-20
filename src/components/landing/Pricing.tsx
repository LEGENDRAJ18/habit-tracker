import Link from "next/link";
import { Check, Sparkles, Zap } from "lucide-react";

const freePlan = {
  name: "Free",
  price: "$0",
  period: "forever",
  description: "Perfect for getting started with habit tracking.",
  cta: "Start for Free",
  href: "/auth/signup",
  features: [
    "Up to 3 habits",
    "Daily & weekly tracking",
    "7-day history",
    "Basic streak tracking",
    "Mobile responsive",
  ],
  notIncluded: ["AI insights", "Full history", "Analytics dashboard", "Priority support"],
};

const proPlan = {
  name: "Pro",
  price: "$9",
  period: "per month",
  description: "For those serious about building life-changing habits.",
  cta: "Start Pro Trial",
  href: "/auth/signup?plan=pro",
  features: [
    "Unlimited habits",
    "Full history & archives",
    "AI-powered insights",
    "Advanced analytics",
    "Smart reminders",
    "Goal tracking",
    "Priority support",
    "Early access to features",
  ],
  badge: "Most Popular",
};

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            Simple pricing
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5">
            Start free.{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Scale when ready.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            No hidden fees, no surprise charges. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free card */}
          <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-7 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">{freePlan.name}</span>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-bold text-white">{freePlan.price}</span>
              <span className="text-slate-400 ml-2 text-sm">/ {freePlan.period}</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">{freePlan.description}</p>

            <Link
              href={freePlan.href}
              className="block text-center py-2.5 rounded-xl border border-violet-700/40 text-slate-300 hover:text-white hover:border-violet-600 transition-colors text-sm font-medium mb-6"
            >
              {freePlan.cta}
            </Link>

            <div className="space-y-2.5">
              {freePlan.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
              {freePlan.notIncluded.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    <div className="w-3 h-px bg-slate-700" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Pro card */}
          <div className="relative bg-gradient-to-b from-violet-950/80 to-[#0f0f1a] border border-violet-600/40 rounded-2xl p-7 flex flex-col shadow-xl shadow-violet-950/50">
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3" />
                {proPlan.badge}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">{proPlan.name}</span>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-bold text-white">{proPlan.price}</span>
              <span className="text-slate-400 ml-2 text-sm">/ {proPlan.period}</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">{proPlan.description}</p>

            <Link
              href={proPlan.href}
              className="block text-center py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors mb-6 shadow-lg shadow-violet-900/30"
            >
              {proPlan.cta}
            </Link>

            <div className="space-y-2.5">
              {proPlan.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          14-day free trial on Pro. No credit card required.
        </p>
      </div>
    </section>
  );
}
