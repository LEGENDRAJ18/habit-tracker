"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  "5 min", "10 min", "15 min", "20 min", "30 min", "45 min", "1 hour", "2+ hours",
];

const TIME_PERIODS = [
  { label: "Morning",   emoji: "🌅", value: "07:30", sub: "6–9am"   },
  { label: "Afternoon", emoji: "🌤",  value: "14:00", sub: "1–4pm"  },
  { label: "Evening",   emoji: "🌆", value: "18:00", sub: "4–7pm"   },
  { label: "Night",     emoji: "🌙", value: "21:00", sub: "7–10pm"  },
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

// Returns a TIME_PERIODS value string if a time keyword is found in the name, else null
function detectTimeFromName(name: string): string | null {
  const lower = name.toLowerCase();
  // Specific time patterns: "at 7am", "9:30pm", "6pm", "at 6:30"
  const specific = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (specific) {
    let h = parseInt(specific[1]);
    const m = specific[2] ? parseInt(specific[2]) : 0;
    const mer = specific[3].toLowerCase();
    if (mer === "pm" && h !== 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (/\b(morning|dawn|sunrise|wake\s*up|wakeup|breakfast|a\.m\.)\b/.test(lower)) return "07:30";
  if (/\b(afternoon|midday|noon|lunchtime?|lunch)\b/.test(lower)) return "14:00";
  if (/\b(evening|sunset|dusk|after\s*work)\b/.test(lower)) return "18:00";
  if (/\b(night|midnight|bedtime|before\s*bed|p\.m\.|nighttime|sleep)\b/.test(lower)) return "21:00";
  return null;
}

// Returns { howLong, durationMinutes } if a duration is found in the habit name, else nulls.
function detectDurationFromName(name: string): { howLong: string | null; durationMinutes: number | null } {
  const lower = name.toLowerCase();
  const minMatch = lower.match(/\b(\d+)\s*(?:minutes?|mins?)\b/);
  const hourMatch = lower.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/);

  if (minMatch) {
    const m = parseInt(minMatch[1]);
    if (m <= 0 || m > 180) return { howLong: null, durationMinutes: null };
    const howLong =
      m <= 7   ? "5 min" :
      m <= 12  ? "10 min" :
      m <= 17  ? "15 min" :
      m <= 25  ? "20 min" :
      m <= 37  ? "30 min" :
      m <= 52  ? "45 min" :
      m <= 75  ? "1 hour" : "2+ hours";
    const presets = [5, 10, 15, 20, 25, 30, 45, 60];
    const closest = presets.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
    return { howLong, durationMinutes: closest };
  }

  if (hourMatch) {
    const h = parseFloat(hourMatch[1]);
    if (h <= 0) return { howLong: null, durationMinutes: null };
    if (h >= 2) return { howLong: "2+ hours", durationMinutes: null };
    const m = Math.round(h * 60);
    const howLong = m >= 55 ? "1 hour" : `${m} min`;
    return { howLong, durationMinutes: m <= 60 ? m : null };
  }

  return { howLong: null, durationMinutes: null };
}

const DIFFICULTY_LEVELS = [
  { level: 1, label: "Easy",      emoji: "🟢", xp: 10,  color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-800/30" },
  { level: 2, label: "Light",     emoji: "🟡", xp: 15,  color: "text-yellow-400",  bg: "bg-yellow-950/30 border-yellow-800/30"  },
  { level: 3, label: "Medium",    emoji: "🟠", xp: 25,  color: "text-orange-400",  bg: "bg-orange-950/30 border-orange-800/30"  },
  { level: 4, label: "Hard",      emoji: "🔴", xp: 40,  color: "text-red-400",     bg: "bg-red-950/30 border-red-800/30"        },
  { level: 5, label: "Very Hard", emoji: "🔥", xp: 60,  color: "text-fuchsia-400", bg: "bg-fuchsia-950/30 border-fuchsia-800/30"},
] as const;

function detectDifficulty(name: string): typeof DIFFICULTY_LEVELS[number] {
  const lower = name.toLowerCase();
  const words = lower.split(/\s+/);

  // Require at least one specific physical/action word to qualify for harder tiers.
  // This prevents "find the meaning of life" from matching "Medium" via a coincidental word.
  const hasSpecificActivity = /\b(run|jog|gym|workout|exercise|swim|cycle|bike|pushup|push.?up|pull.?up|squat|plank|lift|sprint|deadlift|hiit|yoga|dance|climb|row|skate|hike|ski|surf)\b/.test(lower);

  if (/\b(marathon|ultra|extreme|2\s*hour|two\s*hour|100\s*(push|pull)|cold\s*(plunge|shower|ice)|4\s*am|4am|5am|fasting|intermittent\s*fast)\b/.test(lower) && hasSpecificActivity) {
    return DIFFICULTY_LEVELS[4];
  }
  if (/\b(5k|10k|run\s*5|deadlift|heavy\s*lift|hiit|intense|hard\s+workout|challenging|sprint|plank\s*(60|90|120))\b/.test(lower) && hasSpecificActivity) {
    return DIFFICULTY_LEVELS[3];
  }
  if (hasSpecificActivity || /\b(study\s+for|practice\s+\w+\s+for|30\s*min\w*\s*(workout|session)|45\s*min|1\s*hour\s+(workout|session|gym))\b/.test(lower)) {
    return DIFFICULTY_LEVELS[2];
  }
  if (/\b(walk|stretch|meditat|journal|read\s|\breadings?\b|flashcard|podcast|vitamin|supplement|hydrat|breathe|gratitude|affirmation|nap|sleep\s+by)\b/.test(lower)) {
    return DIFFICULTY_LEVELS[1];
  }
  // Only count short, simple habits (< 4 words with no activity context) as Easy
  if (words.length <= 3) return DIFFICULTY_LEVELS[0];
  // Multi-word habits with no recognizable activity pattern default to Light
  return DIFFICULTY_LEVELS[1];
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
            <span className="text-[9px] font-semibold mt-0.5 leading-none">{p.label}</span>
            <span className="text-[8px] text-slate-600 leading-none mt-0.5">{p.sub}</span>
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
          <span className="text-[9px] font-semibold mt-0.5 leading-none">Custom</span>
          <span className="text-[8px] text-slate-600 leading-none mt-0.5">exact time</span>
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

const DURATION_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60];
const FREE_MAX_DURATION = 30; // minutes, free plan cap

interface Props {
  onClose: () => void;
  existingHabits: Habit[];
  goals?: string[];
  tier?: Plan;
  onUpgradePro?: () => void;
  withScheduling?: boolean;
  /** When true: skips Step 2, shows a single date-picker in Step 1, submits via onSchedule */
  singleDateMode?: boolean;
  onAdd: (
    name: string, description: string, frequency: "daily" | "weekly",
    stackAfterId?: string | null, whenTime?: string | null,
    whereLocation?: string | null, howLong?: string | null,
    validityScore?: "valid" | "partial" | "invalid",
    reminderTime?: string | null,
    durationMinutes?: number | null,
    xpValue?: number | null,
    difficulty?: number | null,
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
  withScheduling, singleDateMode, onAdd, onSchedule,
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
  const [reminderTime, setReminderTime]   = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  // Smart time detection
  const [timeDetectedFromName, setTimeDetectedFromName] = useState<string | null>(null);
  const [timeOverridden, setTimeOverridden]             = useState(false);
  const prevDetectedTimeRef                             = useRef<string | null>(null);

  // Smart duration detection
  const [durationDetectedFromName, setDurationDetectedFromName] = useState<string | null>(null);
  const [durationOverridden, setDurationOverridden]             = useState(false);
  const prevDetectedDurRef                                      = useRef<string | null>(null);

  // Single-date mode — one date picker replaces Step 2
  const [scheduledDate, setScheduledDate] = useState(() => toDateStr(new Date()));

  // Step 2 — schedule preset + custom day-of-week picks
  const [schedulePreset, setSchedulePreset] = useState<"everyday" | "weekdays" | "weekends" | "custom" | null>(null);
  const [pickedDows, setPickedDows]         = useState<Set<number>>(new Set());

  const next21 = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    // eslint-disable-next-line react-hooks/purity
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

  const isSchedulingMode = !!(withScheduling && onSchedule);
  const aiValidation = useHabitValidation(name, goals, 400, isSchedulingMode);
  const duplicate    = name.trim().length > 2 && isDuplicate(name, existingHabits);

  // Difficulty derived from current name
  const difficulty = useMemo(() => detectDifficulty(name), [name]);

  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
    setError(null);

    // Auto-detect time
    const detectedTime = detectTimeFromName(newName);
    if (detectedTime !== prevDetectedTimeRef.current) {
      prevDetectedTimeRef.current = detectedTime;
      setTimeDetectedFromName(detectedTime);
      setTimeOverridden(false);
      if (detectedTime) setWhenTime(detectedTime);
    }

    // Auto-detect duration
    const { howLong: detectedHowLong, durationMinutes: detectedMins } = detectDurationFromName(newName);
    if (detectedHowLong !== prevDetectedDurRef.current) {
      prevDetectedDurRef.current = detectedHowLong;
      setDurationDetectedFromName(detectedHowLong);
      setDurationOverridden(false);
      if (detectedHowLong) {
        setHowLong(detectedHowLong);
        if (detectedMins !== null) setDurationMinutes(detectedMins);
      }
    }
  }, []);

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

  const isBlocked     = duplicate;
  const durationBonus = howLong ? (DURATION_BONUS_XP[howLong] ?? 0) : 0;

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
    try {
      const addPromise = onAdd(
        name.trim(), description.trim(), frequency,
        null, whenTime || null, whereLocation || null, howLong || null, getValidity(),
        reminderTime || null, durationMinutes,
        difficulty.xp, difficulty.level,
      );
      const timeoutPromise = new Promise<{ error: string }>((resolve) =>
        setTimeout(() => resolve({ error: "Request timed out — please try again." }), 5000)
      );
      const { error } = await Promise.race([addPromise, timeoutPromise]);
      if (error) { setError(error); setLoading(false); }
      else onClose();
    } catch {
      setError("Couldn't save habit — please try again.");
      setLoading(false);
    }
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
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm modal-overlay-enter" onClick={onClose} />

      {/* ── Modal panel ──
          Mobile  : full-screen, slides up from bottom
          Desktop : centered / near-top floating dialog  */}
      <div className={[
        "fixed z-50 bg-[#0f0f1a] flex flex-col mobile-modal-enter",
        // Mobile: full screen, no rounding, no border (inset-0 = all 4 edges 0)
        "inset-0",
        // sm+: floating dialog with border, shadow, rounded corners, constrained size
        isSchedulingMode
          ? "sm:inset-auto sm:border sm:border-violet-800/30 sm:shadow-2xl sm:shadow-violet-950/60 sm:left-1/2 sm:top-[5vh] sm:bottom-auto sm:-translate-x-1/2 sm:rounded-2xl sm:w-[min(620px,calc(100vw-32px))] sm:max-h-[90vh]"
          : "sm:inset-auto sm:border sm:border-violet-800/30 sm:shadow-2xl sm:shadow-violet-950/60 sm:left-1/2 sm:top-6 sm:bottom-auto sm:-translate-x-1/2 sm:rounded-2xl sm:w-[min(640px,calc(100vw-32px))] sm:max-h-[88vh]",
      ].join(" ")}>

        {/* Drag handle — tap or drag down to dismiss, mobile only */}
        <div
          className="sm:hidden flex justify-center pt-4 pb-1 flex-shrink-0 cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <div className="w-12 h-1.5 bg-slate-700/60 rounded-full" />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-3.5 border-b border-violet-900/20 flex-shrink-0 modal-content-enter">
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
              className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-violet-950/70 transition-all"
              aria-label="Close"
            >
              <X className="w-6 h-6 sm:w-4 sm:h-4" />
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
                  onChange={(e) => handleNameChange(e.target.value)}
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

                {/* Difficulty XP badge */}
                {name.trim().length > 2 && !duplicate && aiValidation.status !== "blocked" && (
                  <div className={`mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2 border ${difficulty.bg}`}>
                    <span className="text-sm leading-none">{difficulty.emoji}</span>
                    <p className="text-[11px] flex-1">
                      <span className={`font-bold ${difficulty.color}`}>{difficulty.label}</span>
                      <span className="text-slate-500"> habit · earns </span>
                      <span className={`font-bold ${difficulty.color}`}>{difficulty.xp} XP</span>
                      <span className="text-slate-500"> per completion</span>
                    </p>
                  </div>
                )}
              </div>

              {/* ── 2-column details grid ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">

                {/* LEFT: When / Where / Duration */}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>⏰ When?</label>
                    {timeDetectedFromName && !timeOverridden ? (
                      <div className="flex items-center gap-2 bg-violet-950/40 border border-violet-700/35 rounded-xl px-3 py-2.5">
                        <span className="text-base leading-none flex-shrink-0">
                          {TIME_PERIODS.find((p) => p.value === timeDetectedFromName)?.emoji ?? "⏰"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-violet-300 leading-tight">
                            {TIME_PERIODS.find((p) => p.value === timeDetectedFromName)?.label ?? timeDetectedFromName}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">detected from your habit name</p>
                        </div>
                        <button type="button" onClick={() => setTimeOverridden(true)}
                          className="text-[10px] text-violet-400 hover:text-violet-300 flex-shrink-0 underline underline-offset-2 transition-colors"
                        >change</button>
                      </div>
                    ) : (
                      <TimePicker value={whenTime} onChange={(v) => { setWhenTime(v); if (timeDetectedFromName) setTimeOverridden(true); }} />
                    )}
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
                    {durationDetectedFromName && !durationOverridden ? (
                      <div className="flex items-center gap-2 bg-violet-950/40 border border-violet-700/35 rounded-xl px-3 py-2.5">
                        <span className="text-base leading-none flex-shrink-0">⏱</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-violet-300 leading-tight">{durationDetectedFromName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">detected from your habit name</p>
                        </div>
                        <button type="button" onClick={() => setDurationOverridden(true)}
                          className="text-[10px] text-violet-400 hover:text-violet-300 flex-shrink-0 underline underline-offset-2 transition-colors"
                        >change</button>
                      </div>
                    ) : (
                      <CustomSelect value={howLong} onChange={(v) => { setHowLong(v); if (durationDetectedFromName) setDurationOverridden(true); }}
                        items={HOW_LONG_OPTIONS.map((o) => ({ value: o, label: o }))}
                        placeholder="Duration…" emptyLabel="— No duration —"
                      />
                    )}
                  </div>

                  {/* ── Focus Timer Duration ──────────────────────────────── */}
                  <div>
                    <label className={labelCls}>
                      ⏳ Focus timer
                      {durationDetectedFromName && !durationOverridden && durationMinutes && (
                        <span className="ml-1.5 text-violet-400 font-normal normal-case tracking-normal">auto-set</span>
                      )}
                      {(!durationDetectedFromName || durationOverridden) && <span className="text-slate-600 font-normal"> (optional)</span>}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {DURATION_PRESETS.map((min) => {
                        const isLocked = (tier === "free" || !tier) && min > FREE_MAX_DURATION;
                        const isSelected = durationMinutes === min;
                        return (
                          <button
                            key={min}
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) { onUpgradePro?.(); return; }
                              setDurationMinutes(isSelected ? null : min);
                              if (durationDetectedFromName) setDurationOverridden(true);
                            }}
                            title={isLocked ? `Plus/Pro required for ${min}+ min` : undefined}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-0.5 ${
                              isSelected
                                ? "bg-violet-600/25 border-violet-500/60 text-violet-200"
                                : isLocked
                                ? "opacity-40 bg-violet-950/20 border-violet-900/20 text-slate-600 cursor-not-allowed"
                                : "bg-violet-950/20 border-violet-900/20 text-slate-400 hover:border-violet-700/40 hover:text-slate-200"
                            }`}
                          >
                            {isLocked && <span className="text-[8px]">🔒</span>}
                            {min}m
                          </button>
                        );
                      })}
                    </div>
                    {durationMinutes && (
                      <p className="mt-1 text-[10px] text-violet-400">
                        {durationDetectedFromName && !durationOverridden
                          ? `▶ ${durationMinutes}-min timer auto-set from your habit name.`
                          : `▶ Start a ${durationMinutes}-min focus session right from the habit card.`}
                        {tier === "pro" && " Pomodoro mode included!"}
                      </p>
                    )}
                    {!tier || tier === "free" ? (
                      <p className="mt-1 text-[10px] text-slate-600">Free: up to 30 min. <span className="text-violet-400 cursor-pointer hover:text-violet-300" onClick={onUpgradePro}>Plus/Pro for longer →</span></p>
                    ) : null}
                  </div>
                </div>

                {/* RIGHT: calendar mode = Next button + description + Smart Notifications teaser
                            dashboard mode = Frequency + description + suggestion chips */}
                <div className="space-y-3">
                  {isSchedulingMode ? (
                    singleDateMode ? (
                      /* ── Calendar single-date: date picker ── */
                      <div>
                        <label className={labelCls}>📅 Which day?</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          min={toDateStr(new Date())}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className={`${inputCls} [color-scheme:dark]`}
                        />
                      </div>
                    ) : (
                    /* ── Calendar multi-date: big Next button replaces Frequency ── */
                    <button
                      type="button"
                      disabled={!name.trim() || isBlocked}
                      onClick={goToStep2}
                      className="w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #7c3aed 100%)",
                        boxShadow: "0 0 18px rgba(139,92,246,0.35), 0 3px 10px rgba(109,40,217,0.25)",
                      }}
                    >
                      Next: Choose Days
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )
                  ) : (
                    /* ── Dashboard: Frequency toggle ── */
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
                  )}

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

                  {/* Reminder time — available to all users */}
                  <div>
                    <label className={labelCls}>
                      🔔 Remind me at <span className="text-slate-600 font-normal">(optional)</span>
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                    {reminderTime && (
                      <p className="mt-1 text-[10px] text-violet-400">
                        You&apos;ll get a push notification at {reminderTime} if this habit isn&apos;t done yet.
                      </p>
                    )}
                  </div>

                  {isSchedulingMode ? (
                    /* ── Calendar: Smart Notifications Pro teaser ── */
                    tier !== "pro" ? (
                      <div className="rounded-xl border border-violet-900/20 bg-violet-950/20 p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">⚡</span>
                          <p className="text-[11px] font-bold text-white leading-none">Smart Notifications</p>
                          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-900/25 border border-amber-600/25 px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2 h-2" />PRO
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          AI learns your best time and reminds you automatically.
                        </p>
                        <button type="button" onClick={onUpgradePro}
                          className="w-full flex items-center justify-center gap-1 py-1.5 bg-amber-600/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold rounded-lg hover:bg-amber-600/30 transition-all"
                        >
                          <Crown className="w-2.5 h-2.5" />Upgrade to unlock
                        </button>
                      </div>
                    ) : uniqueSuggestions.length > 0 ? (
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
                    ) : null
                  ) : (
                    /* ── Dashboard: suggestion chips (existing behaviour) ── */
                    uniqueSuggestions.length > 0 && (
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
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Step 1 Footer */}
            <div className="flex gap-2.5 px-5 py-3.5 border-t border-violet-900/20 flex-shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 border border-violet-900/30 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
              >Cancel</button>

              {/* Dashboard mode: Add Habit submit */}
              {!isSchedulingMode && (
                <button type="submit" disabled={loading || !name.trim() || isBlocked}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Add Habit</>}
                </button>
              )}

              {/* Calendar single-date mode: Add to Plan */}
              {isSchedulingMode && singleDateMode && (
                <button
                  type="button"
                  disabled={!name.trim() || isBlocked || !scheduledDate}
                  onClick={() => {
                    if (!name.trim() || !scheduledDate) return;
                    onSchedule?.(
                      name.trim(), description.trim(), frequency,
                      whenTime || null, whereLocation || null, howLong || null, getValidity(),
                      [scheduledDate],
                    );
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <CalendarDays className="w-4 h-4" />Add to Plan
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
