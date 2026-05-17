import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowDown, Check, Sparkles, Flame, Users, Brain,
  Smartphone, Cigarette, Dumbbell, Moon, X as XIcon,
  Download, Crown, Play, Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
        <div className="flex justify-center mb-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40 hover:shadow-violet-800/50 hover:-translate-y-0.5 text-base"
          >
            Open HabitAI
            <ArrowRight className="w-4 h-4" />
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

// ─── DEMO VIDEO ───────────────────────────────────────────────────────────────

function DemoSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#060609]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See it in action
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Watch how HabitAI helped someone quit doom scrolling in 21 days.
          </p>
        </div>

        {/* Video placeholder */}
        <div className="relative group cursor-pointer rounded-2xl overflow-hidden border border-violet-700/30 shadow-2xl shadow-violet-950/50">
          {/* Gradient background stand-in */}
          <div className="relative aspect-video bg-gradient-to-br from-[#0d0d1f] via-[#0f0a1e] to-[#0a0a16] flex items-center justify-center">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-purple-900/15 pointer-events-none" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Mockup content behind video */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none">
              <div className="w-64 bg-[#0f0f1a] border border-violet-800/30 rounded-xl p-4 text-left">
                <p className="text-xs text-slate-500 mb-2">HabitAI — Day 21</p>
                <div className="space-y-1.5">
                  {["No phone before 9am ✓", "Read 20 pages ✓", "No social media ✓"].map((t) => (
                    <div key={t} className="text-xs text-violet-300 bg-violet-900/30 rounded-lg px-3 py-1.5">{t}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Play button */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div
                className="w-20 h-20 rounded-full bg-violet-600/90 hover:bg-violet-500 flex items-center justify-center shadow-2xl shadow-violet-900/60 transition-all duration-300 group-hover:scale-110"
                style={{ boxShadow: "0 0 0 12px rgba(139,92,246,0.12), 0 0 40px rgba(139,92,246,0.4)" }}
              >
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
              <span className="text-xs text-violet-400/80 tracking-wide font-medium">Coming soon</span>
            </div>

            {/* Duration badge */}
            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-mono px-2 py-1 rounded-md">
              3:21
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          No demo yet — but the app is live. Start your own story today.
        </p>
      </div>
    </section>
  );
}

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
              Open HabitAI
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
                HabitAI was created by Mannraj Jubbal, a 16-year-old developer from Wellington, New Zealand, on his 16th birthday — May&nbsp;18,&nbsp;2026. Operated by Surjeet Jubbal.
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
      <Navbar />
      <main>
        <Hero />
        <DemoSection />
        <ProblemSection />
        <SolutionSection />
        <WhoItsFor />
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
