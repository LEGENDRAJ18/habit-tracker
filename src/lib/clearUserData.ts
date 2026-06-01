/**
 * Clears all IndexedDB databases that aren't Supabase session stores.
 * Called on user switch to prevent data leaking between accounts.
 */
export async function clearIndexedDB(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const idb = window.indexedDB as IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> };
    const dbs = await idb.databases?.() ?? [];
    await Promise.all(
      dbs
        .filter((d) => d.name && !d.name.startsWith("sb-"))
        .map(
          (d) =>
            new Promise<void>((res) => {
              const req = window.indexedDB.deleteDatabase(d.name!);
              req.onsuccess  = () => res();
              req.onerror    = () => res();
              req.onblocked  = () => res();
            }),
        ),
    );
  } catch {
    // indexedDB.databases() not supported in this browser — ignore
  }
}

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
