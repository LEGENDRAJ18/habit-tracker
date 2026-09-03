import type { Habit } from "@/types";

// Number of calendar days between consecutive scheduled occurrences of a
// habit: 1 for daily (every day is an occurrence), 7 for weekly (occurs
// once per week on day_of_week). Shared by every streak calculator in the
// app so a weekly habit's completions 7 days apart count as consecutive
// instead of "broken" the way a hard-coded 1-day gap would treat them.
export function getCycleDays(habit: Pick<Habit, "frequency">): number {
  return habit.frequency === "weekly" ? 7 : 1;
}

// Consecutive-occurrence streak for one habit, walking backward from
// `anchor` (inclusive). Daily habits count consecutive calendar days;
// weekly habits only count consecutive completions of their own scheduled
// day_of_week (steps of 7 days) — every other day was never due, so it
// can't be a miss. Used by the streak-freeze notification (anchored to
// yesterday) and the milestone check (anchored to today) in
// cron/midnight/route.ts.
export function computeOccurrenceStreak(
  anchor: Date,
  doneDates: Set<string>,
  frequency: string | null | undefined,
  dayOfWeek: number | null | undefined,
  maxLookback: number,
): number {
  let streak = 0;
  if (frequency === "weekly" && dayOfWeek != null) {
    const anchorDow = anchor.getUTCDay();
    const offsetToOccurrence = (anchorDow - dayOfWeek + 7) % 7;
    for (let occurrence = 0; ; occurrence++) {
      const daysBack = offsetToOccurrence + occurrence * 7;
      if (daysBack >= maxLookback) break;
      const d = new Date(anchor.getTime() - daysBack * 86400000).toISOString().slice(0, 10);
      if (doneDates.has(d)) streak++;
      else break;
    }
  } else {
    for (let i = 0; i < maxLookback; i++) {
      const d = new Date(anchor.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (doneDates.has(d)) streak++;
      else break;
    }
  }
  return streak;
}

// Raw completion count (0..count) over a habit's last `count` scheduled
// occurrences, walking backward from `anchor` (inclusive). Daily habits
// are checked against their last `count` calendar days; weekly habits are
// checked against their last `count` completions of their own scheduled
// day_of_week (steps of 7 days) — so a weekly habit is counted against
// occurrences it was actually due for, not against `count` daily slots it
// was never scheduled on. Exposed separately from computeOccurrenceRate so
// a caller aggregating across several habits (e.g. a weekly consistency %)
// can sum raw hits/possible before rounding once, instead of rounding each
// habit's rate first and compounding rounding error.
export function computeOccurrenceHits(
  anchor: Date,
  doneDates: Set<string>,
  frequency: string | null | undefined,
  dayOfWeek: number | null | undefined,
  count: number,
): number {
  if (count <= 0) return 0;
  let hits = 0;
  if (frequency === "weekly" && dayOfWeek != null) {
    const anchorDow = anchor.getUTCDay();
    const offsetToOccurrence = (anchorDow - dayOfWeek + 7) % 7;
    for (let occurrence = 0; occurrence < count; occurrence++) {
      const daysBack = offsetToOccurrence + occurrence * 7;
      const d = new Date(anchor.getTime() - daysBack * 86400000).toISOString().slice(0, 10);
      if (doneDates.has(d)) hits++;
    }
  } else {
    for (let i = 0; i < count; i++) {
      const d = new Date(anchor.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (doneDates.has(d)) hits++;
    }
  }
  return hits;
}

// Completion rate (0-100) over a habit's last `count` scheduled
// occurrences. See computeOccurrenceHits for the counting rule. For daily
// habits this produces byte-identical results to the plain "last N
// calendar days" calculation it replaces.
export function computeOccurrenceRate(
  anchor: Date,
  doneDates: Set<string>,
  frequency: string | null | undefined,
  dayOfWeek: number | null | undefined,
  count: number,
): number {
  if (count <= 0) return 0;
  return Math.round((computeOccurrenceHits(anchor, doneDates, frequency, dayOfWeek, count) / count) * 100);
}

// Possible/actual occurrence counts for one habit within a FIXED calendar
// date range [startDate, endDate). Distinct in shape from
// computeOccurrenceHits/computeOccurrenceRate, which count backward from an
// anchor over a trailing N occurrences — this instead walks a bounded range,
// for callers scoring a specific past period (e.g. monthly-wrap's "last
// month") rather than "last N times this was due". Daily habits are checked
// against every day in the range; weekly habits are checked only against
// days matching their own day_of_week, so a weekly habit isn't scored
// against days it was never scheduled on.
export function computeOccurrencesInRange(
  startDate: Date,
  endDate: Date,
  doneDates: Set<string>,
  frequency: string | null | undefined,
  dayOfWeek: number | null | undefined,
): { possible: number; hits: number } {
  let possible = 0;
  let hits = 0;
  for (let t = startDate.getTime(); t < endDate.getTime(); t += 86400000) {
    const d = new Date(t);
    if (frequency === "weekly" && dayOfWeek != null && d.getUTCDay() !== dayOfWeek) continue;
    possible++;
    if (doneDates.has(d.toISOString().slice(0, 10))) hits++;
  }
  return { possible, hits };
}

// Consecutive-occurrence streak aggregated across MULTIPLE habits at once
// (any one of them counts as "done" that day), walking backward from
// `anchor`. Distinct from computeOccurrenceStreak, which scores a single
// habit against its own schedule — this is for callers that show one
// combined streak number for a whole habit set (teacher/parent dashboards
// showing a student/child's overall streak), where the set can freely mix
// daily and weekly habits with different day_of_week values. A calendar day
// only counts as "possible" (required for the streak to continue, and able
// to break it on a miss) if at least one habit in the set was actually
// scheduled that day — so a day none of the set's habits were due on is
// skipped rather than counted as a break, and a weekly-only habit set steps
// through its own day_of_week occurrences instead of every calendar day.
// For any habit set containing at least one daily habit, every day is
// possible, so this produces byte-identical results to a plain "walk
// backward from anchor, break at first miss" calendar-day streak.
export function computeAggregateOccurrenceStreak(
  anchor: Date,
  doneDates: Set<string>,
  habits: { frequency: string | null | undefined; day_of_week: number | null | undefined }[],
  maxLookback: number,
): number {
  const hasDaily = habits.some((h) => h.frequency !== "weekly");
  const weeklyDows = new Set(
    habits.filter((h) => h.frequency === "weekly" && h.day_of_week != null).map((h) => h.day_of_week as number),
  );

  let streak = 0;
  for (let i = 0; i < maxLookback; i++) {
    const d = new Date(anchor.getTime() - i * 86400000);
    const isPossible = hasDaily || weeklyDows.has(d.getUTCDay());
    if (!isPossible) continue;
    if (doneDates.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  return streak;
}
