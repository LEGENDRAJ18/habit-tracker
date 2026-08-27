import { useMemo } from "react";
import type { Habit } from "@/types";
import { computeIdentityScore, getIdentityLabel } from "./useIdentityScore";
import { getCycleDays } from "@/lib/streaks";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PERSONALITY_RULES: [RegExp, string][] = [
  [/morning|wake|early|sunrise/i,                "Morning Champion 🌅"],
  [/night|evening|late|bed/i,                    "Night Owl 🦉"],
  [/run|gym|workout|exercise|fitness/i,          "Fitness Warrior 💪"],
  [/read|book|study|learn/i,                     "Knowledge Seeker 📚"],
  [/meditat|mindful|calm|breath/i,               "Inner Peace Seeker 🧘"],
  [/weekend/i,                                    "Weekend Warrior 🏆"],
  [/water|hydrat/i,                              "Hydration Hero 💧"],
  [/journal|write|reflect/i,                     "Self-Reflector ✍️"],
  [/diet|eat|food|meal/i,                        "Nutrition Nerd 🥗"],
  [/sober|no\s*alcohol|quit/i,                   "Clean Living Legend 🌿"],
];

function getPersonalityTags(habits: Habit[], logs: Array<{ habit_id: string; completed_at: string }>): string[] {
  const tags = new Set<string>();

  for (const habit of habits) {
    for (const [pattern, tag] of PERSONALITY_RULES) {
      if (pattern.test(habit.name)) tags.add(tag);
    }
  }

  // Weekend Warrior: more completions on Sat/Sun than weekdays
  const weekendDays = logs.filter((l) => {
    const d = new Date(l.completed_at).getDay();
    return d === 0 || d === 6;
  }).length;
  const weekdayDays = logs.length - weekendDays;
  if (weekendDays > weekdayDays * 0.4) tags.add("Weekend Warrior 🏆");

  // Consistency Queen/King: any habit > 80% score
  const hasHighScore = habits.some((h) => computeIdentityScore(h, logs) >= 80);
  if (hasHighScore) tags.add("Consistency King 👑");

  // Early Bird: has a habit with when_time before 9am
  const hasEarlyHabit = habits.some((h) => {
    if (!h.when_time) return false;
    const hour = parseInt(h.when_time.split(":")[0], 10);
    return hour < 9;
  });
  if (hasEarlyHabit) tags.add("Early Bird 🐦");

  return Array.from(tags).slice(0, 4);
}

export interface HabitDNAResult {
  ready: boolean;
  daysOfData: number;
  bestHabit: { name: string; score: number; label: string } | null;
  worstHabit: { name: string; score: number } | null;
  mostConsistentDay: string;
  peakTime: string | null;
  longestStreak: number;
  totalCompletions: number;
  overallConsistency: number;
  personalityTags: string[];
}

export function useHabitDNA(
  habits: Habit[],
  logs: Array<{ habit_id: string; completed_at: string }>,
): HabitDNAResult {
  return useMemo(() => {
    if (habits.length === 0) {
      return {
        ready: false, daysOfData: 0, bestHabit: null, worstHabit: null,
        mostConsistentDay: "Monday", peakTime: null, longestStreak: 0,
        totalCompletions: 0, overallConsistency: 0, personalityTags: [],
      };
    }

    const oldestHabit = habits.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b,
    );
    const daysOfData = Math.round(
      (Date.now() - new Date(oldestHabit.created_at).getTime()) / 86400000,
    );
    const ready = daysOfData >= 30;

    // Scores per habit
    const scores = habits.map((h) => ({
      habit: h,
      score: computeIdentityScore(h, logs),
      label: getIdentityLabel(h.name),
    })).sort((a, b) => b.score - a.score);

    const bestHabit  = scores[0] ? { name: scores[0].habit.name, score: scores[0].score, label: scores[0].label } : null;
    const worstHabit = scores.length > 1 ? { name: scores[scores.length - 1].habit.name, score: scores[scores.length - 1].score } : null;

    // Most consistent day
    const dayCounts = new Array(7).fill(0);
    for (const log of logs) {
      const d = new Date(log.completed_at).getDay();
      dayCounts[d]++;
    }
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const mostConsistentDay = DAY_NAMES[maxDayIdx];

    // Peak time from when_time values on completed habits
    const timeCounts: Record<string, number> = {};
    for (const h of habits) {
      if (h.when_time) {
        const hour = parseInt(h.when_time.split(":")[0], 10);
        const slot = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
        timeCounts[slot] = (timeCounts[slot] ?? 0) + 1;
      }
    }
    const peakSlot = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const peakTime = peakSlot ? `${peakSlot.charAt(0).toUpperCase() + peakSlot.slice(1)}` : null;

    // Longest streak across all habits — cycle-aware so a weekly habit's
    // completions land as consecutive when exactly one cycle (7 days) apart,
    // not just 1 calendar day apart.
    let longestStreak = 0;
    for (const habit of habits) {
      const dates = Array.from(
        new Set(logs.filter((l) => l.habit_id === habit.id).map((l) => l.completed_at.split("T")[0])),
      ).sort().reverse();
      const cycleDays = getCycleDays(habit);

      let streak = 1;
      let maxStreak = dates.length > 0 ? 1 : 0;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diff === cycleDays) { streak++; maxStreak = Math.max(maxStreak, streak); }
        else streak = 1;
      }
      longestStreak = Math.max(longestStreak, maxStreak);
    }

    const totalCompletions  = logs.length;
    const overallConsistency = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0;

    const personalityTags = getPersonalityTags(habits, logs);

    return {
      ready, daysOfData, bestHabit, worstHabit, mostConsistentDay, peakTime,
      longestStreak, totalCompletions, overallConsistency, personalityTags,
    };
  }, [habits, logs]);
}
