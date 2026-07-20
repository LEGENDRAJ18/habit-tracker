import type { GoalCategory } from "@/types";

export const GOAL_CATEGORIES: { id: GoalCategory; label: string; emoji: string }[] = [
  { id: "sport",         label: "Master a sport",        emoji: "🏅" },
  { id: "body",          label: "Transform my body",     emoji: "💪" },
  { id: "bad_habit",     label: "Break a bad habit",     emoji: "🚭" },
  { id: "academic",      label: "Achieve academically",  emoji: "🎓" },
  { id: "build",         label: "Build something",       emoji: "🛠️" },
  { id: "mental_health", label: "Fix mental health",     emoji: "🧠" },
  { id: "finance",       label: "Fix finances",          emoji: "💰" },
  { id: "relationships", label: "Improve relationships", emoji: "❤️" },
];

export function categoryLabel(id: GoalCategory): string {
  return GOAL_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
