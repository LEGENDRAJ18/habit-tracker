import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
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
