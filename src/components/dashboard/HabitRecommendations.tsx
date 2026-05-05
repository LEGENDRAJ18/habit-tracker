"use client";

import { useState } from "react";
import { Sparkles, Plus, Target, Loader2 } from "lucide-react";
import type { Habit } from "@/types";

// ─── Data ─────────────────────────────────────────────────────────────────────

type Rec = { emoji: string; name: string; description: string };

const GOAL_RECS: Record<string, Rec[]> = {
  "Get fit & healthy": [
    { emoji: "🏃", name: "Morning Run",              description: "Start the day with a 20-min run"        },
    { emoji: "💧", name: "Drink 8 glasses of water", description: "Stay hydrated throughout the day"       },
    { emoji: "🧘", name: "10 min stretching",        description: "Loosen up and prevent injuries"         },
    { emoji: "🥗", name: "No junk food today",       description: "Choose clean, whole foods all day"      },
  ],
  "Learn & grow": [
    { emoji: "📖", name: "Read 20 pages",                description: "Daily reading compounds into mastery"   },
    { emoji: "🎬", name: "Watch 1 educational video",    description: "Learn something new every single day"  },
    { emoji: "🎯", name: "Practice a skill for 30 min", description: "Deliberate practice beats talent"      },
    { emoji: "📔", name: "Write in a journal",          description: "Reflect and capture your thoughts"     },
  ],
  "Build mental wellness": [
    { emoji: "🧘", name: "10 min meditation",        description: "Clear your mind and reduce stress"    },
    { emoji: "🙏", name: "Gratitude journal",         description: "Write 3 things you're grateful for" },
    { emoji: "📵", name: "Digital detox 1hr",         description: "Unplug and be truly present"         },
    { emoji: "🌬️", name: "Deep breathing exercises", description: "4-7-8 breathing for calm focus"       },
  ],
  "Be more productive": [
    { emoji: "📝", name: "Plan tomorrow tonight",  description: "Set up for a winning next day"     },
    { emoji: "📵", name: "No phone first 30min",   description: "Start the day distraction-free"    },
    { emoji: "🍅", name: "Pomodoro work session",  description: "25 min focused, 5 min break"       },
    { emoji: "📊", name: "Weekly review",          description: "Reflect on wins and plan next week" },
  ],
  "Improve sleep": [
    { emoji: "📺", name: "No screens 1hr before bed",   description: "Wind down without blue light"       },
    { emoji: "🌙", name: "Sleep by 10pm",               description: "Consistent bedtime builds routine"  },
    { emoji: "☕", name: "No caffeine after 2pm",       description: "Protect your sleep quality"         },
    { emoji: "☀️", name: "Morning sunlight exposure",   description: "10 min outside to set your rhythm" },
  ],
};

const DEFAULT_RECS: Rec[] = [
  { emoji: "🧘", name: "10 min meditation",          description: "Clear your mind daily"              },
  { emoji: "📖", name: "Read 20 pages",              description: "Feed your mind every day"           },
  { emoji: "💧", name: "Drink 8 glasses of water",   description: "Stay hydrated throughout the day"  },
  { emoji: "🏃", name: "Morning walk",               description: "Get moving to start the day right" },
];

function getRecsForGoals(goals: string[]): Rec[] | null {
  if (goals.length === 0) return null;
  const seen = new Set<string>();
  const combined: Rec[] = [];
  for (const g of goals) {
    const recs = GOAL_RECS[g] ?? DEFAULT_RECS;
    for (const r of recs) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        combined.push(r);
      }
    }
  }
  return combined.length > 0 ? combined : DEFAULT_RECS;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  goals: string[];
  existingHabits: Habit[];
  canAddMore: boolean;
  onAdd: (name: string, description: string) => Promise<{ error: string | null }>;
  onSetGoal: () => void;
  onUpgrade: () => void;
}

export default function HabitRecommendations({
  goals,
  existingHabits,
  canAddMore,
  onAdd,
  onSetGoal,
  onUpgrade,
}: Props) {
  const [adding, setAdding] = useState<Set<string>>(new Set());

  const recs   = getRecsForGoals(goals);
  const owned  = new Set(existingHabits.map((h) => h.name.toLowerCase()));
  const visible = recs?.filter((r) => !owned.has(r.name.toLowerCase())) ?? [];

  const handleAdd = async (rec: Rec) => {
    if (!canAddMore) { onUpgrade(); return; }
    setAdding((prev) => new Set(prev).add(rec.name));
    await onAdd(rec.name, rec.description);
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(rec.name);
      return next;
    });
  };

  // ── No goal set ──────────────────────────────────────────────────────────────
  if (goals.length === 0) {
    return (
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-300">Recommended for you</h2>
        </div>
        <button
          onClick={onSetGoal}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-dashed border-violet-800/30 bg-[#0c0c18] hover:border-violet-700/50 hover:bg-[#0f0f1a] transition-all group text-left"
        >
          <div className="w-10 h-10 rounded-full bg-violet-950/60 border border-violet-800/30 flex items-center justify-center flex-shrink-0 group-hover:border-violet-700/50 transition-colors">
            <Target className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300 group-hover:text-slate-200 transition-colors">
              Set your goal to get personalised habit suggestions
            </p>
            <p className="text-xs text-slate-600 mt-0.5">Tap to update your profile →</p>
          </div>
        </button>
      </section>
    );
  }

  // ── All recs already added ────────────────────────────────────────────────────
  if (visible.length === 0) return null;

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-300">Recommended for you</h2>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600 bg-[#0c0c18] border border-violet-900/15 px-2.5 py-0.5 rounded-full">
          Based on&nbsp;<span className="text-violet-400 font-medium">
            {goals.length === 1 ? goals[0] : `${goals.length} goals`}
          </span>
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {visible.map((rec) => {
          const isAdding = adding.has(rec.name);
          return (
            <div
              key={rec.name}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-900/12 bg-[#0c0c18] hover:border-violet-800/22 hover:bg-[#0f0f1a] transition-all duration-200"
            >
              {/* Emoji badge */}
              <div className="w-9 h-9 rounded-lg bg-violet-950/50 border border-violet-900/18 flex items-center justify-center flex-shrink-0 text-[18px] leading-none select-none">
                {rec.emoji}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{rec.name}</p>
                <p className="text-xs text-slate-600 truncate mt-0.5">{rec.description}</p>
              </div>

              {/* Add button */}
              <button
                onClick={() => handleAdd(rec)}
                disabled={isAdding}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-300 border border-violet-700/35 hover:border-violet-500/55 hover:text-violet-200 hover:bg-violet-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isAdding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                {isAdding ? "Adding…" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
