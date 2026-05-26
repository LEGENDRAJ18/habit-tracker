import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowDown, Check, Sparkles, Flame, Users, Brain,
  Smartphone, Cigarette, Dumbbell, Moon, X as XIcon,
  Download, Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const Navbar  = dynamic(() => import("@/components/landing/Navbar"));
const Pricing = dynamic(() => import("@/components/landing/Pricing"));
const LandingPageTracker = dynamic(() => import("@/components/landing/LandingPageTracker"));
const ModesSection = dynamic(() => import("@/components/landing/ModesSection"));

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
  { name: "No phone before 9am",    done: true,  streak: 12 },
  { name: "Exercise 30 min",        done: true,  streak: 9  },
  { name: "Read instead of scroll", done: true,  streak: 5  },
  { name: "In bed by 11pm",         done: false, streak: 3  },
];

// ─── App mockup (shared between Hero and How It Works) ────────────────────────

function AppMockup() {
  return (
    <div className="relative">
      {/* Glow behind mockup */}
      <div className="absolute -inset-4 bg-gradient-to-br from-violet-600/20 to-purple-700/10 rounded-3xl blur-3xl pointer-events-none" />
      <div className="relative bg-[#0f0f1a] border border-violet-700/30 rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/70">
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a14] border-b border-violet-900/20">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="flex-1 text-center text-[11px] text-slate-600 font-medium">habitAI — Dashboard</span>
        </div>
        <div className="p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Good morning 👋</p>
              <p className="text-sm font-bold text-white">Today&apos;s Habits</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-violet-400 leading-none">3<span className="text-slate-600 text-sm font-normal">/4</span></p>
              <p className="text-[10px] text-slate-600 mt-0.5">completed</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-violet-950/80 rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all" style={{ width: "75%" }} />
          </div>
          {/* XP row */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <span className="text-[10px] text-slate-600">Level 7 · Committed</span>
            <span className="text-[10px] text-violet-400 font-semibold">+30 XP today ⚡</span>
          </div>
          {/* Habit list */}
          <div className="space-y-2 mb-3">
            {MOCK_HABITS.map((h) => (
              <div key={h.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                h.done
                  ? "bg-violet-600/10 border-violet-600/25"
                  : "bg-[#0c0c18] border-violet-900/25"
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  h.done ? "bg-violet-500" : "border-2 border-slate-700"
                }`}>
                  {h.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={`text-xs flex-1 text-left font-medium ${h.done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                  {h.name}
                </span>
                <span className="text-[11px] text-orange-400 font-semibold">🔥{h.streak}</span>
              </div>
            ))}
          </div>
          {/* AI coach strip */}
          <div className="flex items-start gap-2.5 bg-violet-950/60 border border-violet-700/25 rounded-xl px-3 py-2.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <span className="text-violet-300 font-semibold">AI coach: </span>
              You struggle on Thursdays — here&apos;s a 3-step plan to fix that.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 1. HERO ──────────────────────────────────────────────────────────────────

const BENEFITS = [
  { emoji: "✨", text: "Learns your patterns, goals, and excuses — adapts daily" },
  { emoji: "🔥", text: "Streaks stay alive even when life gets in the way" },
  { emoji: "👥", text: "Battle friends, build groups, stay accountable together" },
];

function Hero() {
  return (
    <section className="relative pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-700/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-700/6 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">

          {/* ── Left: copy ─────────────────────────────────────────────────── */}
          <div className="flex-1 w-full text-center lg:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
              Free forever · 30-day Pro trial included
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black tracking-tight text-white mb-4 leading-[1.07]">
              The AI habit coach{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
                that actually knows you
              </span>
            </h1>

            {/* Social proof */}
            <p className="text-base text-slate-400 mb-6 text-center lg:text-left leading-relaxed">
              Free forever — unlimited habits, full AI coach, battles with friends.{" "}
              <span className="text-violet-300 font-semibold">No credit card needed.</span>
            </p>

            {/* Benefits — 3 bullets, each ≤ 10 words */}
            <ul className="space-y-3 mb-8 text-left max-w-sm mx-auto lg:mx-0">
              {BENEFITS.map(({ emoji, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="text-lg leading-none flex-shrink-0 mt-0.5">{emoji}</span>
                  <span className="text-base text-slate-300 leading-snug">{text}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-3">
              <Link
                href="/auth/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-extrabold rounded-2xl transition-all duration-150 shadow-2xl shadow-violet-900/60 hover:shadow-violet-600/50 hover:-translate-y-0.5 text-lg"
                style={{ letterSpacing: "-0.01em" }}
              >
                Start for free →
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-violet-800/40 hover:border-violet-600/60 text-slate-400 hover:text-white font-medium rounded-2xl transition-all duration-150 text-sm"
              >
                See how it works
                <ArrowDown className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-slate-600">
              {["Free forever", "30-day Pro trial", "Takes 60 seconds"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />{t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: app preview ──────────────────────────────────────────── */}
          <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-none mx-auto lg:mx-0">
            {/* On mobile: clip to keep above-fold tight */}
            <div className="lg:hidden max-h-[340px] overflow-hidden rounded-2xl">
              <AppMockup />
            </div>
            {/* On desktop: full mockup */}
            <div className="hidden lg:block">
              <AppMockup />
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
    title: "Generic apps just track",
    desc: "Most habit apps are just glorified checklists. They track what you did but never tell you WHY you're failing or HOW to fix it.",
  },
  {
    title: "No one to keep you accountable",
    desc: "It's easy to quit when nobody's watching. Without social pressure and real consequences, habits die within a week.",
  },
  {
    title: "One bad day ruins everything",
    desc: "Miss one day and your streak is gone. Most apps punish you for being human instead of helping you recover.",
  },
];

const FIXES = [
  {
    emoji: "🤖",
    color: "border-violet-600/30 bg-violet-950/20",
    glow: "shadow-violet-950/40",
    title: "AI that actually coaches you",
    desc: "Not just tracking — real personalized advice on WHY you're struggling and exactly what to do next.",
  },
  {
    emoji: "👥",
    color: "border-emerald-600/25 bg-emerald-950/10",
    glow: "shadow-emerald-950/40",
    title: "Friends who keep you honest",
    desc: "Compete on leaderboards, share achievements, challenge friends. Social accountability that actually works.",
  },
  {
    emoji: "🛡️",
    color: "border-blue-600/25 bg-blue-950/10",
    glow: "shadow-blue-950/40",
    title: "Streaks that survive real life",
    desc: "Streak protection means one bad day doesn't erase months of progress. Built for real humans.",
  },
];

function ProblemSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#060609]">
      <div className="max-w-5xl mx-auto">

        {/* Label */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-800/30 rounded-full px-4 py-1.5 text-sm text-red-400 mb-6 font-medium">
            👋 The Problem
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Why do{" "}
            <span className="bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
              92% of people
            </span>{" "}
            fail their habits?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-lg">
            It&apos;s not willpower. It&apos;s the tools.
          </p>
        </div>

        {/* Problem cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {PROBLEMS.map(({ title, desc }) => (
            <div
              key={title}
              className="bg-[#0f0f1a] border border-red-900/25 rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-800/40 to-transparent" />
              <div className="text-lg mb-3">❌</div>
              <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center gap-3 my-10">
          <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-violet-800/50 to-transparent" />
          <div className="w-9 h-9 rounded-full bg-violet-900/40 border border-violet-700/40 flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-violet-400" />
          </div>
          <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/30 rounded-full px-5 py-2 text-sm font-bold text-emerald-300">
            ✅ HabitAI fixes all three
          </div>
          <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-violet-800/50 to-transparent" />
        </div>

        {/* Fix cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FIXES.map(({ emoji, color, glow, title, desc }) => (
            <div
              key={title}
              className={`border rounded-2xl p-6 relative overflow-hidden shadow-lg ${color} ${glow}`}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-600/30 to-transparent" />
              <div className="text-2xl mb-3">{emoji}</div>
              <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
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
    <section id="features" className="py-24 px-4 sm:px-6">
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

// ─── 3b. NEW FEATURES SHOWCASE ───────────────────────────────────────────────

function DNAMockup() {
  // Ring: r=52, circ≈327, 87% → offset≈42
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ * (1 - 0.87);
  return (
    <div className="bg-[#0b0b18] border border-violet-700/20 rounded-2xl p-5 space-y-4 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Habit DNA</span>
      </div>
      {/* Ring */}
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: 128, height: 128 }}>
          <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="lpRing" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(109,40,217,0.12)" strokeWidth="7" />
            <circle cx="64" cy="64" r={r} fill="none" stroke="url(#lpRing)" strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-black leading-none" style={{ background: "linear-gradient(135deg,#a78bfa,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>87%</p>
            <p className="text-[9px] text-violet-400/60 font-bold uppercase tracking-widest mt-1">consistency</p>
          </div>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[["142", "Completions", "text-violet-400"], ["21d", "Streak", "text-orange-400"], ["2.4k", "XP", "text-amber-400"]].map(([v, l, c]) => (
          <div key={l} className="rounded-xl p-2 text-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className={`text-sm font-black ${c}`}>{v}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {["Morning Champion 🌅", "Fitness Warrior 💪"].map((t) => (
          <span key={t} className="text-[10px] px-2 py-1 rounded-full font-semibold text-violet-300" style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(167,139,250,0.2)" }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function BattlesMockup() {
  return (
    <div className="bg-[#0b0b18] border border-violet-700/20 rounded-2xl p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">⚔️</span>
        <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Habit Battles</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full text-emerald-300 font-semibold" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)" }}>● Live</span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full mx-auto mb-1" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(232,121,249,0.3))", border: "1px solid rgba(167,139,250,0.25)" }}>
            <span className="text-sm font-bold text-violet-300 flex h-full items-center justify-center">Y</span>
          </div>
          <p className="text-xs text-white font-semibold">You</p>
          <p className="text-[10px] text-violet-400">9 done</p>
        </div>
        <div className="flex-1 px-3">
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="text-[10px] text-slate-500">5 days left</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "rgba(109,40,217,0.1)" }}>
            <div className="h-full rounded-l-full" style={{ width: "60%", background: "linear-gradient(90deg, #7c3aed, #a855f7)" }} />
            <div className="h-full rounded-r-full" style={{ width: "40%", background: "rgba(239,68,68,0.5)" }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-violet-400">60%</span>
            <span className="text-[9px] text-red-400">40%</span>
          </div>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full mx-auto mb-1" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(251,146,60,0.2))", border: "1px solid rgba(239,68,68,0.2)" }}>
            <span className="text-sm font-bold text-red-300 flex h-full items-center justify-center">A</span>
          </div>
          <p className="text-xs text-white font-semibold">Alex</p>
          <p className="text-[10px] text-red-400">6 done</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 text-center">Habit: Morning Run · 7-day challenge</p>
    </div>
  );
}

function WrappedMockup() {
  return (
    <div className="bg-[#0b0b18] border border-violet-700/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold text-white">April Wrapped</span>
        </div>
        <div className="flex gap-1">
          {[0,1,2,3,4,5,6,7].map(i => (
            <div key={i} className={`h-1 rounded-full ${i === 1 ? "w-3 bg-violet-500" : "w-1 bg-violet-900/50"}`} />
          ))}
        </div>
      </div>
      <div className="px-5 py-6 text-center">
        <p className="text-xs text-slate-400 mb-1">You completed</p>
        <p className="text-6xl font-black mb-2" style={{ background: "linear-gradient(135deg,#a78bfa,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          142
        </p>
        <p className="text-sm text-slate-300 font-semibold">habit check-ins</p>
        <p className="text-xs text-slate-500 mt-1">in April 🎉</p>
      </div>
    </div>
  );
}

function NewFeaturesSection() {
  const features = [
    {
      badge: "Plus & Pro",
      badgeColor: "text-violet-300",
      badgeBg: "rgba(109,40,217,0.18)",
      badgeBorder: "rgba(139,92,246,0.3)",
      tag: "New",
      title: "Habit DNA",
      desc: "Your behavioral fingerprint. After 30 days of tracking, unlock a full analysis of your consistency, peak performance times, and personality tags — all in one beautiful card you can share.",
      bullets: [
        "Circular consistency ring — see your overall %",
        "Best & worst habits, peak day, peak time",
        "Personality tags: Morning Champion, Fitness Warrior…",
        "Download a shareable card or share the summary",
      ],
      mockup: <DNAMockup />,
      flip: false,
    },
    {
      badge: "Plus & Pro",
      badgeColor: "text-violet-300",
      badgeBg: "rgba(109,40,217,0.18)",
      badgeBorder: "rgba(139,92,246,0.3)",
      tag: "New",
      title: "Habit Battles",
      desc: "Challenge a friend to a 7-day head-to-head duel. Pick any habit, set the duration, and see who shows up more. The best accountability tool yet — because losing to someone you know stings.",
      bullets: [
        "7-day or custom duration duels",
        "Real-time progress bar: you vs. them",
        "Push notification when you get challenged",
        "Works on any habit in your list",
      ],
      mockup: <BattlesMockup />,
      flip: true,
    },
    {
      badge: "Pro",
      badgeColor: "text-amber-300",
      badgeBg: "rgba(180,83,9,0.15)",
      badgeBorder: "rgba(245,158,11,0.3)",
      tag: "New",
      title: "Monthly Wrapped",
      desc: "Every month, get a Spotify Wrapped–style story of your habit journey — completions, consistency, streaks, XP earned, and your top personality tags. Auto-generated, animated, shareable.",
      bullets: [
        "8-slide animated recap every month",
        "Top habit, longest streak, XP earned",
        "Personality tags for the month",
        "Share your Wrapped with one tap",
      ],
      mockup: <WrappedMockup />,
      flip: false,
    },
  ] as const;

  return (
    <section className="py-24 px-4 sm:px-6 bg-[#060609]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-700/25 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Just shipped
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Features that go{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              beyond tracking
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            DNA, Battles, and Wrapped — built for people who want to understand and compete, not just check boxes.
          </p>
        </div>

        <div className="space-y-20">
          {features.map(({ badge, badgeColor, badgeBg, badgeBorder, tag, title, desc, bullets, mockup, flip }) => (
            <div
              key={title}
              className={`flex flex-col ${flip ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-10 lg:gap-14`}
            >
              {/* Text side */}
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${badgeColor}`}
                    style={{ background: badgeBg, border: `1px solid ${badgeBorder}` }}
                  >
                    {badge}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-emerald-300"
                        style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                    {tag}
                  </span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">{title}</h3>
                <p className="text-base text-slate-400 leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup side */}
              <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-none mx-auto">
                <div className="relative">
                  <div className="absolute -inset-6 bg-violet-700/8 rounded-3xl blur-3xl pointer-events-none" />
                  <div className="relative">{mockup}</div>
                </div>
              </div>
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

// ─── ABOUT SECTION ────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-violet-950/40 to-[#0f0f1a] border border-violet-800/25 rounded-3xl p-8 sm:p-10 text-center"
          style={{ boxShadow: "0 0 60px rgba(139,92,246,0.06)" }}>
          <div className="text-4xl mb-5">👋</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Why we built this
          </h2>
          <p className="text-base text-slate-300 leading-relaxed mb-4">
            HabitAI was built by a teenager from New Zealand who got tired of doom scrolling and couldn&apos;t find an app that actually helped. So he built one.
          </p>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            No VC funding. No corporate agenda. Just a genuine tool built to solve a real problem — for people who actually want to change, not just track.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Built by a real person", "No corporate agenda", "Honest & ad-free"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-950/60 border border-violet-800/30 px-3 py-1.5 rounded-full">
                <Check className="w-3 h-3 text-violet-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

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
              href="/auth/login"
              className="inline-flex items-center gap-2 px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all duration-200 shadow-xl shadow-violet-900/40 hover:-translate-y-0.5 text-base mb-4"
            >
              Start for free
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

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
      {children}
    </h4>
  );
}

function FooterLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="text-sm text-slate-500 hover:text-violet-400 transition-colors duration-150"
      >
        {children}
      </Link>
    </li>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.104.12 18.12a19.904 19.904 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#09090f] border-t border-violet-900/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-8">

        {/* Logo + tagline */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>
          <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
            AI-powered habit coaching for people serious about change. Build better habits — one day at a time.
          </p>
        </div>

        {/* 3-column link grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">

          {/* PRODUCT */}
          <div>
            <FooterHeading>Product</FooterHeading>
            <ul className="space-y-3">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="/help">Help &amp; Support</FooterLink>
              <FooterLink href="/payment-policy">Payment Policy</FooterLink>
            </ul>
          </div>

          {/* LEGAL */}
          <div>
            <FooterHeading>Legal</FooterHeading>
            <ul className="space-y-3">
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/privacy#cookies">Cookie Policy</FooterLink>
            </ul>
          </div>

          {/* COMPANY */}
          <div>
            <FooterHeading>Company</FooterHeading>
            <div className="mb-4">
              <p className="text-sm text-slate-500 font-medium mb-1.5">About HabitAI</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                HabitAI was created by a 16-year-old developer from Wellington, New Zealand. Operated by a small independent team. 🇳🇿
              </p>
            </div>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:support@habitai.app"
                  className="text-sm text-slate-500 hover:text-violet-400 transition-colors duration-150"
                >
                  support@habitai.app
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/U3FFHFq3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-400 transition-colors duration-150"
                >
                  <DiscordIcon />
                  Discord community
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-violet-900/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {year} HabitAI. All rights reserved.</p>
          <p className="order-last sm:order-none">
            Made with ❤️ in Wellington, NZ 🇳🇿
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms"   className="hover:text-violet-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy</Link>
            <a href="mailto:support@habitai.app" className="hover:text-violet-400 transition-colors">Contact</a>
          </div>
        </div>

      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="bg-[#09090f] min-h-screen">
      <LandingPageTracker />
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <NewFeaturesSection />
        <WhoItsFor />
        <ModesSection />
        <div id="pricing">
          <Pricing />
        </div>
        <AboutSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
