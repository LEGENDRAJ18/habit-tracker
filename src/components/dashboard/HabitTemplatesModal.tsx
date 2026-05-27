"use client";

import { useState } from "react";
import { X, Plus, Check, Loader2 } from "lucide-react";
import type { Habit } from "@/types";

interface Template {
  emoji: string;
  name: string;
}

interface Category {
  label: string;
  emoji: string;
  templates: Template[];
}

const CATEGORIES: Category[] = [
  {
    label: "Digital Wellness",
    emoji: "📱",
    templates: [
      { emoji: "🌅", name: "No phone first 30 minutes" },
      { emoji: "🌙", name: "No social media after 9pm" },
      { emoji: "📺", name: "Max 1 hour YouTube/TikTok per day" },
      { emoji: "🍽️", name: "No phone during meals" },
    ],
  },
  {
    label: "Health & Fitness",
    emoji: "🏃",
    templates: [
      { emoji: "💪", name: "Exercise 30 minutes" },
      { emoji: "💧", name: "Drink 8 glasses of water" },
      { emoji: "😴", name: "Sleep before 11pm" },
      { emoji: "👟", name: "Walk 10,000 steps" },
    ],
  },
  {
    label: "Mental Health",
    emoji: "🧠",
    templates: [
      { emoji: "🧘", name: "10 minutes meditation" },
      { emoji: "📔", name: "Journal 5 minutes" },
      { emoji: "📖", name: "Read 20 pages" },
      { emoji: "📵", name: "No news before noon" },
    ],
  },
  {
    label: "Breaking Bad Habits",
    emoji: "🚬",
    templates: [
      { emoji: "🚭", name: "No smoking today" },
      { emoji: "🍺", name: "No alcohol today" },
      { emoji: "🎲", name: "No gambling today" },
      { emoji: "☕", name: "Limit caffeine to 1 cup" },
    ],
  },
  {
    label: "Productivity",
    emoji: "💪",
    templates: [
      { emoji: "🎯", name: "Deep work 2 hours" },
      { emoji: "🚫", name: "No meetings before 10am" },
      { emoji: "📥", name: "Inbox zero" },
      { emoji: "🌃", name: "Plan tomorrow tonight" },
    ],
  },
];

interface Props {
  onClose: () => void;
  existingHabits: Habit[];
  canAddMore: boolean;
  onAdd: (name: string, description: string, frequency: "daily" | "weekly") => Promise<{ error: string | null }>;
  onHitLimit: () => void;
}

export default function HabitTemplatesModal({ onClose, existingHabits, canAddMore, onAdd, onHitLimit }: Props) {
  // Track per-template state: idle | loading | done | error
  const [templateState, setTemplateState] = useState<Record<string, "loading" | "done" | "error">>({});

  const existingNames = new Set(existingHabits.map((h) => h.name.trim().toLowerCase()));

  const handleAdd = async (name: string) => {
    if (!canAddMore) {
      onHitLimit();
      return;
    }
    setTemplateState((s) => ({ ...s, [name]: "loading" }));
    const { error } = await onAdd(name, "", "daily");
    setTemplateState((s) => ({ ...s, [name]: error ? "error" : "done" }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-900/20 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Browse templates</h2>
            <p className="text-xs text-slate-500 mt-0.5">One click to add a habit</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-violet-950/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cat.emoji}</span>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cat.label}</h3>
              </div>

              <div className="space-y-2">
                {cat.templates.map((t) => {
                  const state    = templateState[t.name];
                  const already  = existingNames.has(t.name.toLowerCase()) || state === "done";
                  const isLoading = state === "loading";

                  return (
                    <div
                      key={t.name}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        already
                          ? "bg-violet-950/20 border-violet-800/20 opacity-60"
                          : "bg-[#0a0a14] border-violet-900/20 hover:border-violet-700/35 hover:bg-violet-950/25"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{t.emoji}</span>
                      <span className="flex-1 text-sm text-slate-200 leading-snug">{t.name}</span>

                      {already ? (
                        <span className="flex items-center gap-1 text-[10px] text-violet-500 font-medium flex-shrink-0">
                          <Check className="w-3 h-3" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAdd(t.name)}
                          disabled={isLoading}
                          aria-label={`Add ${t.name}`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/35 border border-violet-600/30 text-violet-300 text-xs font-semibold rounded-lg transition-all flex-shrink-0 disabled:opacity-60"
                        >
                          {isLoading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Plus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-violet-900/20 px-6 py-3.5 flex-shrink-0">
          <p className="text-xs text-slate-600 text-center">
            {!canAddMore
              ? "You've hit the free plan limit. Upgrade to add more habits."
              : "Tap Add to instantly create a habit from a template."}
          </p>
        </div>
      </div>
    </div>
  );
}
