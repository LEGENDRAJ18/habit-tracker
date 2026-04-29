import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight, Check, Sparkles, Flame, Users, Brain,
  Smartphone, Cigarette, Dumbbell, Moon, X as XIcon,
  ChevronRight, Download, Crown,
} from "lucide-react";

const Navbar  = dynamic(() => import("@/components/landing/Navbar"));
const Pricing = dynamic(() => import("@/components/landing/Pricing"));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

export const metadata: Metadata = {
  title: "HabitAI – AI Habit Coaching That Actually Works",
  description:
    "Break bad habits. Build better ones. HabitAI coaches you with personalized AI plans for phone addiction, smoking, fitness, sleep, and more.",
  metadataBase: new URL(APP_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "HabitAI – AI Habit Coaching That Actually Works",
    description:
      "Break bad habits. Build better ones. HabitAI coaches you with personalized AI plans for phone addiction, smoking, fitness, sleep, and more.",
    url: APP_URL,
    siteName: "HabitAI",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HabitAI" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HabitAI – AI Habit Coaching That Actually Works",
    description: "Break bad habits. Build better ones. HabitAI coaches you with personalized AI plans.",
    images: ["/opengraph-image"],
  },
};

// ─── Mock habits for hero mockup ──────────────────────────────────────────────

const MOCK_HABITS = [
  { name: "No phone before 9am",  done: true,  streak: 12 },
  { name: "Exercise 30 min",      done: true,  streak: 9  },
  { name: "Read instead of scroll", done: true,  streak: 5  },
  { name: "In bed by 11pm",       done: false, streak: 3  },
];

