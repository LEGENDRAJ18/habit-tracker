"use client";

import { useState } from "react";
import { X, HelpCircle, Plus, Flame, Zap, Sparkles, Users, CreditCard, ChevronDown } from "lucide-react";

const FAQ = [
  {
    q: "How do I add a habit?",
    a: 'Click "Add habit" at the top of your habit list, or press N on your keyboard. Use a specific name like "Walk 20 minutes" — the more concrete, the more likely you\'ll follow through.',
    icon: Plus,
  },
  {
    q: "How do streaks work?",
    a: "A streak counts how many days in a row you've completed a habit. Miss a day and it resets. Plus and Pro members get one streak freeze per week to protect against bad days.",
    icon: Flame,
  },
  {
    q: "What is XP?",
    a: "XP stands for Experience Points — you earn them every time you complete a habit. Finish all your habits in one day to earn bonus XP. Accumulate enough to level up from Beginner all the way to Grandmaster.",
    icon: Zap,
  },
  {
    q: "How does AI coaching work?",
    a: "Your AI coach reads your real habit data — completion rates, streaks, and patterns — then gives you a personalised 7-day improvement plan and three actionable fixes. Available on Plus and Pro. You get 5 coaching sessions per day.",
    icon: Sparkles,
  },
  {
    q: "How do I invite friends?",
    a: "Go to the Friends page and enter their email. If they already use HabitAI they'll get a friend request; otherwise we'll send them an invite link so they can join for free.",
    icon: Users,
  },
  {
    q: "How do I upgrade my plan?",
    a: 'Click "Upgrade Plan" in the left sidebar or visit the Billing page in Settings. Plus is $4.99/month and unlocks unlimited Habit Battles, group habits, weekly AI email reports, and more.',
    icon: CreditCard,
  },
];

export default function HelpModal() {
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      {/* Floating "?" button — sits above mobile bottom-nav */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open help and FAQ"
        title="Help & FAQ"
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 w-10 h-10 rounded-full bg-[#1a1a2e] border border-violet-700/40 text-violet-400 hover:text-white hover:border-violet-500/70 hover:bg-violet-950/70 flex items-center justify-center shadow-lg transition-all"
        style={{ boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
      >
        <HelpCircle className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="mobile-sheet-enter w-full sm:max-w-sm bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-violet-900/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-900/30 flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Help & FAQ</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-violet-950/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FAQ list */}
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-violet-900/10">
              {FAQ.map(({ q, a, icon: Icon }, i) => (
                <div key={i}>
                  <button
                    onClick={() => setActive(active === i ? null : i)}
                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-violet-950/30 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-900/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <p className="flex-1 text-sm font-medium text-white leading-snug pt-0.5">{q}</p>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-1 transition-transform duration-200 ${active === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {active === i && (
                    <div className="px-5 pb-4 pl-[3.25rem]">
                      <p className="text-xs text-slate-400 leading-relaxed">{a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-violet-900/15 bg-violet-950/10">
              <p className="text-[11px] text-slate-600 text-center">
                Need more help?{" "}
                <a
                  href="https://discord.gg/JM6QJks8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-500 hover:text-violet-400 transition-colors"
                >
                  Join our Discord
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
