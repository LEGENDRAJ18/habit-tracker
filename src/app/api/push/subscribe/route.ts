import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    // Distinguish "no session cookie sent at all" from "cookie sent but
    // session invalid/expired" — cookie NAMES only, never values.
    const cookieNames = req.cookies.getAll().map((c) => c.name);
    const hasAuthCookie = cookieNames.some((n) => n.includes("-auth-token"));
    console.error(
      "[push/subscribe] 401 no user — authError:", authError?.message ?? "none",
      "| hasAuthCookie:", hasAuthCookie,
      "| cookieNames:", cookieNames.join(", ") || "(none)",
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let subscription: { endpoint: string; keys: { p256dh: string; auth: string } } | undefined;
  let timezone: string | undefined;
  try {
    const body = await req.json() as {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      timezone: string;
    };
    subscription = body.subscription;
    timezone = body.timezone;
  } catch (err) {
    console.error("[push/subscribe] 400 request body failed to parse as JSON:", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    console.error("[push/subscribe] 400 invalid subscription", {
      hasEndpoint: !!subscription?.endpoint,
      hasP256dh:   !!subscription?.keys?.p256dh,
      hasAuth:     !!subscription?.keys?.auth,
    });
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id:  user.id,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys.p256dh,
      auth:     subscription.keys.auth,
      timezone: timezone ?? "UTC",
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    console.error("[push/subscribe] 500 upsert error:", error.message, error.details ?? "", error.code ?? "");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint: string };
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
