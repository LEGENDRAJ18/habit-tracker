import type { Habit } from "@/types";

// Number of calendar days between consecutive scheduled occurrences of a
// habit: 1 for daily (every day is an occurrence), 7 for weekly (occurs
// once per week on day_of_week). Shared by every streak calculator in the
// app so a weekly habit's completions 7 days apart count as consecutive
// instead of "broken" the way a hard-coded 1-day gap would treat them.
export function getCycleDays(habit: Pick<Habit, "frequency">): number {
  return habit.frequency === "weekly" ? 7 : 1;
}
