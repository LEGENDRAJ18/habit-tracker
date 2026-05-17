import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LIMIT       = 5;
const WINDOW_MS   = 60 * 60 * 1000; // 1 hour

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function retryAfterSeconds(oldestAttempt: string): number {
  const resetAt = new Date(oldestAttempt).getTime() + WINDOW_MS;
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

function friendlyWait(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return mins <= 1 ? "about a minute" : `${mins} minutes`;
}

// Only allow redirects to our own origin to prevent open-redirect abuse.
function isSafeRedirect(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip     = getIP(req);
  const admin  = createAdminClient();
  const origin = req.headers.get("origin") ?? "";

  // ── 1. Check rate limit ──────────────────────────────────────────────────
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: attempts, error: countErr } = await admin
    .from("signup_attempts")
    .select("created_at")
    .eq("ip", ip)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true });

  if (countErr) {
    // Fail open — don't block the user if DB is unreachable
    console.error("[signup] rate-limit check failed:", countErr.message);
  } else if ((attempts?.length ?? 0) >= LIMIT) {
    const secs = retryAfterSeconds(attempts![0].created_at);
    return NextResponse.json(
      {
        error: `Too many signup attempts from your network. Please try again in ${friendlyWait(secs)}.`,
        retryAfterSeconds: secs,
      },
      {
        status: 429,
        headers: { "Retry-After": String(secs) },
      },
    );
  }

  // ── 2. Parse & validate body ─────────────────────────────────────────────
  let email: string, password: string, emailRedirectTo: string | undefined;
  try {
    ({ email, password, emailRedirectTo } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (emailRedirectTo && !isSafeRedirect(emailRedirectTo, origin)) {
    emailRedirectTo = undefined; // strip unsafe redirect
  }

  // ── 3. Record the attempt (before calling Supabase so failed calls count) ─
  await admin.from("signup_attempts").insert({ ip });

  // ── 4. Proxy to Supabase auth ────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const authRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey!,
      "Authorization": `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      data: {},
      gotrue_meta_security: {},
      ...(emailRedirectTo ? { redirect_to: emailRedirectTo } : {}),
    }),
  });

  const authData: Record<string, unknown> = await authRes.json();

  // ── 5. Map Supabase response ─────────────────────────────────────────────
  if (!authRes.ok) {
    const msg =
      (authData.msg as string) ??
      (authData.message as string) ??
      (authData.error_description as string) ??
      "Failed to create account. Please try again.";
    return NextResponse.json({ error: msg }, { status: authRes.status });
  }

  // Supabase returns access_token when email confirmation is disabled,
  // or just the user object when confirmation is required.
  if (authData.access_token) {
    return NextResponse.json({
      session: {
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
      },
      user: authData.user ?? null,
    });
  }

  // Email confirmation required — no session yet
  return NextResponse.json({ session: null, user: authData });
}
