import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const mockHabits = [
  { name: "Morning Meditation", done: true, streak: 12 },
  { name: "Exercise 30 min", done: true, streak: 8 },
  { name: "Read 20 pages", done: true, streak: 5 },
  { name: "Drink 8 glasses of water", done: false, streak: 3 },
  { name: "Evening journal", done: false, streak: 1 },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 pb-24 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-violet-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-900/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI-Powered Habit Intelligence
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
          Build habits that
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
            actually stick.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Track, analyze, and optimize your daily habits with AI insights that adapt
          to your lifestyle. Join 10,000+ people building better habits every day.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40 hover:shadow-violet-800/50 hover:-translate-y-0.5"
          >
            Start for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-violet-950/50 border border-violet-800/40 hover:bg-violet-950/80 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200"
          >
            See how it works
          </Link>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 mb-20">
          {["No credit card required", "Free forever plan", "Cancel anytime"].map(
            (item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-violet-500" />
                {item}
              </span>
            )
          )}
        </div>

        {/* App mockup */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-2xl blur-2xl scale-105 pointer-events-none" />
          <div className="relative bg-[#0f0f1a]/90 border border-violet-800/30 rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/50">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a14] border-b border-violet-900/20">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="flex-1 text-center text-xs text-slate-500">
                habitAI — Dashboard
              </span>
            </div>

            {/* Mock dashboard content */}
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between mb-5">
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
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                  style={{ width: "60%" }}
                />
              </div>

              <div className="space-y-2.5">
                {mockHabits.map((habit) => (
                  <div
                    key={habit.name}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${
                      habit.done
                        ? "bg-violet-600/10 border-violet-600/25"
                        : "bg-violet-950/30 border-violet-900/20"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        habit.done
                          ? "bg-violet-500"
                          : "border-2 border-violet-700/60"
                      }`}
                    >
                      {habit.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span
                      className={`text-sm flex-1 text-left ${
                        habit.done ? "text-slate-400 line-through" : "text-slate-200"
                      }`}
                    >
                      {habit.name}
                    </span>
                    <span className="text-xs text-violet-400 whitespace-nowrap">
                      🔥 {habit.streak}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
