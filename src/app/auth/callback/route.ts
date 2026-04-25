import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Send welcome email once per account (covers OAuth + email-confirmation flows).
      // Immediate email signups (no confirmation step) are handled by the signup page.
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

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`);
}
