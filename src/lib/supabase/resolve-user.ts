import { createClient } from "./client";

// Resolves the current authenticated user, with a server-side fallback.
//
// getSession() reads from localStorage/memory and returns null whenever the
// session has expired or been silently cleared after a long idle period —
// even though the user IS still logged in. getUser() validates against the
// server and triggers a token refresh if needed.
//
// Strategy:
//   1. Try getSession() (fast, <1ms)
//   2. If null, try getUser()  (network call, refreshes token)
//   3. Only return null if BOTH fail
//   Never let a silent null cause a habit completion to be discarded.
export async function resolveUser() {
  const supabase = createClient();

  const { data: sessionData } = await Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 5_000)
    ),
  ]);
  if (sessionData.session?.user) return sessionData.session.user;

  // getSession() returned null — fall back to server-side validation
  const { data: userData } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 8_000)
    ),
  ]);
  return userData.user ?? null;
}
