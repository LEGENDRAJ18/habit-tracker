import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in HabitAI — release notes and recent updates.",
};

const RELEASES = [
  {
    version: "1.4",
    date: "April 2026",
    tag: "Latest",
    items: [
      "Optimistic habit deletion with 5-second undo toast",
      "Fixed weekly AI report showing wrong level due to incorrect XP formula",
      "Analytics page now correctly detects paid plan (was always showing free)",
      "Friend avatars now use a unique color per person instead of all-grey",
      "GitHub OAuth — sign in with GitHub on login and signup",
      "Vercel Analytics added for pageview tracking",
      "Fixed password reset flow: code exchange now happens before showing the new-password form",
    ],
  },
  {
    version: "1.3",
    date: "March 2026",
    tag: null,
    items: [
      "HabitAI logo redesigned — bigger, centered in the top navbar (Spotify-style)",
      "Prominent sidebar logo with purple ambient glow",
      "Back/forward navigation arrows in top navbar on desktop",
      "Tablet nav links moved to left side of top bar",
    ],
  },
  {
    version: "1.2",
    date: "February 2026",
    tag: null,
    items: [
      "AI coaching with three modes: pattern analysis, daily check-in, streak recovery",
      "Daily habit reminder emails (configurable hour) via Resend",
      "Weekly AI email report every Sunday with GPT-4o-mini analysis",
      "Streak freeze protection for Plus and Pro users",
      "Habit strength bar (0–100) showing how automatic a habit has become",
    ],
  },
  {
    version: "1.1",
    date: "January 2026",
    tag: null,
    items: [
      "Mobile bottom navigation bar",
      "Skeleton loaders for dashboard and analytics",
      "Greeting with time-of-day emoji and motivational quote",
      "Quick stats bar: completion %, current streak, XP",
      "Toast notification system",
      "Page transition animations",
    ],
  },
  {
    version: "1.0",
    date: "December 2025",
    tag: "Initial Release",
    items: [
      "Core habit tracking: add, complete, and delete habits daily",
      "XP and level system (Level 1 → 10,000) with non-linear curve",
      "Achievement badges: First Step, On Fire, Diamond Habit, Perfect Week, Power User",
      "Analytics: 7-day heatmap, completion rate, streak charts",
      "Calendar view with per-day completion breakdown",
      "Friends: invite by email, leaderboard by streak, cheer reactions",
      "Free / Plus / Pro billing tiers via Stripe",
      "PWA support — installable on mobile and desktop",
      "Email/password auth + OAuth (GitHub, Apple) via Supabase",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#09090f]">
      <div className="fixed top-1/3 left-1/4 w-96 h-96 bg-violet-700/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-violet-950/40">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>
          <span className="text-slate-600 text-sm">/</span>
          <span className="text-sm text-slate-400 font-medium">Changelog</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">Changelog</h1>
          <p className="text-slate-500 text-sm">Every update, fix, and new feature — in order.</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-violet-900/30" />

          <div className="space-y-10">
            {RELEASES.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-violet-600 border-2 border-[#09090f] ring-2 ring-violet-500/30" />

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-white">v{release.version}</span>
                  {release.tag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 uppercase tracking-widest">
                      {release.tag}
                    </span>
                  )}
                  <span className="text-xs text-slate-600">{release.date}</span>
                </div>

                <ul className="space-y-2">
                  {release.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400 leading-relaxed">
                      <span className="text-violet-600 mt-1.5 flex-shrink-0">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-violet-900/20 text-center">
          <p className="text-xs text-slate-600">
            Built by the HabitAI team &middot;{" "}
            <Link href="/" className="text-violet-500 hover:text-violet-400 transition-colors">
              Back to habitAI
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
