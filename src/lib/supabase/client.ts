import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// Singleton on the browser: all hook instances share one auth state manager,
// one refresh timer, and one realtime connection pool.
let _client: ReturnType<typeof makeClient> | null = null;
let _listenerAttached = false;

// ─── Module-level auth-state cache ───────────────────────────────────────────
// Populated by onAuthStateChange so every caller can read auth state without
// an extra getSession() round-trip.
//
//   undefined  →  no auth event received yet (client still initialising)
//   null       →  user is signed out
//   User       →  user is signed in
//
// The "undefined" state is the "null window": the brief period after
// createBrowserClient() but before INITIAL_SESSION fires.  awaitCachedUser()
// waits out this window so callers never incorrectly see "not authenticated".
let _cachedUser: User | null | undefined = undefined;
// Unix-ms expiry of the current access token; 0 = unknown.
// Updated on every INITIAL_SESSION / TOKEN_REFRESHED / SIGNED_IN event.
let _cachedExpiresAt: number = 0;

// Callbacks queued while _cachedUser is still undefined
let _waiters: Array<(user: User | null) => void> = [];

/**
 * Returns the cached user as soon as the Supabase client has fired its first
 * auth event (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, etc.).
 *
 * - Already initialised  → resolves synchronously (in the same microtask)
 * - Still in the init window → waits; resolves as soon as the event fires
 * - Timeout (default 2 s) → resolves with whatever we have (usually null only
 *   when there is genuinely no session)
 */
/** Returns the Unix-ms expiry of the cached access token (0 = unknown/signed-out). */
export function getCachedExpiresAt(): number { return _cachedExpiresAt; }

export function awaitCachedUser(timeoutMs = 2_000): Promise<User | null> {
  if (_cachedUser !== undefined) return Promise.resolve(_cachedUser);

  return new Promise<User | null>((resolve) => {
    function onUser(user: User | null) {
      clearTimeout(timer);
      resolve(user);
    }
    const timer = setTimeout(() => {
      _waiters = _waiters.filter((w) => w !== onUser);
      // Resolve with the best available value; may be null if no session exists.
      resolve(_cachedUser ?? null);
    }, timeoutMs);
    _waiters.push(onUser);
  });
}

function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
        flowType:           "pkce",
      },
      // Keep the session cookie alive for a year so PWA users stay logged in
      cookieOptions: {
        maxAge:   60 * 60 * 24 * 365,
        sameSite: "lax",
        secure:   process.env.NODE_ENV === "production",
        path:     "/",
      },
    },
  );
}

export function createClient() {
  // Server render: no localStorage, create a fresh client per request.
  if (typeof window === "undefined") return makeClient();

  // Browser: reuse the same instance. The assignment expression evaluates to
  // the non-null value so TypeScript infers ReturnType<typeof makeClient>,
  // which avoids the `| null` widening that breaks callers' type inference.
  const client = (_client = _client ?? makeClient());

  if (!_listenerAttached) {
    _listenerAttached = true;

    // ── Auth cache: subscribe to ALL auth events ──────────────────────────
    // INITIAL_SESSION fires once on page load when the client reads stored
    // credentials.  SIGNED_IN fires on login.  TOKEN_REFRESHED on refresh.
    // SIGNED_OUT clears the cache.
    // Keeping _cachedUser in sync here means resolveUser() can skip network
    // calls entirely when the user is already known.
    client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      _cachedUser = user;
      _cachedExpiresAt = (session?.expires_at ?? 0) * 1_000;
      // Wake any callers that were waiting in awaitCachedUser()
      const waiting = _waiters.splice(0);
      waiting.forEach((w) => w(user));
    });

    // ── Proactive session recovery on tab focus ───────────────────────────
    // Browsers throttle or pause the Supabase auto-refresh timer when a tab
    // is in the background.  On focus we restart it so the token is fresh
    // before the user's first action (add habit, toggle, etc.).
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && _client) {
        void _client.auth.startAutoRefresh();
        // startAutoRefresh() restarts the timer but doesn't immediately fetch
        // a new token. If the tab was idle long enough for the token to expire,
        // the user's very first mutation would fail before the timer fires.
        // Proactively call refreshSession() so the token is fresh before any action.
        if (_cachedExpiresAt > 0 && _cachedExpiresAt < Date.now() + 60_000) {
          console.log(`[auth] token expired/expiring on tab focus (${new Date(_cachedExpiresAt).toISOString()}), proactive refresh`);
          void _client.auth.refreshSession();
        }
      }
    });
  }

  return client;
}
