import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED = [
  "/dashboard",
  "/analytics",
  "/settings",
  "/billing",
  "/profile",
  "/friends",
  "/calendar",
];

// Auth routes that logged-in users should never see
const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request so later middleware can read them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Rebuild the response so we can attach Set-Cookie headers
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the token with Supabase and auto-refreshes it.
  // This also keeps PWA sessions alive by writing a fresh cookie on each visit.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Logged-in user hitting an auth page → go straight to dashboard
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Logged-out user hitting a protected page → send to login
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/auth/login", request.url);
    // Preserve the intended destination so we can redirect after login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every request EXCEPT:
     *  - Next.js internals (_next/static, _next/image)
     *  - Static files (svg, png, ico, etc.)
     *  - API routes (handled by their own auth checks)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
