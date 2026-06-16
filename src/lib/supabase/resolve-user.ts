import { createClient } from "./client";

// Resolves the current authenticated user with three layers of fallback.
//
// Layer 1 — getSession() (0ms, reads from memory/localStorage)
//   Works when the session is fresh. Returns null when the token has been
//   silently cleared after a long idle, even if the user IS still logged in.
//
// Layer 2 — getUser() (network call, validates JWT, triggers token refresh)
//   Succeeds even when getSession() is null, as long as a refresh token
//   exists and is valid. If the access token expired, getUser() refreshes it.
//
// Layer 3 — refreshSession() (network call, forces a new token pair)
//   Final safety net for cases where getUser() also can't resolve. Uses the
//   stored refresh token to get a brand-new access token and session.
//
// Only returns null when the user is genuinely not logged in.
// NEVER let a transient null cause a habit completion or add to be discarded.
export async function resolveUser() {
  const supabase = createClient();

  // Layer 1: fast path
  const { data: sessionData } = await Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 5_000)
    ),
  ]);
  if (sessionData.session?.user) return sessionData.session.user;

  // Layer 2: server-side validation / token refresh
  const { data: userData } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 8_000)
    ),
  ]);
  if (userData.user) return userData.user;

  // Layer 3: force a session refresh via the stored refresh token
  try {
    const { data: refreshData } = await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 10_000)
      ),
    ]);
    if (refreshData.session?.user) return refreshData.session.user;
  } catch {}

  return null;
}
