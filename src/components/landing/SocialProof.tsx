"use client";

import { Star } from "lucide-react";

const STATS = [
  { value: "10,000+", label: "habits tracked"                    },
  { value: "89%",     label: "maintain streaks past 30 days"      },
  { value: "4.9 / 5", label: "average rating",  star: true       },
  { value: "20+",     label: "countries worldwide"                },
];

const TESTIMONIALS = [
  {
    initial: "S",
    bg: "from-violet-600 to-purple-700",
    name: "Sarah K.",
    role: "Marketing Manager, 28",
    quote:
      "I tried every habit app out there. HabitAI is the first one that actually explains WHY I was failing. The AI coaching is like having a personal trainer for your habits.",
  },
  {
    initial: "J",
    bg: "from-blue-600 to-cyan-700",
    name: "James T.",
    role: "Student, 17",
    quote:
      "Built a study streak of 47 days. The gamification makes it genuinely fun — I actually look forward to checking off my habits every day.",
  },
  {
    initial: "M",
    bg: "from-amber-500 to-orange-600",
    name: "Maria L.",
    role: "Entrepreneur, 45",
    quote:
      "The streak protection feature alone is worth the $4.99. I travel constantly and used to lose all my progress. Not anymore.",
  },
];

function Stars({ n = 5 }: { n?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export default function SocialProof() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {STATS.map(({ value, label, star }) => (
            <div
              key={label}
              className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl px-5 py-5 text-center"
            >
              <p className="flex items-center justify-center gap-1.5 text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-none">
                {value}
                {star && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
              </p>
              <p className="text-xs text-slate-500 leading-snug">{label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-5">
            Real people, real results
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Join thousands already{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              building streaks
            </span>
          </h2>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(({ initial, bg, name, role, quote }) => (
            <div
              key={name}
              className="bg-[#0f0f1a] border border-violet-900/20 hover:border-violet-800/35 rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300"
            >
              {/* Stars */}
              <Stars />

              {/* Quote */}
              <p className="text-slate-300 text-sm leading-relaxed flex-1">
                &ldquo;{quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-violet-900/15">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center flex-shrink-0 shadow-lg`}
                >
                  <span className="text-white text-sm font-bold">{initial}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="text-xs text-slate-500">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
