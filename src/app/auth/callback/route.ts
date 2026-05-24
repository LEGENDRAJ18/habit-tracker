import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code    = searchParams.get("code");
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
    // Collect cookies from the exchange so we can attach them to whichever
    // redirect response we build after inspecting the user's profile.
    const cookieJar: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.forEach((c) =>
              cookieJar.push({ name: c.name, value: c.value, options: (c as Record<string, unknown>) })
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if the user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .single();

      // New users → onboarding; returning users → their intended destination
      const destination = profile?.onboarding_completed ? next : "/onboarding";
      const response    = NextResponse.redirect(new URL(destination, request.url));

      // Attach session cookies to the redirect response
      for (const { name, value, options } of cookieJar) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.cookies.set(name, value, options as any);
      }

      // Send welcome email once per account (non-blocking)
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

      return response;
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