// ─── 1. HERO ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-24 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/3 left-[15%] w-[560px] h-[560px] bg-violet-700/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-[15%] w-[420px] h-[420px] bg-purple-700/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
          AI-powered habit coaching
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.08]">
          Break bad habits.{" "}
          <br className="hidden sm:block" />
          Build better ones.{" "}
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
            With AI.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Most habit apps just track. HabitAI{" "}
          <span className="text-slate-200 font-medium">coaches.</span>{" "}
          Get personalized AI advice for phone addiction, smoking, fitness, sleep — whatever you&apos;re working on.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40 hover:shadow-violet-800/50 hover:-translate-y-0.5 text-base"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-violet-950/50 border border-violet-800/40 hover:bg-violet-950/80 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 text-base"
          >
            See how it works
          </Link>
        </div>

        {/* Trust line */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 mb-20">
          {["No credit card required", "Free forever plan", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
              {t}
            </span>
          ))}
        </div>

        {/* App mockup */}
        <div className="relative max-w-lg mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/15 to-purple-600/15 rounded-2xl blur-2xl scale-105 pointer-events-none" />
          <div className="relative bg-[#0f0f1a]/95 border border-violet-800/30 rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/60">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a14] border-b border-violet-900/20">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="flex-1 text-center text-xs text-slate-500">HabitAI — Dashboard</span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Good morning 👋</p>
                  <p className="text-base font-semibold text-white">Today&apos;s Habits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-400">3<span className="text-slate-600 text-base font-normal">/4</span></p>
                  <p className="text-xs text-slate-500">completed</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-violet-950/80 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: "75%" }} />
              </div>
              <div className="space-y-2">
                {MOCK_HABITS.map((h) => (
                  <div key={h.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                    h.done ? "bg-violet-600/10 border-violet-600/25" : "bg-violet-950/30 border-violet-900/20"
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      h.done ? "bg-violet-500" : "border-2 border-violet-700/60"
                    }`}>
                      {h.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm flex-1 text-left ${h.done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                      {h.name}
                    </span>
                    <span className="text-xs text-violet-400">🔥 {h.streak}d</span>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5 bg-violet-950/50 border border-violet-800/30 rounded-xl px-3 py-2.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  <span className="text-violet-300 font-medium">AI coach:</span> You struggle on Thursdays. Let&apos;s fix that — here&apos;s a 3-step plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 2. PROBLEM SECTION ───────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: XIcon,
    title: "No personalised advice",
    desc: "Generic apps treat everyone the same. They don't know you struggle with your phone every evening, or that Thursdays are your hardest day.",
  },
  {
    icon: XIcon,
    title: "No real accountability",
    desc: "It's easy to quit when nobody's watching. Most apps let you silently fail. One skipped notification and you're off for a week.",
  },
  {
    icon: XIcon,
    title: "No recovery plan",
    desc: "Miss one day and most apps just reset your streak to zero. No guidance on why you slipped or how to get back on track.",
  },
];

function ProblemSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#060609]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why do habits fail?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            You&apos;re not the problem. The tools are.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROBLEMS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#0f0f1a] border border-red-900/20 rounded-2xl p-6"
            >
              <div className="w-9 h-9 rounded-xl bg-red-950/50 border border-red-800/30 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. SOLUTION SECTION ──────────────────────────────────────────────────────

const SOLUTIONS = [
  {
    emoji: "🤖",
    color: "border-violet-600/30 bg-violet-950/20",
    badgeColor: "text-violet-400",
    title: "AI that actually coaches you",
    desc: "Not generic tips. Real personalised plans for your specific habits, your patterns, and your struggles — powered by GPT-4. Get a custom 7-day recovery plan every time you need it.",
    bullets: ["Identifies your weakest days", "7-day personalised action plan", "Recognises addiction & harmful patterns"],
  },
  {
    emoji: "👥",
    color: "border-emerald-600/25 bg-emerald-950/10",
    badgeColor: "text-emerald-400",
    title: "Friends who keep you honest",
    desc: "Invite people you actually know. Compete on live leaderboards, send cheer reactions, and share achievements. Social accountability is the single most effective behaviour-change tool.",
    bullets: ["Friend leaderboard with XP", "Cheer & challenge each other", "Shared accountability feed"],
  },
  {
    emoji: "🔥",
    color: "border-orange-600/25 bg-orange-950/10",
    badgeColor: "text-orange-400",
    title: "Streaks that survive real life",
    desc: "Streak freeze protection means one bad day — travel, illness, chaos — doesn't wipe out weeks of progress. Because real life isn't perfect, and your tools shouldn't punish you for it.",
    bullets: ["Streak freeze (Plus & Pro)", "Habit strength score", "Pattern recovery tips"],
  },
];

function SolutionSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            HabitAI is different
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Built to actually{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              change behaviour
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Three things that make the difference between trying and succeeding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SOLUTIONS.map(({ emoji, color, title, desc, bullets }) => (
            <div
              key={title}
              className={`border rounded-2xl p-7 flex flex-col ${color}`}
            >
              <div className="text-3xl mb-5">{emoji}</div>
              <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-5 flex-1">{desc}</p>
              <ul className="space-y-2">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-slate-500">
                    <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 4. WHO IT'S FOR ──────────────────────────────────────────────────────────

const USE_CASES = [
  {
    icon: Smartphone,
    color: "text-blue-400",
    bg: "bg-blue-900/20 border-blue-800/25",
    title: "Phone addiction & social media",
    desc: "Track screen-free hours, build morning routines without your phone, and gradually reclaim your attention.",
  },
  {
    icon: Cigarette,
    color: "text-amber-400",
    bg: "bg-amber-900/15 border-amber-800/20",
    title: "Smoking & substance habits",
    desc: "Our AI recognises addiction patterns and includes evidence-based recovery resources alongside your plan.",
  },
  {
    icon: Dumbbell,
    color: "text-emerald-400",
    bg: "bg-emerald-900/15 border-emerald-800/20",
    title: "Fitness & health routines",
    desc: "Daily workouts, water intake, meal habits — track everything and let AI spot what's holding your progress back.",
  },
  {
    icon: Moon,
    color: "text-violet-400",
    bg: "bg-violet-900/20 border-violet-800/25",
    title: "Sleep & morning routines",
    desc: "Wind-down habits, consistent wake times, no-phone rules — build the foundation everything else depends on.",
  },
];

function WhoItsFor() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#060609]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built for real struggles
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Whatever you&apos;re trying to change, HabitAI understands your specific situation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {USE_CASES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`border rounded-2xl p-6 flex gap-4 ${bg}`}>
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. PRICING ───────────────────────────────────────────────────────────────
// Uses the existing Pricing component (already updated with accurate feature lists)

// ─── 6. FINAL CTA ─────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#060609]">
      <div className="max-w-3xl mx-auto text-center">
        {/* Glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-violet-600/10 rounded-3xl blur-3xl pointer-events-none" />
          <div className="relative bg-gradient-to-br from-violet-950/80 to-[#0f0f1a] border border-violet-700/30 rounded-3xl px-8 py-14 shadow-2xl shadow-violet-950/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6"
              style={{ boxShadow: "0 0 32px rgba(139,92,246,0.45)" }}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Ready to actually change?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Thousands of people are already building better habits. Your AI coach is waiting.
            </p>

            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all duration-200 shadow-xl shadow-violet-900/40 hover:-translate-y-0.5 text-base mb-4"
            >
              Create your free account
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="text-sm text-slate-600">No credit card required</p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                { icon: Check,    label: "Free forever plan" },
                { icon: Brain,    label: "AI coaching included" },
                { icon: Users,    label: "Friends & leaderboard" },
                { icon: Flame,    label: "Streak tracking" },
                { icon: Download, label: "CSV export on Pro" },
                { icon: Crown,    label: "Upgrade anytime" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 bg-violet-950/60 border border-violet-800/30 text-slate-400 text-xs px-3 py-1.5 rounded-full">
                  <Icon className="w-3 h-3 text-violet-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

const FOOTER_LINKS = {
  Product: [
    { label: "Features",   href: "#how-it-works" },
    { label: "Pricing",    href: "#pricing"       },
    { label: "Changelog",  href: "/changelog"     },
    { label: "Community",  href: "https://discord.gg/habitai" },
  ],
  Legal: [
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms"   },
  ],
};

function Footer() {
  return (
    <footer className="border-t border-violet-900/20 bg-[#09090f] py-14 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white text-lg">
                habit<span className="text-violet-400">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              AI-powered habit coaching for people serious about change. Break bad habits, build better ones — with a coach that actually knows your patterns.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-violet-900/20">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} HabitAI. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-slate-400 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[#09090f] min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <WhoItsFor />
        <div id="pricing">
          <Pricing />
        </div>
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
