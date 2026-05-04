// Cumulative XP required to reach level n.
// Formula: Math.floor(50 * (n-1)^1.8)  — level 1 starts at 0 XP.
// Key thresholds:
//   Level  2 →      50 XP  (~5 completions)
//   Level  5 →     746 XP  (~2-3 days for a 3-habit user)
//   Level 10 →   2,152 XP  (~3 weeks)
//   Level 20 →  10,672 XP  (~3-4 months)
//   Level 50 →  49,425 XP  (~1-2 years)
//   Level 100 → 171,006 XP (~several years)
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.floor(50 * Math.pow(n - 1, 1.8));
}

export function levelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  // Binary search over [1, 10000]
  let lo = 1, hi = 10000;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xpForLevel(mid) <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function levelName(level: number): string {
  if (level === 100) return "Legendary 🏆";
  if (level >= 76)   return "Master";
  if (level >= 51)   return "Elite";
  if (level >= 36)   return "Committed";
  if (level >= 21)   return "Dedicated";
  if (level >= 11)   return "Habit Builder";
  if (level >= 6)    return "Apprentice";
  return "Beginner";
}

export type LevelColorKey = "slate" | "emerald" | "blue" | "violet" | "amber" | "red" | "gold";

export function levelColorKey(level: number): LevelColorKey {
  if (level === 100) return "gold";
  if (level >= 76)   return "red";
  if (level >= 51)   return "red";
  if (level >= 36)   return "amber";
  if (level >= 21)   return "violet";
  if (level >= 11)   return "blue";
  if (level >= 6)    return "emerald";
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
