import { createBrowserClient } from "@supabase/ssr";

// Singleton on the browser: all hook instances share one auth state manager,
// one refresh timer, and one realtime connection pool.
let _client: ReturnType<typeof makeClient> | null = null;
let _listenerAttached = false;

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

  // Attach the proactive session-recovery listener once per page load.
  // Browsers throttle or pause the Supabase auto-refresh timer when a tab is
  // in the background. On focus we restart it so the token is fresh before
  // the user's first action (add habit, toggle, etc.).
  if (!_listenerAttached) {
    _listenerAttached = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && _client) {
        void _client.auth.startAutoRefresh();
      }
    });
  }

  return client;
}
