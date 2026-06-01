/**
 * Clears all user-specific localStorage data while preserving:
 * - Supabase session keys (sb-*) — must survive a user switch
 * - Cookie consent keys — not user-specific
 *
 * Called whenever a different user is detected logging in so that
 * no stale flags from a previous session bleed into the new one.
 */
export function clearUserLocalData(): void {
  if (typeof window === "undefined") return;

  const toPreserve = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith("sb-") ||
      key === "cookie-consent" ||
      key === "cookieconsent_status"
    ) {
      toPreserve.add(key);
    }
  }

  // Collect first, then remove — mutating length during iteration changes indices
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !toPreserve.has(key)) toRemove.push(key);
  }
  for (const key of toRemove) localStorage.removeItem(key);
}
