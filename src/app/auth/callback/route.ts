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
              cookieJar.push({ name: c.name, value: c.value, options: c.options ?? {} })
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
        .select("onboarding_completed, referred_by")
        .eq("id", data.user.id)
        .single();

      // Apply referral code if passed in URL and not already applied
      const refCode = searchParams.get("ref")?.trim().toUpperCase();
      if (refCode && !profile?.referred_by) {
        try {
          const admin = createAdminClient();
          const { data: referrer } = await admin
            .from("profiles")
            .select("id, referral_count")
            .eq("referral_code", refCode)
            .single();

          if (referrer && referrer.id !== data.user.id) {
            const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
            await Promise.all([
              admin.from("profiles").update({
                referred_by:         referrer.id,
                subscription_tier:   "plus",
                trial_end_date:      trialEnd,
                subscription_status: "trialing",
              }).eq("id", data.user.id),
              admin.from("referrals").upsert({
                referrer_id: referrer.id,
                referred_id: data.user.id,
                status:      "pending",
              }, { onConflict: "referred_id", ignoreDuplicates: true }),
              admin.from("profiles").update({
                referral_count: (referrer.referral_count ?? 0) + 1,
              }).eq("id", referrer.id),
            ]);
          }
        } catch { /* non-blocking */ }
      }

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
