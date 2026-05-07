"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown, Search, Sparkles, Zap, Crown, Brain,
  Mail, BookOpen, CreditCard, HelpCircle, ArrowLeft,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

// ─── content ──────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      {
        q: "What is HabitAI?",
        a: (
          <>
            HabitAI is an AI-powered habit tracker that helps you build lasting habits through personalised coaching, streak tracking, and smart reminders. Unlike basic trackers, HabitAI analyses your patterns and gives you actionable weekly game plans tailored to your goals.
          </>
        ),
      },
      {
        q: "How do I add my first habit?",
        a: (
          <>
            From the Dashboard, click the <strong className="text-white">+ Add Habit</strong> button (top-right on desktop, floating button on mobile). Enter a habit name — our AI will validate it in real-time and tell you if it&apos;s specific enough to earn full XP. You can also set a frequency (daily or weekly), stack it after an existing habit, and add implementation intentions (when, where, how long).
          </>
        ),
      },
      {
        q: "How do I complete a habit and earn XP?",
        a: (
          <>
            Click the circle checkbox on any habit card to mark it complete. You&apos;ll earn <strong className="text-white">10 XP</strong> for valid habits, <strong className="text-white">5 XP</strong> for vague ones, and no XP for invalid habits. Completing habits also increases your <strong className="text-white">Habit Strength</strong> score (max 100), which tracks how automatic the habit is becoming.
          </>
        ),
      },
      {
        q: "How does the leveling system work?",
        a: (
          <>
            Every habit completion earns XP. As you accumulate XP, you level up through ranks — from <em>Spark</em> all the way to <em>Legend</em>. Your current level and XP are shown in the top navigation bar. Hitting milestones (like 7-day or 30-day streaks) unlocks achievement badges you can share.
          </>
        ),
      },
    ],
  },
  {
    id: "plans",
    title: "Plans & Pricing",
    icon: <CreditCard className="w-4 h-4" />,
    items: [
      {
        q: "What's included in the Free plan?",
        a: (
          <>
            The Free plan lets you track up to <strong className="text-white">5 habits</strong>, view basic analytics, and earn XP. It&apos;s a great way to get started — no credit card required.
          </>
        ),
      },
      {
        q: "What does Plus ($7 NZD/mo) include?",
        a: (
          <ul className="space-y-1 mt-1">
            {[
              "Unlimited habits",
              "Full analytics & streak charts",
              "5 AI coaching insights per day",
              "Streak freeze protection (1 per week)",
              "Daily email reminders",
              "Friends & leaderboards",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        ),
      },
      {
        q: "What does Pro ($12 NZD/mo) include?",
        a: (
          <ul className="space-y-1 mt-1">
            {[
              "Everything in Plus",
              "🤖 AI Weekly Game Plan (auto-generated every Monday)",
              "📊 Deep Analytics & Trends (best day, monthly trend, at-risk warnings, habit pairs)",
              "🔔 Smart Habit Notifications (AI learns your best completion time per habit)",
              "💡 AI Habit Suggestions (goal-based chips when adding habits)",
              "Unlimited AI coaching insights",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        ),
      },
      {
        q: "Is there a free trial?",
        a: (
          <>
            Yes — the <strong className="text-white">Plus plan</strong> comes with a <strong className="text-white">7-day free trial</strong>. No charge during the trial. You can cancel any time before it ends and won&apos;t be billed. After the trial, it&apos;s $7 NZD/month.
          </>
        ),
      },
      {
        q: "Is there a money-back guarantee?",
        a: (
          <>
            Yes. We offer a <strong className="text-white">7-day money-back guarantee</strong> on your first payment. If you&apos;re not satisfied within 7 days of being charged, email <a href="mailto:support@habitai.app" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">support@habitai.app</a> for a full refund — no questions asked.
          </>
        ),
      },
    ],
  },
  {
    id: "ai",
    title: "AI Features",
    icon: <Brain className="w-4 h-4" />,
    items: [
      {
        q: "How does AI coaching work?",
        a: (
          <>
            Click <strong className="text-white">Analyse My Habits</strong> in the dashboard sidebar to get a personalised AI analysis of your habit patterns, strengths, and areas for improvement. Plus users get 5 insights per day; Pro users get unlimited. The AI uses your actual completion data — not generic advice.
          </>
        ),
      },
      {
        q: "What does the weekly game plan include?",
        a: (
          <>
            Every <strong className="text-white">Monday morning</strong>, HabitAI automatically generates a personalised 4–5 action game plan for Pro users based on your habit history, current streaks, and stated goals. The plan appears as a card in your dashboard sidebar. You can also regenerate it at any time by clicking the refresh button on the card.
          </>
        ),
      },
      {
        q: "How do smart notifications learn my schedule?",
        a: (
          <>
            For Pro users, each habit card has a <strong className="text-white">⚡ Smart timing</strong> toggle. When you enable it, HabitAI analyses your last 30 completions for that habit and finds the hour you most often complete it. Future reminders for that habit are sent at your personal optimal time — not a generic reminder hour.
          </>
        ),
      },
      {
        q: "What are AI habit suggestions?",
        a: (
          <>
            When adding a new habit, Pro users see a <strong className="text-white">Need inspiration?</strong> section with goal-matched habit chips (e.g., if your goal is fitness, you&apos;ll see &ldquo;Run 5km&rdquo;, &ldquo;20 pushups every morning&rdquo;, etc.). Click a chip to fill the habit name instantly. Use &ldquo;More ideas&rdquo; to cycle through more suggestions.
          </>
        ),
      },
    ],
  },
  {
    id: "billing",
    title: "Account & Billing",
    icon: <Zap className="w-4 h-4" />,
    items: [
      {
        q: "How do I upgrade or change my plan?",
        a: (
          <>
            Click your avatar in the top-right nav, then select <strong className="text-white">Billing &amp; Subscription</strong>. You can upgrade to Plus or Pro from there. Alternatively, look for upgrade prompts throughout the app — clicking them opens the plan comparison modal.
          </>
        ),
      },
      {
        q: "How do I cancel my subscription?",
        a: (
          <>
            Go to <strong className="text-white">Billing &amp; Subscription</strong> in the nav menu and click <strong className="text-white">Manage Billing</strong>. This opens the Stripe customer portal where you can cancel. After cancellation, you keep access until the end of your current billing period.
          </>
        ),
      },
      {
        q: "What is the refund policy?",
        a: (
          <>
            We offer a <strong className="text-white">7-day money-back guarantee</strong> on first payments. If you cancel during a free trial, you&apos;re never charged. For refund requests, email <a href="mailto:support@habitai.app" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">support@habitai.app</a> within 7 days of your first charge.
          </>
        ),
      },
      {
        q: "How do I change my goals?",
        a: (
          <>
            From the Dashboard, scroll down to the <strong className="text-white">Recommended habits</strong> section and click <strong className="text-white">Change goals</strong>. This re-opens the goal selection screen so you can update your focus areas.
          </>
        ),
      },
      {
        q: "How do I delete my account?",
        a: (
          <>
            Go to <strong className="text-white">Account Settings</strong> (nav menu → Account Settings) and scroll to the bottom. Click <strong className="text-white">Delete Account</strong>. This permanently deletes all your habits, logs, and profile data. Make sure to cancel any active subscription first via Billing &amp; Subscription.
          </>
        ),
      },
    ],
  },
];

// ─── accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ item, defaultOpen = false }: { item: FAQItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-violet-900/20 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-violet-950/20 transition-colors"
      >
        <span className="text-sm font-medium text-slate-200">{item.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            (typeof item.a === "string" && item.a.toLowerCase().includes(q)),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [query]);

  const totalResults = filtered.reduce((n, s) => n + s.items.length, 0);
  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-violet-900/20">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-[#09090f] to-purple-950/40 pointer-events-none" />
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/25 border border-violet-600/35 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">habit</span>
                <span className="text-xl font-black text-violet-400 tracking-tight">AI</span>
              </div>
              <p className="text-xs text-slate-500 leading-none">Help & Support</p>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">How can we help?</h1>
          <p className="text-sm text-slate-500 mb-7">Find answers to common questions about HabitAI.</p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="w-full bg-[#0f0f1a] border border-violet-900/40 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {isSearching && (
            <p className="text-xs text-slate-600 mt-2.5">
              {totalResults === 0
                ? "No results found — try a different keyword"
                : `${totalResults} result${totalResults !== 1 ? "s" : ""} for "${query}"`}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {filtered.length === 0 && isSearching && (
          <div className="text-center py-16">
            <HelpCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">No matching questions</p>
            <p className="text-sm text-slate-600">Try different keywords or browse the sections below.</p>
            <button onClick={() => setQuery("")} className="mt-4 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Clear search
            </button>
          </div>
        )}

        {filtered.map((section) => (
          <div key={section.id} id={section.id}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-violet-400">{section.icon}</span>
              <h2 className="text-base font-bold text-white">{section.title}</h2>
            </div>
            <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
              {section.items.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  item={item}
                  defaultOpen={isSearching || (section.id === "getting-started" && i === 0)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Contact section */}
        {!isSearching && (
          <div className="bg-gradient-to-br from-violet-950/50 to-purple-950/30 border border-violet-700/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-600/25 border border-violet-600/35 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-0.5">Still need help?</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Email us at{" "}
                <a
                  href="mailto:support@habitai.app"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors font-medium"
                >
                  support@habitai.app
                </a>{" "}
                — we respond within 24 hours.
              </p>
            </div>
            <a
              href="mailto:support@habitai.app"
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              Email support
            </a>
          </div>
        )}

        {/* Plan quick links */}
        {!isSearching && (
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Free</p>
              <p className="text-lg font-bold text-white mb-1">$0 <span className="text-xs font-normal text-slate-600">/ mo</span></p>
              <p className="text-xs text-slate-600 leading-relaxed">Up to 5 habits, basic XP tracking</p>
            </div>
            <div className="bg-[#0c0c18] border border-violet-600/40 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <p className="text-xs font-bold text-violet-400 uppercase tracking-wider">Plus</p>
              </div>
              <p className="text-lg font-bold text-white mb-0.5">$7 <span className="text-xs font-normal text-slate-600">NZD / mo</span></p>
              <p className="text-[10px] text-violet-400 font-semibold mb-1">7-day free trial</p>
              <p className="text-xs text-slate-600 leading-relaxed">Unlimited habits, AI coaching, reminders</p>
            </div>
            <div className="bg-[#0c0c18] border border-amber-600/40 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Crown className="w-3 h-3 text-amber-400" />
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pro</p>
              </div>
              <p className="text-lg font-bold text-white mb-0.5">$12 <span className="text-xs font-normal text-slate-600">NZD / mo</span></p>
              <p className="text-xs text-slate-600 leading-relaxed">AI game plans, deep analytics, smart alerts</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
