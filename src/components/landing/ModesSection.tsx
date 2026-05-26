"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, ArrowRight } from "lucide-react";

const MODES_LANDING = [
  {
    emoji: "🎓",
    label: "Student",
    tagline: "Academic excellence",
    desc: "University goal tracking, study timer, exam countdown, Academic Performance Score, and an AI coach focused on getting you into your dream uni.",
    bullets: ["Dream university journey tracker", "Study session timer widget", "Student Success Pack (6 habits)", "Classmate leaderboard"],
    color:  "text-indigo-300",
    border: "border-indigo-500/30",
    glow:   "bg-indigo-500/8",
    badgeBg: "rgba(79,70,229,0.15)",
    badgeBorder: "rgba(99,102,241,0.3)",
  },
  {
    emoji: "👨‍👩‍👧",
    label: "Parent",
    tagline: "Monitor & encourage",
    desc: "A completely different dashboard — see each child's habit completion with a live traffic light. Send encouragement in one tap.",
    bullets: ["🟢 Green / 🟡 Yellow / 🔴 Red per child", "Real-time habit completion feed", "One-tap encouragement messages", "Weekly summary per child"],
    color:  "text-emerald-300",
    border: "border-emerald-500/30",
    glow:   "bg-emerald-500/8",
    badgeBg: "rgba(5,150,105,0.12)",
    badgeBorder: "rgba(52,211,153,0.3)",
  },
  {
    emoji: "👨‍🏫",
    label: "Teacher / Coach",
    tagline: "Lead your team",
    desc: "Class analytics dashboard with completion rates, top performers, group announcements, and CSV export. Built for educators.",
    bullets: ["Class completion rate at a glance", "Top 3 performers leaderboard", "Unique class invite code", "Export progress report as CSV"],
    color:  "text-amber-300",
    border: "border-amber-500/30",
    glow:   "bg-amber-500/8",
    badgeBg: "rgba(180,83,9,0.12)",
    badgeBorder: "rgba(245,158,11,0.3)",
  },
  {
    emoji: "🙋",
    label: "Personal",
    tagline: "Self improvement",
    desc: "The full HabitAI experience. Fitness, finance, mindfulness, career. Habit Battles, Monthly Wrapped, Habit DNA — everything focused on your growth.",
    bullets: ["All 6 personal growth categories", "Habit Battles & social features", "Monthly Wrapped story", "Habit DNA fingerprint"],
    color:  "text-violet-300",
    border: "border-violet-500/30",
    glow:   "bg-violet-500/8",
    badgeBg: "rgba(109,40,217,0.15)",
    badgeBorder: "rgba(139,92,246,0.3)",
  },
];

