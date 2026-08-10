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

// Realistic example for the "Tell me about your goal" textarea, one per
// category — shown as the placeholder so the example always matches what
// the user actually picked in Step 1 instead of a fixed running example.
export const CATEGORY_PLACEHOLDERS: Record<GoalCategory, string> = {
  sport: "e.g. I want to make my school's varsity basketball team next season. I can currently make about 6 out of 10 free throws and get winded after a few sprints.",
  body: "e.g. I want to lose 15 pounds and build visible muscle by summer. I'm not working out regularly right now and eat out most days.",
  bad_habit: "e.g. I want to quit vaping completely within 2 months. I currently vape 10-15 times a day, mostly when I'm stressed or bored.",
  academic: "e.g. I want to bring my math grade from a C to an A by the end of the semester. I currently struggle with algebra and rarely study outside of class.",
  build: "e.g. I want to launch a working app by the end of the year. I know some basic coding but have never actually shipped a real project.",
  mental_health: "e.g. I want to feel less anxious and sleep better within 3 months. I feel overwhelmed most days right now and get around 5 hours of sleep a night.",
  finance: "e.g. I want to save $2,000 and pay off my credit card by the end of the year. I currently spend most of what I earn with no real savings plan.",
  relationships: "e.g. I want to be more present with my family and reconnect with old friends over the next few months. I feel distant right now and rarely reach out first.",
};
