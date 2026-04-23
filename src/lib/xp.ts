// XP required to reach level n (cumulative from level 1).
// Formula: 3000 * ((n-1)/49)^1.83
//   Level 50  →   3,000 XP  (~30 days of consistent 3-habit use)
//   Level 200 →  36,000 XP  (~1 year)
//   Level 500 → 210,000 XP  (~6 years)
//   Level 10000 aspirational (tens of millions XP)
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.round(3000 * Math.pow((n - 1) / 49, 1.83));
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
  if (level <= 50)   return "Beginner";
  if (level <= 200)  return "Explorer";
  if (level <= 500)  return "Achiever";
  if (level <= 1000) return "Champion";
  if (level <= 2500) return "Legend";
  if (level <= 5000) return "Master";
  return "Grandmaster";
}

export type LevelColorKey = "slate" | "emerald" | "blue" | "violet" | "amber" | "red" | "gold";

export function levelColorKey(level: number): LevelColorKey {
  if (level <= 50)   return "slate";
  if (level <= 200)  return "emerald";
  if (level <= 500)  return "blue";
  if (level <= 1000) return "violet";
  if (level <= 2500) return "amber";
  if (level <= 5000) return "red";
  return "gold";
}

// XP earned inside the current level
export function xpIntoLevel(xp: number): number {
  return xp - xpForLevel(levelFromXP(xp));
}

// Total XP span of the current level
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
