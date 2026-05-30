// XP required to reach each level.
// Levels 1–10: exact thresholds.
// Levels 11+:  each level costs 3 000 more XP than the previous.
const LEVEL_XP_TABLE = [0, 0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000];

export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  if (n <= 10) return LEVEL_XP_TABLE[n];
  return 10000 + (n - 10) * 3000;
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
  if (level >= 11) return "Legend";
  if (level >= 9)  return "Elite";
  if (level >= 7)  return "Dedicated";
  if (level >= 5)  return "Committed";
  if (level >= 3)  return "Rising";
  return "Beginner";
}

export function levelEmoji(level: number): string {
  if (level >= 11) return "👑";
  if (level >= 9)  return "⚡";
  if (level >= 7)  return "🔥";
  if (level >= 5)  return "💪";
  if (level >= 3)  return "🌿";
  return "🌱";
}

export type LevelColorKey = "slate" | "emerald" | "blue" | "violet" | "amber" | "red" | "gold";

export function levelColorKey(level: number): LevelColorKey {
  if (level >= 11) return "gold";
  if (level >= 9)  return "amber";
  if (level >= 7)  return "red";
  if (level >= 5)  return "violet";
  if (level >= 3)  return "blue";
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
