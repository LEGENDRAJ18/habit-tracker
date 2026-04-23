// XP required to reach level n (cumulative, zero-based at level 1)
// Formula: 25 * (n-1) * (n+2)  →  level 2 = 100, level 5 = 700, level 10 = 2700
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return 25 * (n - 1) * (n + 2);
}

export function levelFromXP(xp: number): number {
  for (let l = 100; l >= 2; l--) {
    if (xp >= xpForLevel(l)) return l;
  }
  return 1;
}

export function levelName(level: number): string {
  if (level <= 5)  return "Beginner";
  if (level <= 15) return "Explorer";
  if (level <= 30) return "Achiever";
  if (level <= 50) return "Champion";
  return "Legend";
}

// Tailwind colour token for each tier (used in template literals)
export function levelColorKey(level: number): "slate" | "emerald" | "blue" | "violet" | "amber" {
  if (level <= 5)  return "slate";
  if (level <= 15) return "emerald";
  if (level <= 30) return "blue";
  if (level <= 50) return "violet";
  return "amber";
}

// XP earned so far inside the current level
export function xpIntoLevel(xp: number): number {
  return xp - xpForLevel(levelFromXP(xp));
}

// Total XP required to complete the current level
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
