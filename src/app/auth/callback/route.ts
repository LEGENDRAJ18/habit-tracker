import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";

  // Prevent open-redirect — only allow relative paths
  const next = rawNext.startsWith("/") ? rawNext : "/dashboard";

  // Supabase sometimes passes OAuth errors as query params
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const desc = searchParams.get("error_description") ?? oauthError;
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(desc)}`, request.url)
    );
  }

  if (code) {
    // Build the redirect response first so we can attach cookies to it
    const redirectResponse = NextResponse.redirect(new URL(next, request.url));

    // Create a Supabase client that reads cookies from the request and
    // writes session cookies directly onto the redirect response — this
    // is the only pattern that reliably persists the session in a route handler.
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
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Send welcome email once per account (covers OAuth + email-confirmation flows).
      if (!data.user.user_metadata?.welcome_sent && data.user.email) {
        try {
          const name: string =
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            data.user.email.split("@")[0];

          await sendWelcomeEmail(data.user.email, name);

          const admin = createAdminClient();
          await admin.auth.admin.updateUserById(data.user.id, {
            user_metadata: { ...data.user.user_metadata, welcome_sent: true },
          });
        } catch {
          // Non-blocking — never let email failure break the auth redirect
        }
      }

      return redirectResponse;
    }

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=auth_callback_error", request.url)
  );
}
