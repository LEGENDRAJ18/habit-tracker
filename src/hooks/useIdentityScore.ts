import { useMemo } from "react";
import type { Habit } from "@/types";

const IDENTITY_LABELS: [RegExp, string][] = [
  [/morning|wake\s*up|early\s*riser|sunrise|alarm/i,          "a morning person"],
  [/sleep|bed\s*by|bedtime|night\s*routine|wind\s*down/i,      "a good sleeper"],
  [/run|jog|walk|exercise|gym|workout|fitness|lift|yoga|stretch|cardio/i, "a fitness person"],
  [/read|book|learn|study|course|chapter/i,                    "a reader"],
  [/meditat|mindful|breath|calm|zen|gratitude|thankful/i,      "mindful"],
  [/eat|diet|meal|nutrition|cook|veggie|fruit|salad|calori/i,  "a healthy eater"],
  [/screen\s*time|phone|social\s*media|scroll|digital/i,       "digitally disciplined"],
  [/journal|write|diary|reflect|log/i,                         "a journaler"],
  [/water|drink|hydrat/i,                                      "well-hydrated"],
  [/code|program|develop|build\s*something/i,                  "a developer"],
  [/music|guitar|piano|violin|instrument|practice/i,           "a musician"],
  [/clean|tidy|organis|organiz|declutter/i,                    "organized"],
  [/vitamin|supplement|medicine|tablet/i,                      "health-conscious"],
  [/sober|no\s*alcohol|quit\s*drink|quit\s*smok|nicotine/i,    "sober"],
  [/save|invest|budget|money|financ|spend\s*less/i,            "financially disciplined"],
  [/walk|steps|10[,.]?000|movement/i,                          "active"],
];

export function getIdentityLabel(habitName: string): string {
  for (const [pattern, label] of IDENTITY_LABELS) {
    if (pattern.test(habitName)) return label;
  }
  return "consistent";
}

// Strips a leading "a "/"an " so the label can stand alone as a noun phrase
// (e.g. "a fitness person" -> "fitness person") for the 0% and 100% tiers,
// which read as a bare identity rather than mid-sentence ("you are ___").
function bareLabel(label: string): string {
  return label.replace(/^(a|an)\s+/i, "");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// A raw "X%" identity claim reads as demotivating at low scores, especially
// 0% for a brand-new habit that hasn't had a chance to build any history yet.
// Framed instead as progress toward an identity, at every tier.
function identityPhrase(score: number, label: string): string {
  const bare = bareLabel(label);
  if (score === 0)   return `Your ${bare} identity starts today`;
  if (score <= 33)   return `You're becoming ${label}`;
  if (score <= 66)   return `You're ${label} in the making`;
  if (score <= 99)   return `You're ${label}`;
  return `${capitalize(bare)}, certified`;
}

export function computeIdentityScore(
  habit: Habit,
  logs: Array<{ habit_id: string; completed_at: string }>,
): number {
  const ninetyDaysAgo  = new Date(Date.now() - 90 * 86400000);
  const created        = new Date(habit.created_at);
  const windowStart    = created > ninetyDaysAgo ? created : ninetyDaysAgo;
  const today          = new Date();
  const daysInWindow   = Math.max(1, Math.round((today.getTime() - windowStart.getTime()) / 86400000));

  const uniqueDates = new Set(
    logs
      .filter((l) => l.habit_id === habit.id && new Date(l.completed_at) >= windowStart)
      .map((l) => l.completed_at.split("T")[0]),
  );

  return Math.min(100, Math.round((uniqueDates.size / daysInWindow) * 100));
}

export function useIdentityScore(
  habit: Habit,
  logs: Array<{ habit_id: string; completed_at: string }>,
): { score: number; label: string; phrase: string } {
  return useMemo(() => {
    const score = computeIdentityScore(habit, logs);
    const label = getIdentityLabel(habit.name);
    const phrase = identityPhrase(score, label);
    return { score, label, phrase };
  }, [habit, logs]);
}
