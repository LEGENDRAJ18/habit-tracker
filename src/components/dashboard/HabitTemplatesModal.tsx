"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Check, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import type { Habit } from "@/types";
import type { TemplateSuggestion } from "@/app/api/template-suggestions/route";

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

const SUGGESTION_CACHE_KEY = "habitai_template_suggestions_v2";

interface CachedSuggestions {
  date: string;
  suggestions: TemplateSuggestion[];
}

// Templates whose name implies self-tracking a limit rather than a positive action
function isLimitTemplate(name: string): boolean {
  const l = name.toLowerCase();
  return l.startsWith("no ") || l.startsWith("max ") || l.startsWith("limit ")
    || l.includes("no more") || l.includes("no alcohol") || l.includes("no smoking")
    || l.includes("no gambling") || l.includes("no caffeine");
}

interface Props {
  onClose: () => void;
  existingHabits: Habit[];
  canAddMore: boolean;
  goals?: string[];
  onAdd: (name: string, description: string, frequency: "daily" | "weekly", habitType?: "standard" | "limit") => Promise<{ error: string | null }>;
  onHitLimit: () => void;
}

export default function HabitTemplatesModal({ onClose, existingHabits, canAddMore, goals, onAdd, onHitLimit }: Props) {
  const [templateState, setTemplateState] = useState<Record<string, "loading" | "done" | "error">>({});
  const [templateError, setTemplateError] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<TemplateSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const fetchedRef = useRef(false);

  const existingNames = new Set(existingHabits.map((h) => h.name.trim().toLowerCase()));

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSuggestions(forceRefresh = false) {
    setSuggestionsLoading(true);

    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(SUGGESTION_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedSuggestions;
          const today = new Date().toISOString().split("T")[0];
          if (parsed.date === today && parsed.suggestions.length >= 3) {
            setAiSuggestions(parsed.suggestions);
            setSuggestionsLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache errors
      }
    }

    try {
      const res = await fetch("/api/template-suggestions");
      if (res.ok) {
        const data = await res.json() as { suggestions: TemplateSuggestion[]; date: string };
        setAiSuggestions(data.suggestions ?? []);
        localStorage.setItem(SUGGESTION_CACHE_KEY, JSON.stringify({
          date: data.date,
          suggestions: data.suggestions,
        }));
      }
    } catch {
      // silently fall back — static categories still shown
    } finally {
      setSuggestionsLoading(false);
    }
  }

  const handleAdd = async (name: string) => {
    if (!canAddMore) {
      onHitLimit();
      return;
    }
    setTemplateState((s) => ({ ...s, [name]: "loading" }));
    setTemplateError((s) => { const next = { ...s }; delete next[name]; return next; });

    try {
      const habitType = isLimitTemplate(name) ? "limit" : "standard";
      const { error } = await onAdd(name, "", "daily", habitType);
      if (error) {
        setTemplateState((s) => ({ ...s, [name]: "error" }));
        setTemplateError((s) => ({ ...s, [name]: "Couldn't add — try again" }));
      } else {
        setTemplateState((s) => ({ ...s, [name]: "done" }));
        toast(`"${name}" added!`, "success");
      }
    } catch {
      setTemplateState((s) => ({ ...s, [name]: "error" }));
      setTemplateError((s) => ({ ...s, [name]: "Couldn't add — try again" }));
    }
  };

  const renderAddButton = (name: string) => {
    const state = templateState[name];
    const already = existingNames.has(name.toLowerCase()) || state === "done";
    const isLoading = state === "loading";
    const isError = state === "error";

    if (already) {
      return (
        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold flex-shrink-0">
          <Check className="w-3 h-3" />
          Added
        </span>
      );
    }

    return (
      <button
        onClick={() => handleAdd(name)}
        disabled={isLoading}
        aria-label={`Add ${name}`}
        className={`flex items-center gap-1 px-3 py-1.5 border text-xs font-semibold rounded-lg transition-all flex-shrink-0 disabled:opacity-60 min-h-[36px] ${
          isError
            ? "bg-red-950/30 hover:bg-red-950/50 border-red-700/40 text-red-400"
            : "bg-violet-600/20 hover:bg-violet-600/35 border-violet-600/30 text-violet-300"
        }`}
        title={isError ? templateError[name] : undefined}
      >
        {isLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : isError
          ? <span className="text-[10px]">Retry</span>
          : <Plus className="w-3.5 h-3.5" />}
        {!isLoading && (isError ? "" : "Add")}
      </button>
    );
  };

  const aiNotAlreadyAdded = aiSuggestions.filter(
    (s) => !existingNames.has(s.name.toLowerCase()) || templateState[s.name] === "done",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-16 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mobile-sheet-enter w-full sm:max-w-lg bg-[#0f0f1a] border border-violet-800/30 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[85vh]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-900/20 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Browse templates</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tap Add to instantly create a habit</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-violet-950/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

          {/* ── AI Picks section ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">AI picks for today</h3>
              </div>
              <button
                onClick={() => { fetchedRef.current = false; void loadSuggestions(true); }}
                disabled={suggestionsLoading}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-violet-400 transition-colors disabled:opacity-40"
                title="Refresh suggestions"
              >
                <RefreshCw className={`w-3 h-3 ${suggestionsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {suggestionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[52px] bg-violet-950/20 border border-violet-900/15 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestions.map((s) => {
                  const already = existingNames.has(s.name.toLowerCase()) || templateState[s.name] === "done";
                  return (
                    <div
                      key={s.name}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                        already
                          ? "bg-violet-950/20 border-violet-800/20 opacity-60"
                          : "bg-[#0a0a14] border-violet-900/20 hover:border-violet-700/35 hover:bg-violet-950/25"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 leading-snug">{s.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{s.reason}</p>
                      </div>
                      {renderAddButton(s.name)}
                    </div>
                  );
                })}
                {aiNotAlreadyAdded.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2">You&apos;ve added all of today&apos;s AI picks!</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-3">Couldn&apos;t load suggestions — using popular templates below.</p>
            )}
          </div>

          {/* ── Static categories ─────────────────────────────────────────── */}
          {CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cat.emoji}</span>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cat.label}</h3>
              </div>

              <div className="space-y-2">
                {cat.templates.map((t) => {
                  const already = existingNames.has(t.name.toLowerCase()) || templateState[t.name] === "done";
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
                      {renderAddButton(t.name)}
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
              : "AI picks refresh daily based on your goals and progress."}
          </p>
        </div>
      </div>
    </div>
  );
}
