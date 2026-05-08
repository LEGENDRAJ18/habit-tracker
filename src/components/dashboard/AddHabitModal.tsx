"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Loader2, Plus, ArrowRight, Link2,
  CheckCircle2, AlertTriangle, XCircle, Sparkles,
  Crown, ChevronDown,
} from "lucide-react";
import type { Habit, Plan } from "@/types";
import { useHabitValidation } from "@/hooks/useHabitValidation";
import { DURATION_BONUS_XP } from "@/lib/xp";

// ─── constants ────────────────────────────────────────────────────────────────

const WHERE_OPTIONS = [
  "Bedroom", "Bathroom", "Home office", "Living room", "Kitchen",
  "Gym", "Outdoors", "Park", "Office", "Library",
  "Coffee shop", "On commute", "School/University",
];

const HOW_LONG_OPTIONS = [
  "5 min", "10 min", "20 min", "30 min", "45 min", "1 hour", "2+ hours",
];

const TIME_PERIODS = [
  { label: "Morning",     emoji: "🌅", range: "6–9am",    value: "07:30" },
  { label: "Mid-morning", emoji: "☀️",  range: "9–11am",  value: "10:00" },
  { label: "Midday",      emoji: "🌞", range: "11am–1pm", value: "12:00" },
  { label: "Afternoon",   emoji: "🌤",  range: "1–4pm",   value: "14:30" },
  { label: "Evening",     emoji: "🌆", range: "4–7pm",    value: "17:30" },
  { label: "Night",       emoji: "🌙", range: "7–10pm",   value: "20:00" },
  { label: "Late night",  emoji: "🌃", range: "10pm+",    value: "22:30" },
];

const GOAL_SUGGESTIONS: Record<string, string[]> = {
  "fitness":         ["Run 5km", "20 pushups every morning", "30-min gym session", "10,000 steps daily", "Stretch for 10 minutes", "Drink 2L of water", "Walk for 30 minutes", "Do a 15-min home workout"],
  "learning":        ["Read for 20 minutes", "Practice coding for 30 minutes", "Watch 1 educational video", "Study flashcards for 15 minutes", "Write in a journal", "Listen to a podcast", "Take an online course lesson", "Review notes from yesterday"],
  "mental wellness": ["Meditate for 10 minutes", "Write 3 things I'm grateful for", "Take a 10-minute walk outside", "Practice deep breathing", "No phone for 1 hour", "Call a friend", "Do a body scan meditation", "Write a journal entry"],
  "productivity":    ["Plan tomorrow the night before", "Clear inbox to zero", "Do 1 focused deep-work block", "Review weekly goals", "No social media before noon", "Write a daily to-do list", "Time-block my calendar", "Do a weekly review"],
  "sleep":           ["No screens 30 min before bed", "Go to bed by 10:30 PM", "Wake up at 6 AM", "Read before sleeping", "Take magnesium supplement", "No caffeine after 2 PM", "Prepare tomorrow's clothes tonight", "Do a 5-min wind-down stretch"],
};

const GOAL_KEY_MAP: Record<string, string> = {
  "Get fit & healthy":     "fitness",
  "Learn & grow":          "learning",
  "Build mental wellness": "mental wellness",
  "Be more productive":    "productivity",
  "Improve sleep":         "sleep",
};

const CHIPS_PER_PAGE = 6;

// ─── helpers ──────────────────────────────────────────────────────────────────

function isDuplicate(name: string, existingHabits: Habit[]): boolean {
  const normalized = name.trim().toLowerCase();
  return existingHabits.some((h) => h.name.trim().toLowerCase() === normalized);
}

// ─── custom select ────────────────────────────────────────────────────────────

interface SelectItem { value: string; label: string }

