import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight, Check, Sparkles, Flame, Users, Brain,
  BarChart2, Shield, Star, Zap, ChevronRight,
} from "lucide-react";

// Client components (need hooks or interactivity)
const Navbar  = dynamic(() => import("@/components/landing/Navbar"));
const Pricing = dynamic(() => import("@/components/landing/Pricing"));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

export const metadata: Metadata = {
  title: "HabitAI – Build Habits That Actually Stick",
  description:
    "AI-powered habit coaching, streak tracking, and social accountability in one app. Join 10,000+ people building better habits every day.",
  metadataBase: new URL(APP_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "HabitAI – Build Habits That Actually Stick",
    description:
      "AI-powered habit coaching, streak tracking, and social accountability in one app.",
    url: APP_URL,
    siteName: "HabitAI",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HabitAI" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HabitAI – Build Habits That Actually Stick",
    description: "AI-powered habit coaching, streak tracking, and social accountability in one app.",
    images: ["/opengraph-image"],
  },
};

// ─── Mock data for hero mockup ─────────────────────────────────────────────────

const MOCK_HABITS = [
  { name: "Morning meditation", done: true,  streak: 14 },
  { name: "Exercise 30 min",    done: true,  streak: 9  },
  { name: "Read 20 pages",      done: true,  streak: 5  },
  { name: "Drink 8 glasses",    done: false, streak: 3  },
  { name: "Evening journal",    done: false, streak: 1  },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-24 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/5 w-[560px] h-[560px] bg-violet-700/12 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/5 w-[420px] h-[420px] bg-purple-700/12 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-fuchsia-900/4 rounded-full blur-[200px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI-Powered Habit Intelligence
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.08]">
          Build habits that{" "}
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
            stick
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI-powered coaching, streak tracking, and social accountability in one app.
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
            href="#features"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-violet-950/50 border border-violet-800/40 hover:bg-violet-950/80 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 text-base"
          >
            See how it works
          </Link>
        </div>

        {/* Social proof + trust */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 mb-20">
          <span className="text-violet-400 font-medium">Join 10,000+ people building better habits</span>
          {["No credit card required", "Free forever plan", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-violet-600" />
              {t}
            </span>
          ))}
        </div>

        {/* App mockup */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-2xl blur-2xl scale-105 pointer-events-none" />
          <div className="relative bg-[#0f0f1a]/95 border border-violet-800/30 rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/60">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a14] border-b border-violet-900/20">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="flex-1 text-center text-xs text-slate-500">habitAI — Dashboard</span>
            </div>

            <div className="p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Good morning, Alex 👋</p>
                  <p className="text-base font-semibold text-white">Today&apos;s Habits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-400">
                    3<span className="text-slate-600 text-base font-normal">/5</span>
                  </p>
                  <p className="text-xs text-slate-500">completed</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-violet-950/80 rounded-full mb-5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: "60%" }} />
              </div>

              {/* Habit list */}
              <div className="space-y-2.5">
                {MOCK_HABITS.map((h) => (
                  <div
                    key={h.name}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${
                      h.done ? "bg-violet-600/10 border-violet-600/25" : "bg-violet-950/30 border-violet-900/20"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      h.done ? "bg-violet-500" : "border-2 border-violet-700/60"
                    }`}>
                      {h.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm flex-1 text-left ${h.done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                      {h.name}
                    </span>
                    <span className="text-xs text-violet-400 whitespace-nowrap flex items-center gap-0.5">
                      🔥 {h.streak}d
                    </span>
                  </div>
                ))}
              </div>

              {/* AI insight chip */}
              <div className="mt-4 flex items-center gap-2.5 bg-violet-950/50 border border-violet-800/30 rounded-xl px-3.5 py-2.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  <span className="text-violet-300 font-medium">AI insight:</span> Your completion rate peaks on Tuesdays. Schedule hard habits then.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-600/15 border-violet-600/25",
    title: "AI Coaching",
    desc: "Get personalised habit insights powered by GPT-4. Understand your patterns, recover from setbacks, and receive weekly AI-generated progress reports.",
    bullets: ["Pattern recognition", "Streak recovery tips", "Weekly AI email report"],
  },
  {
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-600/10 border-orange-600/20",
    title: "Streak Tracking",
    desc: "Visual streaks, habit strength scores, and freeze protection keep you on track even on tough days. Never lose momentum again.",
    bullets: ["Habit strength bar", "Streak freeze protection", "30-day history view"],
  },
  {
    icon: Users,
    color: "text-emerald-400",
    bg: "bg-emerald-600/10 border-emerald-600/20",
    title: "Friends & Competition",
    desc: "Invite friends, compete on leaderboards, and cheer each other on. Social accountability is the most powerful habit tool there is.",
    bullets: ["Friend leaderboards", "Cheer reactions", "Shared challenges"],
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Everything you need
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Habit building,{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              supercharged
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Three pillars that turn intention into lasting change.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc, bullets }) => (
            <div
              key={title}
              className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-7 hover:border-violet-800/40 transition-all duration-300 flex flex-col"
            >
              <div className={`w-12 h-12 rounded-xl ${bg} border flex items-center justify-center mb-5`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto text-center">
          {[
            { value: "10,000+", label: "Active users" },
            { value: "500K+",   label: "Habits completed" },
            { value: "4.9 ★",  label: "Average rating" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    icon: Zap,
    title: "Add your habits",
    desc: "Choose from templates or create your own. Set when, where, and how long — implementation intentions make habits 3× more likely to stick.",
  },
  {
    n: "02",
    icon: BarChart2,
    title: "Check in daily",
    desc: "One tap per habit. Watch your streaks grow, your strength bars fill, and your daily completion ring close. Simple and satisfying.",
  },
  {
    n: "03",
    icon: Brain,
    title: "Get AI insights",
    desc: "Our AI analyses your patterns, identifies your weakest days, and gives you a recovery plan — then sends a weekly email report.",
  },
];

function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#0a0a12]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How it works</h2>
          <p className="text-slate-400 max-w-lg mx-auto">From day one to day one hundred — a system that grows with you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="relative">
              <div className="text-6xl font-black text-violet-950/80 mb-4 leading-none select-none">{n}</div>
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social proof / testimonials ───────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "I've tried every habit app out there. HabitAI is the first one where the AI insights actually changed my behaviour — not just tracked it.",
    name: "Sarah K.",
    role: "Software engineer · 94-day streak",
    stars: 5,
  },
  {
    quote: "The friends leaderboard turned my group chat into an accountability powerhouse. We've all hit our 30-day streaks.",
    name: "Marcus T.",
    role: "Fitness coach · Plus user",
    stars: 5,
  },
  {
    quote: "Streak freeze protection saved me when I was travelling. I didn't lose 45 days of progress and that kept me going.",
    name: "Priya M.",
    role: "PhD student · Pro user",
    stars: 5,
  },
];

function SocialProof() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Loved by habit builders worldwide
          </h2>
          <p className="text-slate-400">Real people. Real results.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, role, stars }) => (
            <div
              key={name}
              className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-6 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed flex-1 mb-4">&ldquo;{quote}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="text-xs text-slate-500">{role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40 hover:-translate-y-0.5 text-base"
          >
            Start building today
            <ChevronRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-slate-600 mt-3">Free forever. No credit card needed.</p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_LINKS = {
  Product:  [
    { label: "Features",  href: "#features" },
    { label: "Pricing",   href: "#pricing"  },
    { label: "Community", href: "https://discord.gg/habitai" },
  ],
  Company: [
    { label: "Blog",      href: "#" },
    { label: "About",     href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms"   },
  ],
};

function Footer() {
  return (
    <footer className="border-t border-violet-900/20 bg-[#09090f] py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white">
                habit<span className="text-violet-400">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              AI-powered habit tracking for people who want to build a better life, one day at a time.
            </p>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
              <span className="text-xs text-slate-500 ml-1.5">4.9/5 · 10,000+ users</span>
            </div>
          </div>

          {/* Link groups */}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[#09090f] min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <SocialProof />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