function ModesMockup({ mode }: { mode: typeof MODES_LANDING[0] }) {
  if (mode.label === "Student") {
    return (
      <div className="bg-[#0b0b18] border border-indigo-700/20 rounded-2xl p-5 shadow-2xl shadow-black/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎓</span>
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Academic Performance</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["87%", "Today"], ["21d", "Streak"], ["2.4k", "XP"]].map(([v, l]) => (
            <div key={l} className="bg-black/30 border border-white/[0.05] rounded-xl p-2 text-center">
              <p className="text-sm font-black text-indigo-300">{v}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-indigo-950/40 border border-indigo-700/25 rounded-xl px-3 py-2.5">
          <p className="text-[11px] text-indigo-300 font-semibold mb-0.5">🎓 Your Oxford journey</p>
          <p className="text-[10px] text-slate-500">Day 47 · 500 days until application deadline</p>
          <div className="mt-1.5 h-1 bg-indigo-950/60 rounded-full overflow-hidden">
            <div className="h-full w-[9%] bg-indigo-500 rounded-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          {["📚 Study 2 hours", "😴 Sleep 8 hours", "🏃 Exercise 30 min"].map((h, i) => (
            <div key={h} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] ${i < 2 ? "bg-indigo-600/10 border-indigo-600/20 text-slate-400 line-through" : "bg-[#0c0c18] border-violet-900/20 text-slate-300"}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i < 2 ? "bg-indigo-500" : "border border-slate-700"}`} />
              {h}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode.label === "Parent") {
    return (
      <div className="bg-[#0b0b18] border border-emerald-700/20 rounded-2xl p-5 shadow-2xl shadow-black/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👨‍👩‍👧</span>
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Your Children</span>
          <span className="ml-auto text-[10px] text-emerald-400 font-semibold">Live</span>
        </div>
        {[
          { name: "Mannraj", pct: 100, light: "🟢", done: "4/4" },
          { name: "Priya",   pct: 50,  light: "🟡", done: "2/4" },
          { name: "Arjun",   pct: 0,   light: "🔴", done: "0/4" },
        ].map(({ name, pct, light, done }) => (
          <div key={name} className="bg-black/30 border border-white/[0.05] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{light}</span>
              <span className="text-xs font-semibold text-white">{name}</span>
              <span className="ml-auto text-xs text-slate-500">{done} habits</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-red-700/50"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mode.label === "Teacher / Coach") {
    return (
      <div className="bg-[#0b0b18] border border-amber-700/20 rounded-2xl p-5 shadow-2xl shadow-black/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏫</span>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Year 11 Biology</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["24", "Students"], ["67%", "Class avg"], ["8", "100% today"]].map(([v, l]) => (
            <div key={l} className="bg-black/30 border border-white/[0.05] rounded-xl p-2 text-center">
              <p className="text-sm font-black text-amber-300">{v}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {[["🥇", "@alex_m", "100%"], ["🥈", "@priya_s", "87%"], ["🥉", "@jae_k", "75%"]].map(([medal, u, p]) => (
            <div key={u} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.04] text-[11px]">
              <span>{medal}</span>
              <span className="text-slate-300 font-medium">{u}</span>
              <span className="ml-auto text-amber-300 font-bold">{p}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Personal
  return (
    <div className="bg-[#0b0b18] border border-violet-700/20 rounded-2xl p-5 shadow-2xl shadow-black/40 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🙋</span>
        <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Personal Growth</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[["🏋️", "Fitness", "🔥12d"], ["🧠", "Wellness", "🔥8d"], ["📈", "Finance", "🔥5d"], ["💤", "Sleep", "🔥3d"]].map(([e, l, s]) => (
          <div key={l} className="bg-black/30 border border-white/[0.05] rounded-xl p-2.5">
            <p className="text-base mb-1">{e}</p>
            <p className="text-xs font-semibold text-white">{l}</p>
            <p className="text-[10px] text-orange-400">{s}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-violet-950/30 border border-violet-700/20 rounded-xl px-3 py-2">
        <span className="text-sm">⚔️</span>
        <p className="text-[11px] text-slate-300">Habit Battle vs Alex — 5 days left</p>
        <span className="ml-auto text-[10px] text-violet-400 font-bold">60% ahead</span>
      </div>
    </div>
  );
}

export default function ModesSection() {
  const [active, setActive] = useState(0);
  const mode = MODES_LANDING[active];

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            HabitAI adapts to who you are
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            One app.{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Four experiences.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Select your mode during onboarding. Your dashboard, AI coach, and habit suggestions all transform to fit your life.
          </p>
        </div>

        {/* Mode selector pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {MODES_LANDING.map((m, i) => (
            <button
              key={m.label}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-semibold transition-all duration-200 ${
                active === i
                  ? `${m.border} ${m.color}`
                  : "border-violet-900/20 text-slate-500 hover:text-slate-300 hover:border-violet-700/30"
              }`}
              style={active === i ? { background: m.glow === "bg-indigo-500/8" ? "rgba(99,102,241,0.08)" : m.glow === "bg-emerald-500/8" ? "rgba(16,185,129,0.08)" : m.glow === "bg-amber-500/8" ? "rgba(245,158,11,0.08)" : "rgba(139,92,246,0.08)" } : undefined}
            >
              <span>{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode detail */}
        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-14">
          {/* Text */}
          <div className="flex-1 w-full">
            <div className="mb-4">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${mode.color}`}
                style={{ background: mode.badgeBg, border: `1px solid ${mode.badgeBorder}` }}
              >
                {mode.emoji} {mode.label} Mode
              </span>
            </div>
            <h3 className={`text-3xl sm:text-4xl font-black mb-4 leading-tight ${mode.color}`}>
              {mode.tagline}
            </h3>
            <p className="text-base text-slate-400 leading-relaxed mb-6">{mode.desc}</p>
            <ul className="space-y-2.5">
              {mode.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href="/auth/signup"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90`}
                style={{ background: `linear-gradient(135deg, ${mode.badgeBg}, rgba(109,40,217,0.3))`, border: `1px solid ${mode.badgeBorder}` }}
              >
                <ArrowRight className="w-4 h-4" />
                Start as {mode.label} — free
              </Link>
            </div>
          </div>

          {/* Mockup */}
          <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-none mx-auto lg:mx-0">
            <div className="relative">
              <div
                className="absolute -inset-6 opacity-30 rounded-3xl blur-3xl pointer-events-none"
                style={{ background: mode.badgeBg }}
              />
              <div className="relative">
                <ModesMockup mode={mode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
