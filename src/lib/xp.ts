// Cumulative XP required to reach level n. Max level: 500.
//
// Levels 1–10:   base = Math.floor(50 * (n-1)^1.8)          multiplier ×1
// Levels 11–50:  base = Math.floor(50 * n^2.2)              multiplier ×1.5
// Levels 51–100: base = Math.floor(50 * n^2.2)              multiplier ×2
// Levels 101–200:base = Math.floor(50 * n^2.2)              multiplier ×2.5
// Levels 201–300:base = Math.floor(50 * n^2.2)              multiplier ×3
// Levels 301–500:base = Math.floor(50 * n^2.2)              multiplier ×3.5
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  const lvl = Math.min(n, 500);
  if (lvl <= 10) {
    return Math.floor(50 * Math.pow(lvl - 1, 1.8));
  }
  const base = Math.floor(50 * Math.pow(lvl, 2.2));
  if (lvl > 300) return Math.floor(base * 3.5);
  if (lvl > 200) return Math.floor(base * 3);
  if (lvl > 100) return Math.floor(base * 2.5);
  if (lvl > 50)  return Math.floor(base * 2);
  return Math.floor(base * 1.5);
}

export function levelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  let lo = 1, hi = 500;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xpForLevel(mid) <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function levelName(level: number): string {
  if (level >= 500) return "GOAT";
  if (level >= 401) return "Grandmaster";
  if (level >= 251) return "Legend";
  if (level >= 151) return "Elite";
  if (level >= 76)  return "Dedicated";
  if (level >= 31)  return "Habit Builder";
  if (level >= 11)  return "Apprentice";
  return "Beginner";
}

export type LevelColorKey = "slate" | "emerald" | "blue" | "violet" | "amber" | "red" | "gold";

export function levelColorKey(level: number): LevelColorKey {
  if (level >= 500) return "gold";
  if (level >= 401) return "red";
  if (level >= 251) return "amber";
  if (level >= 151) return "violet";
  if (level >= 76)  return "blue";
  if (level >= 11)  return "emerald";
  return "slate";
}

// XP earned inside the current level
export function xpIntoLevel(xp: number): number {
  return xp - xpForLevel(levelFromXP(xp));
}

// Total XP span of the current level (XP needed to advance)
export function xpSpanOfLevel(xp: number): number {
  const l = levelFromXP(xp);
  return xpForLevel(l + 1) - xpForLevel(l);
}

export function xpProgressPct(xp: number): number {
  const span = xpSpanOfLevel(xp);
  return span > 0 ? Math.min(100, Math.round((xpIntoLevel(xp) / span) * 100)) : 100;
}

export const XP_PER_HABIT       = 10;
export const XP_BONUS_ALL_DONE  = 25;
export const XP_BONUS_STREAK_7  = 50;
export const XP_BONUS_STREAK_30 = 200;

export const DURATION_BONUS_XP: Record<string, number> = {
  "5 min":    1,
  "10 min":   2,
  "20 min":   3,
  "30 min":   5,
  "45 min":   7,
  "1 hour":   10,
  "2+ hours": 15,
};
