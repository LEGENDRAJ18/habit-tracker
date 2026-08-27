"use client";

import Link from "next/link";
import { ChevronLeft, Crown } from "lucide-react";
import BackToDashboardButton from "@/components/ui/BackToDashboardButton";

const SECTIONS = [
  {
    id: "getting-started",
    emoji: "🚀",
    title: "Getting Started",
    topics: [
      {
        icon: "➕",
        title: "Adding your first habit",
        body: 'Tap the purple "Add Habit" button on the dashboard (or press N on a keyboard). Type a specific habit name — "Do 20 push-ups" earns full XP, while vague names like "Exercise" earn partial XP. The AI instantly validates your habit. Tap any habit to mark it complete.',
      },
      {
        icon: "⚡",
        title: "XP and levels",
        body: "Every habit you complete earns XP. Valid habits: +10 XP. Partial (vague) habits: +5 XP. You also get a ~12% Lucky Bonus of +20 XP on any completion, and +5 XP every day you open the app. Collect enough XP to level up. Tap your level badge to see a full XP breakdown.",
      },
      {
        icon: "🔥",
        title: "How streaks work",
        body: "A streak counts consecutive days you've completed at least one habit. Complete a habit every day to keep it alive. Miss a day and it resets to 0. Tap the streak badge (🔥) in the dashboard header to open the calendar heatmap and see your full history. Plus and Pro users get one Streak Freeze per week.",
      },
    ],
  },
  {
    id: "dashboard",
    emoji: "📊",
    title: "Dashboard",
    topics: [
      {
        icon: "✅",
        title: "Habit list",
        body: "Your habits are listed in order of creation. Tap a habit card to complete it (or undo). Each card shows the habit name, current streak, and XP value. Completed habits show a checkmark and move to a visual done state. Use the three-dot menu on any card to edit, delete, set a reminder, or start a Focus Timer.",
      },
      {
        icon: "💪",
        title: "Level bar (tappable)",
        body: "The bar above the stats grid shows your XP progress toward the next level. Tap it (or tap your level badge) to open a full XP Detail sheet. The sheet shows your progress ring, XP breakdown by day this week, next level reward, all achievements, and an estimate of how many days until you level up.",
      },
      {
        icon: "📅",
        title: "Weekly dots",
        body: "The seven dots (M–T–W–T–F–S–S) below the progress bar show your current week. A filled purple dot means you had at least one habit completion that day. Today's dot is outlined if you haven't completed anything yet. The 'X/7 this week' counter lets you aim for a perfect 7.",
      },
      {
        icon: "🥇",
        title: "Daily milestones",
        body: 'Milestone cards reward you for hitting targets: completing your first habit today, finishing all habits, hitting a 7-day streak, and more. On mobile they appear below your habits. On desktop they appear in the right sidebar. Each milestone can be shared to social media via the "Share" button.',
      },
      {
        icon: "➕",
        title: "Add Habit button",
        body: 'The purple "Add Habit" button is always visible. You can also press N on a keyboard. Tapping it opens the Add Habit modal where you can type a name, pick a frequency (daily/weekly), set a duration, and choose a reminder time. The AI validates your habit name in real time.',
      },
    ],
  },
  {
    id: "features",
    emoji: "✨",
    title: "Features",
    topics: [
      {
        icon: "🤖",
        title: "AI Coach",
        body: "Tap 'Analyse My Habits' in the sidebar or AI card to start an AI coaching session. The coach reads your actual streak, XP, recent completions, and goals — so every insight is personal. Free: 1 analysis/day. Plus: 5/day. Pro: unlimited. Pro users also have AI memory, so the coach remembers your history across sessions.",
      },
      {
        icon: "⏱️",
        title: "Focus Timer",
        body: "Habits with a duration set (e.g. 'Study for 30 min') show a timer icon on their card. Tap 'Start Timer' to launch a full-screen focus session with a countdown. When the timer ends, the habit is automatically completed and you earn XP. Pro users also unlock Pomodoro mode (25-min work / 5-min break cycles).",
      },
      {
        icon: "⚔️",
        title: "Habit Battles",
        body: "Challenge a friend to track the same habit for a set period — whoever completes it more often wins. Open the Friends page, find a friend, and tap 'Battle'. Results and progress appear in your Friends activity feed. Plus and Pro users can run unlimited simultaneous battles.",
      },
      {
        icon: "🧬",
        title: "Habit DNA",
        body: "Habit DNA is a visual card showing your completion patterns, your strongest habits, and your overall consistency score. Tap the 'DNA' button in the dashboard header to generate your card. You can download it as an image and share it. Available to Plus and Pro users.",
      },
      {
        icon: "📊",
        title: "Monthly Wrapped",
        body: "On the 1st of each month, Pro users automatically see their Monthly Wrapped — a summary of completions, longest streak, XP earned, top habit, and personality tags. You can also trigger it manually by tapping 'Wrapped' in the dashboard header. Pro only.",
      },
      {
        icon: "🎙️",
        title: "Voice Check-ins",
        body: "Record a short voice memo as a daily check-in. The AI transcribes and analyses your recording to extract habit completions and mood — no tapping required. Access from the dashboard or any habit card menu. Pro only.",
      },
      {
        icon: "🎓",
        title: "University Goal Mode",
        body: "Set a dream university in Student mode. Your dashboard shows a countdown to the application deadline, frames all habits as part of your academic journey, and provides university-specific AI coaching. Set up in Settings → Mode → Student. Pro only.",
      },
      {
        icon: "😊",
        title: "Mood Check-in",
        body: "A quick 1–5 emoji mood rating appears at the top of the dashboard once per day. Your mood is saved alongside completions and the AI coach can reference it. Available on all plans.",
      },
      {
        icon: "📋",
        title: "Commitment Contracts",
        body: "Add a public commitment to any habit — a written statement of intent that other users can see. This social accountability dramatically increases follow-through. Access from the habit card three-dot menu. Plus and Pro.",
      },
    ],
  },
  {
    id: "plans",
    emoji: "💎",
    title: "Plans",
    topics: [
      {
        icon: "🌱",
        title: "Free plan",
        body: "Unlimited habits, streaks, XP and levels, friends and leaderboard, basic mood tracking, AI coach (1 analysis/day). Everything you need to build a habit practice from scratch — no credit card required.",
      },
      {
        icon: "⚡",
        title: "Plus — $4.99/month",
        body: "Everything in Free, plus: full Habit DNA card with download, unlimited Habit Battles, public commitment contracts, group habits, weekly AI email summary, 5 AI analyses/day, and advanced analytics.",
      },
      {
        icon: "👑",
        title: "Pro — $9.99/month",
        body: "Everything in Plus, plus: AI habit recommendations, deep AI memory, voice check-ins, Monthly Wrapped, Focus Timer Pomodoro mode, Organisation/school mode, University Goal Mode, smart push notifications, and unlimited AI analyses.",
      },
      {
        icon: "💳",
        title: "How to upgrade",
        body: "Go to Settings → Plan and tap 'Upgrade to Plus' or 'Upgrade to Pro'. Payment is handled by Stripe — secure, no hidden fees. Features unlock immediately after payment. You can cancel any time.",
      },
      {
        icon: "🔄",
        title: "Cancelling",
        body: "Cancel any time from Settings → Plan → Manage Subscription. You keep access until the end of the billing period. Your habits, streaks, and XP are never deleted — you can pick up right where you left off if you resubscribe.",
      },
    ],
  },
];

