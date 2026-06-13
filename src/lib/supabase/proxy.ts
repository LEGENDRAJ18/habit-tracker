import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/analytics",
  "/settings",
  "/billing",
  "/profile",
  "/friends",
  "/calendar",
  "/onboarding",
  "/admin",
  "/groups",
  "/organisations",
];

const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 5-second timeout: if Supabase is slow (seen up to 87 s in prod logs),
  // fail closed (treat as unauthenticated) rather than hanging the request.
  // Also wrapped in try/catch: if getUser() rejects (network error, bad config),
  // Promise.race propagates the rejection — without the catch, Next.js would
  // fall through to page rendering, bypassing the redirect logic below.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 5_000)
      ),
    ]);
    user = data.user;
  } catch {
    user = null; // fail closed — treat as unauthenticated on any error
  }

  const { pathname } = request.nextUrl;

  // Logged-in user hitting an auth page → go straight to dashboard.
  // IMPORTANT: copy supabaseResponse cookies onto the redirect so that any
  // token refresh that happened during getUser() is not silently discarded.
  // Without this, the browser keeps the revoked refresh token and enters an
  // infinite /auth/login ↔ /dashboard redirect loop.
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
      redirectResponse.cookies.set(name, value, opts)
    );
    return redirectResponse;
  }

  // Logged-out user hitting a protected page → send to login (same cookie copy).
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
      redirectResponse.cookies.set(name, value, opts)
    );
    return redirectResponse;
  }

  return supabaseResponse;
}
