"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  X, Loader2, Plus, ArrowRight,
  CheckCircle2, AlertTriangle, XCircle, Sparkles,
  Crown, ChevronDown, ChevronLeft, CalendarDays,
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

// Reduced to 4 core time slots + custom so the picker fits in one row
const TIME_PERIODS = [
  { label: "Morning",   emoji: "🌅", value: "07:30" },
  { label: "Afternoon", emoji: "🌤",  value: "14:00" },
  { label: "Evening",   emoji: "🌆", value: "18:00" },
  { label: "Night",     emoji: "🌙", value: "21:00" },
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
// Display order Mon–Sun → JS .getDay() values (0=Sun, 1=Mon … 6=Sat)
const DOW_MAP    = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// ─── helpers ──────────────────────────────────────────────────────────────────

function isDuplicate(name: string, existingHabits: Habit[]): boolean {
  return existingHabits.some((h) => h.name.trim().toLowerCase() === name.trim().toLowerCase());
}

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

// ─── custom select ────────────────────────────────────────────────────────────

interface SelectItem { value: string; label: string }

function CustomSelect({
  value, onChange, items, placeholder, emptyLabel = "— None —",
}: {
  value: string; onChange: (v: string) => void;
  items: SelectItem[]; placeholder: string; emptyLabel?: string;
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
        className="w-full bg-violet-950/30 border border-violet-900/30 hover:border-violet-800/50 focus:border-violet-600/60 focus:outline-none rounded-xl px-3 py-2 text-sm text-left flex items-center justify-between transition-all"
      >
        <span className={`truncate text-sm ${currentLabel ? "text-white" : "text-slate-600"}`}>
          {currentLabel || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 flex-shrink-0 ml-1 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1 bg-[#1a1a2e] border border-violet-800/40 rounded-xl overflow-hidden shadow-2xl shadow-black/60 max-h-48 overflow-y-auto">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className="w-full px-3 py-2 text-sm text-slate-500 hover:bg-violet-950/60 hover:text-slate-300 text-left transition-colors"
          >{emptyLabel}</button>
          {items.map((item) => (
            <button key={item.value} type="button"
              onClick={() => { onChange(item.value); setOpen(false); }}
              className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                item.value === value ? "bg-violet-600/25 text-violet-200 font-medium" : "text-slate-300 hover:bg-violet-950/60 hover:text-white"
              }`}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── compact time picker — 4 presets + custom in a single row ─────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = TIME_PERIODS.some((p) => p.value === value);
  const [showCustom, setShowCustom] = useState(() => value !== "" && !isPreset);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-5 gap-1">
        {TIME_PERIODS.map((p) => (
          <button key={p.value} type="button"
            onClick={() => { onChange(value === p.value ? "" : p.value); setShowCustom(false); }}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-center transition-all ${
              value === p.value
                ? "bg-violet-600/25 border-violet-500/60 text-violet-200"
                : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:border-violet-700/40 hover:text-slate-300 hover:bg-violet-950/40"
            }`}
          >
            <span className="text-sm leading-none">{p.emoji}</span>
            <span className="text-[9px] font-semibold mt-0.5 leading-tight">{p.label}</span>
          </button>
        ))}
        <button type="button" onClick={() => setShowCustom((v) => !v)}
          className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-center transition-all ${
            showCustom
              ? "bg-violet-600/25 border-violet-500/60 text-violet-200"
              : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:border-violet-700/40 hover:text-slate-300 hover:bg-violet-950/40"
          }`}
        >
          <span className="text-sm leading-none">⏰</span>
          <span className="text-[9px] font-semibold mt-0.5 leading-tight">Custom</span>
        </button>
      </div>
      {showCustom && (
        <input type="time"
          value={value && !isPreset ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] transition-all"
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
  withScheduling?: boolean;
  onAdd: (
    name: string, description: string, frequency: "daily" | "weekly",
    stackAfterId?: string | null, whenTime?: string | null,
    whereLocation?: string | null, howLong?: string | null,
    validityScore?: "valid" | "partial" | "invalid",
  ) => Promise<{ error: string | null }>;
  onSchedule?: (
    name: string, description: string, frequency: "daily" | "weekly",
    whenTime: string | null, whereLocation: string | null,
    howLong: string | null, validityScore: "valid" | "partial" | "invalid",
    dates: string[],
  ) => void;
}

// ─── modal ────────────────────────────────────────────────────────────────────

export default function AddHabitModal({
  onClose, existingHabits, goals, tier, onUpgradePro,
  withScheduling, onAdd, onSchedule,
}: Props) {
  // "details" = step 1, "schedule" = step 2
  const [step, setStep] = useState<"details" | "schedule">("details");

  // Step 1 fields
  const [name, setName]                   = useState("");
  const [description, setDescription]     = useState("");
  const [frequency, setFrequency]         = useState<"daily" | "weekly">("daily");
  const [whenTime, setWhenTime]           = useState("");
  const [whereLocation, setWhereLocation] = useState("");
  const [howLong, setHowLong]             = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  // Step 2 — schedule preset + custom day-of-week picks
  const [schedulePreset, setSchedulePreset] = useState<"everyday" | "weekdays" | "weekends" | "custom" | null>(null);
  const [pickedDows, setPickedDows]         = useState<Set<number>>(new Set());

  const next21 = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return { dateStr: toDateStr(d), dayNum: d.getDate() };
  }), []);

  const selectedDates = useMemo(() => {
    const dow = (s: string) => new Date(s + "T12:00:00").getDay();
    if (!schedulePreset)          return new Set<string>();
    if (schedulePreset === "everyday") return new Set(next21.map((n) => n.dateStr));
    if (schedulePreset === "weekdays") return new Set(next21.filter((n) => { const d = dow(n.dateStr); return d >= 1 && d <= 5; }).map((n) => n.dateStr));
    if (schedulePreset === "weekends") return new Set(next21.filter((n) => { const d = dow(n.dateStr); return d === 0 || d === 6; }).map((n) => n.dateStr));
    return new Set(next21.filter((n) => pickedDows.has(dow(n.dateStr))).map((n) => n.dateStr));
  }, [schedulePreset, pickedDows, next21]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const aiValidation = useHabitValidation(name, goals);
  const duplicate    = name.trim().length > 2 && isDuplicate(name, existingHabits);

  // Suggestion chips
  const allSuggestions: string[] = goals
    ? goals.flatMap((g) => GOAL_SUGGESTIONS[GOAL_KEY_MAP[g] ?? g.toLowerCase()] ?? [])
    : [];
  const uniqueSuggestions = [...new Set(allSuggestions)];
  const offset = uniqueSuggestions.length > 0 ? suggestionOffset % uniqueSuggestions.length : 0;
  const visibleSuggestions = [
    ...uniqueSuggestions.slice(offset, offset + CHIPS_PER_PAGE),
    ...uniqueSuggestions.slice(0, Math.max(0, offset + CHIPS_PER_PAGE - uniqueSuggestions.length)),
  ].slice(0, CHIPS_PER_PAGE);

  const isBlocked    = duplicate;
  const durationBonus = howLong ? (DURATION_BONUS_XP[howLong] ?? 0) : 0;
  const isSchedulingMode = !!(withScheduling && onSchedule);

  const getValidity = (): "valid" | "partial" | "invalid" =>
    aiValidation.status === "blocked" ? "invalid"
    : aiValidation.status === "warning" ? "partial"
    : "valid";

  // Step 1 → step 2 (calendar mode). Uses type="button" onClick, NOT form submit,
  // so there's zero interference from browser form validation.
  const goToStep2 = () => {
    if (!name.trim() || isBlocked) return;
    setSchedulePreset(null);
    setPickedDows(new Set());
    setStep("schedule");
  };

  // Step 1 submit (dashboard — direct add)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isBlocked) return;
    // If in scheduling mode and somehow submit fires, redirect to step 2
    if (isSchedulingMode) { goToStep2(); return; }
    setLoading(true);
    setError(null);
    const { error } = await onAdd(
      name.trim(), description.trim(), frequency,
      null, whenTime || null, whereLocation || null, howLong || null, getValidity(),
    );
    if (error) { setError(error); setLoading(false); }
    else onClose();
  };

  // Step 2 confirm
  const handleScheduleConfirm = () => {
    if (selectedDates.size === 0) return;
    onSchedule?.(
      name.trim(), description.trim(), frequency,
      whenTime || null, whereLocation || null, howLong || null, getValidity(),
      Array.from(selectedDates).sort(),
    );
    onClose();
  };

  const inputCls = "w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-1 focus:ring-violet-600/20 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 transition-all";
  const labelCls = "block text-[11px] font-medium text-slate-400 mb-1";

  // ── Shared step indicator (always rendered in header when scheduling) ─────
  const stepIndicator = isSchedulingMode ? (
    <div className="flex items-center gap-1.5 mr-1">
      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${step === "details" ? "bg-violet-500 scale-110" : "bg-violet-800"}`} />
      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${step === "schedule" ? "bg-violet-500 scale-110" : "bg-violet-800"}`} />
    </div>
  ) : null;

  return (
    <>
      {/* Dark overlay — click to close */}
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* ── Modal panel ──
          Mobile  : bottom sheet (full-width, from bottom, rounded top)
          Desktop : centered dialog (transform-centered)  */}
      <div className={[
        "fixed z-50 bg-[#0f0f1a] border border-violet-800/30 shadow-2xl shadow-violet-950/60 flex flex-col",
        // Mobile: bottom sheet
        "left-0 right-0 bottom-0 rounded-t-2xl max-h-[92vh]",
        // sm+: calendar mode anchors near top so tall content never clips the footer
        //       dashboard mode stays centered (existing behaviour)
        isSchedulingMode
          ? "sm:bottom-auto sm:left-1/2 sm:top-[5vh] sm:-translate-x-1/2 sm:rounded-2xl sm:w-[min(620px,calc(100vw-32px))] sm:max-h-[90vh]"
          : "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[min(640px,calc(100vw-32px))] sm:max-h-[88vh]",
      ].join(" ")}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-900/20 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {step === "schedule" && (
              <button type="button" onClick={() => setStep("details")}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-violet-950/70 transition-all flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white leading-tight">
                {step === "details" ? "Add New Habit" : "Choose Your Days"}
              </h2>
              {isSchedulingMode && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {step === "details" ? "Step 1 of 2 — Habit Details" : "Step 2 of 2 — When to do it"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {stepIndicator}
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-violet-950/70 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════ STEP 1: HABIT DETAILS ══════════════════════════════════ */}
        {step === "details" && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {error && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/30 rounded-xl px-3 py-2">{error}</p>
              )}

              {/* ── Habit name ─────────────────────────────────────────────── */}
              <div>
                <label className={labelCls}>
                  Habit name <span className="text-violet-500">*</span>
                </label>
                <input
                  type="text" value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="e.g. Meditate for 10 minutes"
                  required maxLength={100} autoFocus
                  className={`${inputCls} ${
                    duplicate              ? "border-amber-600/50" :
                    aiValidation.status === "blocked" ? "border-red-600/50" :
                    aiValidation.status === "warning" ? "border-amber-600/50" :
                    aiValidation.status === "good"    ? "border-emerald-600/40" : ""
                  }`}
                />

                {/* Validation feedback — compact */}
                {duplicate && (
                  <div className="mt-1.5 flex items-center gap-2 bg-amber-950/40 border border-amber-600/30 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-[11px] text-amber-300">You already have a habit with this name.</p>
                  </div>
                )}
                {!duplicate && aiValidation.status === "validating" && (
                  <div className="mt-1.5 flex items-center gap-1.5 px-1 py-1">
                    <Sparkles className="w-3 h-3 animate-pulse text-violet-500 flex-shrink-0" />
                    <span className="text-[10px] text-slate-500">Checking…</span>
                  </div>
                )}
                {!duplicate && aiValidation.status === "good" && (
                  <div className="mt-1.5 flex items-start gap-2 bg-emerald-950/40 border border-emerald-600/30 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-emerald-300 leading-snug">{aiValidation.message}</p>
                      {durationBonus > 0 && <p className="text-[10px] text-emerald-500 mt-0.5">+{durationBonus} XP bonus 🎯</p>}
                    </div>
                  </div>
                )}
                {!duplicate && aiValidation.status === "warning" && (
                  <div className="mt-1.5 bg-amber-950/40 border border-amber-600/30 rounded-lg px-3 py-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold text-amber-300 leading-snug">{aiValidation.message}</p>
                    </div>
                    {aiValidation.suggestion && (
                      <button type="button" onClick={() => setName(aiValidation.suggestion!)}
                        className="mt-1.5 ml-5 text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                        Try: &ldquo;{aiValidation.suggestion}&rdquo;
                      </button>
                    )}
                  </div>
                )}
                {!duplicate && aiValidation.status === "blocked" && (
                  <div className="mt-1.5 bg-red-950/40 border border-red-600/30 rounded-lg px-3 py-2">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold text-red-300 leading-snug">{aiValidation.message}</p>
                    </div>
                    {aiValidation.suggestion && (
                      <button type="button" onClick={() => setName(aiValidation.suggestion!)}
                        className="mt-1.5 ml-5 text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                        Try: &ldquo;{aiValidation.suggestion}&rdquo;
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── 2-column details grid ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">

                {/* LEFT: When / Where / Duration */}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>⏰ When?</label>
                    <TimePicker value={whenTime} onChange={setWhenTime} />
                  </div>
                  <div>
                    <label className={labelCls}>📍 Where?</label>
                    <CustomSelect value={whereLocation} onChange={setWhereLocation}
                      items={WHERE_OPTIONS.map((o) => ({ value: o, label: o }))}
                      placeholder="Location…"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      ⏱ How long?
                      {durationBonus > 0 && <span className="ml-1.5 text-emerald-400">+{durationBonus} XP</span>}
                    </label>
                    <CustomSelect value={howLong} onChange={setHowLong}
                      items={HOW_LONG_OPTIONS.map((o) => ({ value: o, label: o }))}
                      placeholder="Duration…" emptyLabel="— No duration —"
                    />
                  </div>
                </div>

                {/* RIGHT: Frequency / Description */}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Frequency</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["daily", "weekly"] as const).map((freq) => (
                        <button key={freq} type="button" onClick={() => setFrequency(freq)}
                          className={`py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                            frequency === freq
                              ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                              : "bg-violet-950/20 border-violet-900/20 text-slate-500 hover:text-slate-300"
                          }`}
                        >{freq}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      Description <span className="text-slate-600 font-normal">(optional)</span>
                    </label>
                    <input type="text" value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. mindfulness"
                      maxLength={200} className={inputCls}
                    />
                  </div>

                  {/* Pro suggestion chips */}
                  {uniqueSuggestions.length > 0 && (
                    <div>
                      {tier === "pro" ? (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-slate-500">Need inspiration?</span>
                            {uniqueSuggestions.length > CHIPS_PER_PAGE && (
                              <button type="button"
                                onClick={() => setSuggestionOffset((o) => (o + CHIPS_PER_PAGE) % uniqueSuggestions.length)}
                                className="text-[10px] text-violet-500 hover:text-violet-400"
                              >More →</button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {visibleSuggestions.map((s) => (
                              <button key={s} type="button"
                                onClick={() => { setName(s); setError(null); }}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-violet-800/30 bg-violet-950/30 text-slate-400 hover:text-violet-300 hover:border-violet-600/40 transition-all"
                              >{s}</button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="relative">
                          <div className="flex flex-wrap gap-1 pointer-events-none select-none" style={{ filter: "blur(3px)", opacity: 0.3 }}>
                            {["Run 5km", "Meditate 10 min", "Read daily", "Drink 2L water"].map((s) => (
                              <span key={s} className="px-2 py-0.5 rounded-full text-[10px] border border-violet-800/30 bg-violet-950/30 text-slate-400">{s}</span>
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button type="button" onClick={onUpgradePro}
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold rounded-xl hover:bg-amber-600/30 transition-all"
                            >
                              <Crown className="w-2.5 h-2.5" />Upgrade to unlock
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1 Footer */}
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-violet-900/20 flex-shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
              >Cancel</button>

              {isSchedulingMode ? (
                /* type=button — bypasses form validation completely */
                <button
                  type="button"
                  disabled={!name.trim() || isBlocked}
                  onClick={goToStep2}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  Next: Choose Days
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading || !name.trim() || isBlocked}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Add Habit</>}
                </button>
              )}
            </div>
          </form>
        )}

        {/* ══════════ STEP 2: DATE PICKER ════════════════════════════════════ */}
        {step === "schedule" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Habit name recap pill */}
              <div className="flex items-center gap-2 bg-violet-950/50 border border-violet-800/20 rounded-xl px-3.5 py-2.5">
                <CalendarDays className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-violet-200 truncate">&ldquo;{name}&rdquo;</p>
              </div>

              {/* 4 schedule preset tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { id: "everyday" as const, emoji: "📅", label: "Every day",  sub: "Daily habit"          },
                  { id: "weekdays" as const, emoji: "🗓", label: "Weekdays",   sub: "Mon – Fri"            },
                  { id: "weekends" as const, emoji: "🌅", label: "Weekends",   sub: "Sat & Sun"            },
                  { id: "custom"   as const, emoji: "✏️", label: "Pick days",  sub: "Choose specific days" },
                ]).map((o) => (
                  <button key={o.id} type="button"
                    onClick={() => setSchedulePreset(o.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      schedulePreset === o.id
                        ? "bg-violet-600/25 border-violet-500/50 text-violet-200"
                        : "bg-violet-950/30 hover:bg-violet-950/50 border-violet-900/25 hover:border-violet-700/40 text-slate-300"
                    }`}
                  >
                    <span className="text-xl leading-none">{o.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{o.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{o.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Day-of-week toggles — only shown for "Pick days" */}
              {schedulePreset === "custom" && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select days of week</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DOW_LABELS.map((d, i) => {
                      const dow = DOW_MAP[i] ?? 0;
                      const active = pickedDows.has(dow);
                      return (
                        <button key={i} type="button"
                          onClick={() => setPickedDows((prev) => {
                            const s = new Set(prev);
                            s.has(dow) ? s.delete(dow) : s.add(dow);
                            return s;
                          })}
                          className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                            active
                              ? "bg-violet-600 text-white shadow-sm shadow-violet-900/40"
                              : "bg-violet-950/40 border border-violet-900/25 text-slate-500 hover:border-violet-700/40 hover:text-slate-300"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDates.size > 0 && (
                <p className="text-xs text-center text-violet-300/80 font-medium">
                  {selectedDates.size} day{selectedDates.size !== 1 ? "s" : ""} selected ✓
                </p>
              )}
            </div>

            {/* Step 2 Footer — flex-shrink-0 keeps it always visible */}
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-violet-900/20 flex-shrink-0">
              <button type="button" onClick={() => setStep("details")}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />Back
              </button>
              <button type="button" onClick={handleScheduleConfirm}
                disabled={selectedDates.size === 0}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                ✓ Schedule Habit
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
