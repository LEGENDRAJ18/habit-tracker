/**
 * Human-readable elapsed duration, scaled to the most natural unit
 * (hours -> days -> weeks -> months) instead of a fixed phrase like
 * "24 hours" that goes stale the longer the actual gap grows.
 */
export function formatElapsed(ms: number): string {
  const hours = ms / 36e5;

  if (hours < 24) {
    const h = Math.max(1, Math.round(hours));
    return `${h} hour${h === 1 ? "" : "s"}`;
  }

  const days = hours / 24;
  if (days < 7) {
    const d = Math.round(days);
    return `${d} day${d === 1 ? "" : "s"}`;
  }

  if (days < 30) {
    const w = Math.round(days / 7);
    return `${w} week${w === 1 ? "" : "s"}`;
  }

  const m = Math.round(days / 30);
  return `${m} month${m === 1 ? "" : "s"}`;
}
