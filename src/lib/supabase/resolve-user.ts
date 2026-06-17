import { createClient, awaitCachedUser, getCachedExpiresAt } from "./client";

// Resolves the current authenticated user with three layers of fallback.
//
// Layer 1 — getSession() (reads from memory/localStorage, should be ~0ms)
//   Returns fast when the session is fresh. Returns null when the token was
//   cleared after a long idle even if the user IS still logged in.
//
// Layer 2 — getUser() (network call, validates JWT, triggers token refresh)
//   Succeeds even when getSession() is null, as long as a refresh token exists.
//
// Layer 3 — refreshSession() (network call, forces a new token pair)
//   Final safety net for cases where getUser() also fails.
//
// Timeouts (per-layer): 500ms / 3s / 3s → hard worst-case total ≈ 6.5s.
// Previously: 5s / 8s / 10s → 23s, which caused the frontend timeout to fire
// first and show "Request timed out" even though the backend was healthy.
export async function resolveUser() {
  const supabase = createClient();
  const t0 = performance.now();

  // Layer 0: zero-network — waits out the Supabase client init window then reads cache.
  // Resolves in <1ms when already initialised; waits up to 2s during the brief null window
  // (between createBrowserClient() and the first INITIAL_SESSION/SIGNED_IN event).
  // Skips if the cached token is expired/near-expiry so Layers 1-3 can refresh it.
  const cachedUser = await awaitCachedUser(2_000);
  const cachedExpiry = getCachedExpiresAt();
  if (cachedUser && cachedExpiry > Date.now() + 10_000) {
    console.log(`[auth] resolveUser → cache (${Math.round(performance.now() - t0)}ms)`);
    return cachedUser;
  }
  if (cachedUser) {
    console.log(`[auth] resolveUser → cached token expired/expiring (${new Date(cachedExpiry).toISOString()}), falling through to refresh`);
  }

  // Layer 1: fast path — reads from memory, almost always instant
  const { data: sessionData } = await Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 500)
    ),
  ]);
  const session1 = sessionData.session;
  const expiresAt1 = (session1?.expires_at ?? 0) * 1_000;
  if (session1?.user && expiresAt1 > Date.now() + 10_000) {
    console.log(`[auth] resolveUser → session (${Math.round(performance.now() - t0)}ms)`);
    return session1.user;
  }
  if (session1?.user) {
    console.log(`[auth] resolveUser → session token expired/expiring (${new Date(expiresAt1).toISOString()}), falling through to getUser()`);
  }

  // Layer 2: server-side validation / token refresh
  const { data: userData } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 3_000)
    ),
  ]);
  if (userData.user) {
    console.log(`[auth] resolveUser → getUser (${Math.round(performance.now() - t0)}ms)`);
    return userData.user;
  }

  // Layer 3: force a fresh token pair via stored refresh token
  try {
    const { data: refreshData } = await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 3_000)
      ),
    ]);
    if (refreshData.session?.user) {
      console.log(`[auth] resolveUser → refresh (${Math.round(performance.now() - t0)}ms)`);
      return refreshData.session.user;
    }
  } catch {}

  console.log(`[auth] resolveUser → null (${Math.round(performance.now() - t0)}ms)`);
  return null;
}
