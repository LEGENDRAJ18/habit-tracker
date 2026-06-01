"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearUserLocalData, clearIndexedDB } from "@/lib/clearUserData";

// Stored under an sb- prefix so clearUserLocalData preserves it across user switches.
const LAST_USER_KEY = "sb-last-user-id";

/**
 * Mounts once in the root layout and subscribes to Supabase auth state changes.
 * When a DIFFERENT user is detected (vs the last known user ID), all app-specific
 * localStorage data is wiped before the new session's data loads.
 *
 * This guarantees session isolation: User B never sees flags set by User A.
 */
export default function AuthStateManager() {
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const newUserId = session?.user?.id ?? null;
        if (newUserId === null) return; // sign-out — nothing to clear yet

        const lastUserId = localStorage.getItem(LAST_USER_KEY);
        if (lastUserId !== null && lastUserId !== newUserId) {
          // A different user just signed in — wipe the previous user's cached data.
          // Supabase has already stored the new session (sb-* keys) before this
          // callback fires, so clearUserLocalData() preserves the new session.
          clearUserLocalData();
          void clearIndexedDB();
        }
        localStorage.setItem(LAST_USER_KEY, newUserId);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
