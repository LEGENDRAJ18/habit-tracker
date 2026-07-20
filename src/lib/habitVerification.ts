import type { CompletionQuality, VerificationType } from "@/types";

const COUNTER_KEYWORDS = ["glasses", "cups", "steps", "pages", "reps", "pushups", "situps", "litres", "times"];
const DURATION_KEYWORDS = ["meditate", "study", "read", "focus", "workout", "practice", "yoga", "run", "walk", "swim", "cycle"];
const PHOTO_KEYWORDS = ["cold shower", "journal", "vitamins", "supplement", "medication"];
const REFLECTION_KEYWORDS = ["grateful", "gratitude", "affirmation", "breathe"];

// Sensible default goal per counter keyword — there's no habit-creation UI for
// setting a numeric target, so this is what "goal reached" is measured against.
const COUNTER_DEFAULT_TARGET: Record<string, number> = {
  glasses: 8, cups: 8, steps: 10000, pages: 10,
  reps: 20, pushups: 20, situps: 20, litres: 2, times: 1,
};

export function detectVerificationType(name: string): VerificationType {
  const n = name.toLowerCase();
  if (COUNTER_KEYWORDS.some((kw) => n.includes(kw))) return "counter";
  if (DURATION_KEYWORDS.some((kw) => n.includes(kw))) return "duration";
  if (PHOTO_KEYWORDS.some((kw) => n.includes(kw))) return "photo";
  if (REFLECTION_KEYWORDS.some((kw) => n.includes(kw))) return "reflection";
  return "standard";
}

export function detectDefaultTargetValue(name: string): number | null {
  const n = name.toLowerCase();
  const kw = COUNTER_KEYWORDS.find((k) => n.includes(k));
  return kw ? COUNTER_DEFAULT_TARGET[kw] : null;
}

/**
 * Counter-type scoring: full XP at goal, 75% at 60-99%, 25% below 60%, no
 * completion at 0. completion_quality only distinguishes full vs. partial —
 * the exact XP share is re-derived from actual_value/target when awarding XP.
 */
export function scoreCounterCompletion(
  actualValue: number,
  targetValue: number | null | undefined,
): { quality: CompletionQuality; xpMultiplier: number } | null {
  if (actualValue <= 0) return null; // no completion at all
  if (!targetValue || targetValue <= 0) return { quality: "full", xpMultiplier: 1 };
  const pct = actualValue / targetValue;
  if (pct >= 1)   return { quality: "full",    xpMultiplier: 1 };
  if (pct >= 0.6) return { quality: "partial", xpMultiplier: 0.75 };
  return           { quality: "partial", xpMultiplier: 0.25 };
}