const COMPARISON_ROWS: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Unlimited habits",         true,    true,    true],
  ["Streaks & XP",             true,    true,    true],
  ["Friends & leaderboard",    true,    true,    true],
  ["Mood check-in",            true,    true,    true],
  ["AI Coach",                 "1/day", "5/day", "∞"],
  ["Habit DNA",                false,   true,    true],
  ["Habit Battles",            false,   true,    true],
  ["Group habits",             false,   true,    true],
  ["Weekly email report",      false,   true,    true],
  ["AI Recommendations",       false,   false,   true],
  ["Voice Check-ins",          false,   false,   true],
  ["Monthly Wrapped",          false,   false,   true],
  ["Focus Timer (Pomodoro)",   false,   false,   true],
  ["University Goal Mode",     false,   false,   true],
  ["Deep AI Memory",           false,   false,   true],
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Back */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-violet-400 transition-colors text-sm mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Settings
        </Link>

        {/* Hero */}
        <div className="mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-purple-600/20 border border-violet-600/30 flex items-center justify-center mb-4 text-2xl">
            📖
          </div>
          <h1 className="text-3xl font-black text-white mb-2">How to use HabitAI</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Everything you need to know to build life-changing habits with AI. Start here if you&apos;re new, or jump to any section below.
          </p>
        </div>

        {/* Jump links */}
        <div className="flex flex-wrap gap-2 mb-10">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-950/40 border border-violet-800/30 text-violet-300 hover:bg-violet-950/70 hover:border-violet-600/50 transition-all"
            >
              {s.emoji} {s.title}
            </a>
          ))}
          <a
            href="#comparison"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-950/30 border border-amber-800/30 text-amber-300 hover:bg-amber-950/50 hover:border-amber-600/50 transition-all"
          >
            📋 Plan Comparison
          </a>
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mb-12 scroll-mt-6">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-900/40 border border-violet-700/30 flex items-center justify-center flex-shrink-0 text-lg">
                {section.emoji}
              </div>
              <h2 className="text-xl font-black text-white">{section.title}</h2>
            </div>

            <div className="space-y-3">
              {section.topics.map((topic) => (
                <div
                  key={topic.title}
                  className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5 hover:border-violet-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5 flex-shrink-0">{topic.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1.5">{topic.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{topic.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Plan comparison */}
        <section id="comparison" className="mb-12 scroll-mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-900/30 border border-amber-700/30 flex items-center justify-center flex-shrink-0 text-lg">
              📋
            </div>
            <h2 className="text-xl font-black text-white">Plan Comparison</h2>
          </div>

          <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-4 border-b border-violet-900/20">
              <div className="p-3" />
              <div className="p-3 text-center">
                <p className="text-xs font-bold text-slate-400">Free</p>
                <p className="text-[10px] text-slate-600 mt-0.5">$0</p>
              </div>
              <div className="p-3 text-center bg-violet-950/30">
                <p className="text-xs font-bold text-violet-300">Plus</p>
                <p className="text-[10px] text-slate-500 mt-0.5">$4.99/mo</p>
              </div>
              <div className="p-3 text-center bg-amber-950/20">
                <div className="flex items-center justify-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <p className="text-xs font-bold text-amber-300">Pro</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">$9.99/mo</p>
              </div>
            </div>

            {COMPARISON_ROWS.map(([feature, free, plus, pro], i) => (
              <div
                key={feature}
                className={`grid grid-cols-4 border-b border-violet-900/10 last:border-b-0 ${i % 2 === 0 ? "" : "bg-violet-950/5"}`}
              >
                <div className="px-4 py-2.5">
                  <p className="text-xs text-slate-400">{feature}</p>
                </div>
                {([free, plus, pro] as (string | boolean)[]).map((val, j) => (
                  <div
                    key={j}
                    className={`px-3 py-2.5 text-center ${j === 1 ? "bg-violet-950/10" : j === 2 ? "bg-amber-950/10" : ""}`}
                  >
                    {typeof val === "string" ? (
                      <span className="text-xs font-bold text-violet-400">{val}</span>
                    ) : val ? (
                      <span className="text-green-400 text-base leading-none">✓</span>
                    ) : (
                      <span className="text-slate-700 text-sm">—</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-6 border-t border-violet-900/20">
          <p className="text-sm text-slate-400 mb-4">Ready to unlock the full experience?</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-900/30 text-sm"
          >
            View Plans &amp; Upgrade
          </Link>
          <p className="text-xs text-slate-600 mt-3">
            Questions?{" "}
            <a href="mailto:support@habitaiapp.com" className="text-violet-500 hover:text-violet-400 transition-colors">
              support@habitaiapp.com
            </a>
          </p>
        </div>

        <BackToDashboardButton />
      </div>
    </div>
  );
}