function CustomSelect({
  value, onChange, items, placeholder, emptyLabel = "— None —",
}: {
  value: string;
  onChange: (v: string) => void;
  items: SelectItem[];
  placeholder: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentLabel = items.find((i) => i.value === value)?.label ?? "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-violet-950/30 border border-violet-900/30 hover:border-violet-800/50 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between transition-all"
      >
        <span className={currentLabel ? "text-white" : "text-slate-600"}>
          {currentLabel || placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1 bg-[#1a1a2e] border border-violet-800/40 rounded-xl overflow-hidden shadow-2xl shadow-black/60 max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full px-4 py-2.5 text-sm text-slate-500 hover:bg-violet-950/60 hover:text-slate-300 text-left transition-colors"
          >
            {emptyLabel}
          </button>
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => { onChange(item.value); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                item.value === value
                  ? "bg-violet-600/25 text-violet-200 font-medium"
                  : "text-slate-300 hover:bg-violet-950/60 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── time period picker ───────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = TIME_PERIODS.some((p) => p.value === value);
  const [showCustom, setShowCustom] = useState(() => value !== "" && !isPreset);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {TIME_PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              onChange(value === p.value ? "" : p.value);
              setShowCustom(false);
            }}
            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-center transition-all ${
              value === p.value
                ? "bg-violet-600/25 border-violet-500/60 text-violet-200"
                : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:border-violet-700/40 hover:text-slate-300 hover:bg-violet-950/40"
            }`}
          >
            <span className="text-base leading-none">{p.emoji}</span>
            <span className="text-[10px] font-semibold mt-0.5 leading-tight">{p.label}</span>
            <span className="text-[9px] opacity-50 leading-tight">{p.range}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-center transition-all ${
            showCustom
              ? "bg-violet-600/25 border-violet-500/60 text-violet-200"
              : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:border-violet-700/40 hover:text-slate-300 hover:bg-violet-950/40"
          }`}
        >
          <span className="text-base leading-none">⏰</span>
          <span className="text-[10px] font-semibold mt-0.5 leading-tight">Custom</span>
          <span className="text-[9px] opacity-50 leading-tight">exact time</span>
        </button>
      </div>
      {showCustom && (
        <input
          type="time"
          value={value && !TIME_PERIODS.some((p) => p.value === value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white [color-scheme:dark] transition-all"
        />
      )}
    </div>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  existingHabits: Habit[];
  goals?: string[];
  tier?: Plan;
  onUpgradePro?: () => void;
  onAdd: (
    name: string,
    description: string,
    frequency: "daily" | "weekly",
    stackAfterId?: string | null,
    whenTime?: string | null,
    whereLocation?: string | null,
    howLong?: string | null,
    validityScore?: "valid" | "partial" | "invalid",
  ) => Promise<{ error: string | null }>;
}

// ─── modal ────────────────────────────────────────────────────────────────────

export default function AddHabitModal({ onClose, existingHabits, goals, tier, onUpgradePro, onAdd }: Props) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency]     = useState<"daily" | "weekly">("daily");
  const [stackAfterId, setStackAfterId]   = useState<string>("");
  const [whenTime, setWhenTime]           = useState("");
  const [whereLocation, setWhereLocation] = useState("");
  const [howLong, setHowLong]             = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  const aiValidation = useHabitValidation(name, goals);
  const duplicate    = name.trim().length > 2 && isDuplicate(name, existingHabits);

  // Build suggestion pool from user's goals
  const allSuggestions: string[] = goals
    ? goals.flatMap((g) => GOAL_SUGGESTIONS[GOAL_KEY_MAP[g] ?? g.toLowerCase()] ?? [])
    : [];
  const uniqueSuggestions = [...new Set(allSuggestions)];
  const offset = uniqueSuggestions.length > 0
    ? suggestionOffset % uniqueSuggestions.length
    : 0;
  const visibleSuggestions = [
    ...uniqueSuggestions.slice(offset, offset + CHIPS_PER_PAGE),
    ...uniqueSuggestions.slice(0, Math.max(0, offset + CHIPS_PER_PAGE - uniqueSuggestions.length)),
  ].slice(0, CHIPS_PER_PAGE);

  const stackItems: SelectItem[] = existingHabits.map((h) => ({ value: h.id, label: h.name }));
  const stackParent = existingHabits.find((h) => h.id === stackAfterId);

  const isBlocked   = duplicate;
  const durationBonus = howLong ? (DURATION_BONUS_XP[howLong] ?? 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isBlocked) return;
    setLoading(true);
    setError(null);
    const validityScore: "valid" | "partial" | "invalid" =
      aiValidation.status === "blocked" ? "invalid"
      : aiValidation.status === "warning" ? "partial"
      : "valid";
    const { error } = await onAdd(
      name.trim(), description.trim(), frequency,
      stackAfterId || null, whenTime || null, whereLocation || null, howLong || null,
      validityScore,
    );
    if (error) { setError(error); setLoading(false); }
    else onClose();
  };

  const inputCls = "w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-[#0f0f1a] border border-violet-800/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[94vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-900/20 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">Add New Habit</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-violet-950/70 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body (scrollable) ──────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl px-3.5 py-2.5">{error}</p>
            )}

            {/* 1. Habit name ─────────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>
                Habit name <span className="text-violet-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                placeholder="e.g. Meditate for 10 minutes"
                required
                maxLength={100}
                autoFocus
                className={`${inputCls} ${
                  duplicate
                    ? "border-amber-600/50 focus:border-amber-500/60"
                    : aiValidation.status === "blocked"
                    ? "border-red-600/50 focus:border-red-500/60"
                    : aiValidation.status === "warning"
                    ? "border-amber-600/50 focus:border-amber-500/60"
                    : aiValidation.status === "good"
                    ? "border-emerald-600/40 focus:border-emerald-500/50"
                    : ""
                }`}
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] ${name.length > 90 ? "text-amber-400" : "text-slate-700"}`}>
                  {name.length}/100
                </span>
              </div>

              {duplicate && (
                <div className="mt-2 flex items-start gap-2.5 bg-amber-950/40 border border-amber-600/30 rounded-xl px-3.5 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 leading-snug">You already have a habit with this name.</p>
                </div>
              )}
              {!duplicate && aiValidation.status === "validating" && (
                <div className="mt-2 flex items-center gap-2 px-3.5 py-2">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-violet-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500">Checking your habit…</span>
                </div>
              )}
              {!duplicate && aiValidation.status === "good" && (
                <div className="mt-2 flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-600/30 rounded-xl px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-300 leading-snug">{aiValidation.message}</p>
                    {durationBonus > 0 && (
                      <p className="text-[11px] text-emerald-500 mt-0.5">+{durationBonus} XP duration bonus 🎯</p>
                    )}
                  </div>
                </div>
              )}
              {!duplicate && aiValidation.status === "warning" && (
                <div className="mt-2 bg-amber-950/40 border border-amber-600/30 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-amber-300 leading-snug">{aiValidation.message}</p>
                  </div>
                  {aiValidation.suggestion && (
                    <button type="button" onClick={() => setName(aiValidation.suggestion!)}
                      className="mt-2 ml-6 text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Try: &ldquo;{aiValidation.suggestion}&rdquo;
                    </button>
                  )}
                </div>
              )}
              {!duplicate && aiValidation.status === "blocked" && (
                <div className="mt-2 bg-red-950/40 border border-red-600/30 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-red-300 leading-snug">{aiValidation.message}</p>
                  </div>
                  {aiValidation.suggestion && (
                    <button type="button" onClick={() => setName(aiValidation.suggestion!)}
                      className="mt-2 ml-6 text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Try: &ldquo;{aiValidation.suggestion}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2 + 3. Two-column grid: Intentions (left) + Secondary (right) */}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">

              {/* ── LEFT: Implementation Intentions ────────────────────── */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">When &amp; Where</p>

                {/* When */}
                <div>
                  <label className={labelCls}>⏰ When will you do this?</label>
                  <TimePicker value={whenTime} onChange={setWhenTime} />
                </div>

                {/* Where */}
                <div>
                  <label className={labelCls}>📍 Where?</label>
                  <CustomSelect
                    value={whereLocation}
                    onChange={setWhereLocation}
                    items={WHERE_OPTIONS.map((o) => ({ value: o, label: o }))}
                    placeholder="Select a location…"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className={labelCls}>
                    ⏱ How long?
                    {durationBonus > 0 && (
                      <span className="ml-2 text-emerald-400 font-semibold">+{durationBonus} bonus XP</span>
                    )}
                  </label>
                  <CustomSelect
                    value={howLong}
                    onChange={setHowLong}
                    items={HOW_LONG_OPTIONS.map((o) => ({ value: o, label: o }))}
                    placeholder="Select duration…"
                    emptyLabel="— No duration set —"
                  />
                  {!howLong && (
                    <p className="text-[10px] text-slate-700 mt-1.5">Set a duration to earn bonus XP per completion</p>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Frequency + Stacking + Description ──────────── */}
              <div className="space-y-4">

                {/* 3. Frequency */}
                <div>
                  <label className={labelCls}>Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["daily", "weekly"] as const).map((freq) => (
                      <button key={freq} type="button" onClick={() => setFrequency(freq)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                          frequency === freq
                            ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                            : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Habit stacking */}
                {existingHabits.length > 0 && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                      <Link2 className="w-3.5 h-3.5 text-violet-500" />
                      Stack after habit{" "}
                      <span className="text-slate-600 font-normal">(optional)</span>
                    </label>
                    <CustomSelect
                      value={stackAfterId}
                      onChange={setStackAfterId}
                      items={stackItems}
                      placeholder="— No stacking —"
                    />
                    {stackParent && name.trim() && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-violet-950/30 border border-violet-800/25 rounded-lg">
                        <span className="text-xs text-slate-400 truncate max-w-[100px]">{stackParent.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        <span className="text-xs text-violet-300 font-medium truncate">{name.trim()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Description */}
                <div>
                  <label className={labelCls}>
                    Description <span className="text-slate-600 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text" value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 10 minutes of mindfulness"
                    maxLength={200}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Habit suggestions — Pro only ──────────────────────────────── */}
            {uniqueSuggestions.length > 0 && (
              <div className="pt-1">
                {tier === "pro" ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Need inspiration?</span>
                      {uniqueSuggestions.length > CHIPS_PER_PAGE && (
                        <button type="button"
                          onClick={() => setSuggestionOffset((o) => (o + CHIPS_PER_PAGE) % uniqueSuggestions.length)}
                          className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors"
                        >
                          More ideas →
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSuggestions.map((s) => (
                        <button key={s} type="button"
                          onClick={() => { setName(s); setError(null); }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-violet-800/30 bg-violet-950/30 text-slate-400 hover:text-violet-300 hover:border-violet-600/40 hover:bg-violet-950/50 transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Need inspiration?</span>
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-900/25 border border-amber-600/25 px-1.5 py-0.5 rounded-full">
                        <Crown className="w-2.5 h-2.5" />PRO
                      </span>
                    </div>
                    <div className="relative">
                      <div className="flex flex-wrap gap-1.5 pointer-events-none select-none"
                        style={{ filter: "blur(4px)", opacity: 0.35 }}
                      >
                        {["Run 5km", "Meditate 10 min", "Read daily", "Drink 2L water", "Journal entry", "Stretch 10 min"].map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-violet-800/30 bg-violet-950/30 text-slate-400">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button type="button" onClick={onUpgradePro}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-xl hover:bg-amber-600/30 transition-all"
                        >
                          <Crown className="w-3 h-3" />Upgrade to Pro to unlock
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isBlocked && aiValidation.status === "blocked" && (
              <p className="text-center text-[11px] text-slate-600 -mt-2">
                You can still add this but won&apos;t earn XP
              </p>
            )}
          </div>

          {/* ── Footer (sticky) ───────────────────────────────────────────── */}
          <div className="flex gap-3 px-6 py-4 border-t border-violet-900/20 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim() || isBlocked}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add Habit</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
