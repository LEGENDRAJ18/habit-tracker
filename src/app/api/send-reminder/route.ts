import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

function buildEmailHtml(habits: string[], streak: number, unsubscribeUrl: string) {
  const habitRows = habits
    .map(
      (name) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(109,40,217,0.12);">
          <table cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="width:28px;vertical-align:middle;">
                <div style="width:20px;height:20px;border-radius:6px;border:2px solid rgba(124,58,237,0.5);display:inline-block;"></div>
              </td>
              <td style="padding-left:10px;vertical-align:middle;">
                <span style="font-size:14px;color:#c4b5fd;">${name}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const streakBadge =
    streak > 0
      ? `<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(124,58,237,0.18);border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:5px 14px;margin-bottom:28px;">
          <span style="font-size:16px;">🔥</span>
          <span style="font-size:13px;font-weight:600;color:#c4b5fd;">${streak}-day streak — keep it alive!</span>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Your habits are waiting</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:20px;overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(109,40,217,0.2));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.2);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                      <span style="font-size:18px;line-height:1;">✨</span>
                    </div>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:18px;font-weight:700;color:#ffffff;">habit<span style="color:#a78bfa;">AI</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                Don&rsquo;t break your streak! 🔥
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#8b8fa8;line-height:1.6;">
                You have habits waiting to be completed today. A few minutes is all it takes to keep the momentum going.
              </p>

              ${streakBadge}

              <!-- Habits list -->
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#6d28d9;letter-spacing:0.08em;text-transform:uppercase;">Remaining today</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:32px;">
                ${habitRows}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
                      Complete My Habits
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid rgba(109,40,217,0.12);">
              <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;line-height:1.6;">
                You&rsquo;re receiving this because you enabled habit reminders.<br />
                <a href="${unsubscribeUrl}" style="color:#6d28d9;text-decoration:none;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/dashboard" style="color:#6d28d9;text-decoration:none;">Open HabitAI</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Verify the caller is our cron runner.
 *  Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
 *  Supabase pg_cron sends: x-cron-secret: <CRON_SECRET>
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  const legacy = req.headers.get("x-cron-secret");
  return legacy === secret;
}

async function runReminders(): Promise<{ sent: number; skipped: number; hour: number; timestamp: string }> {
  const supabase = createAdminClient();
  const now = new Date();
  const nowHour = now.getUTCHours();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, reminder_hour, reminder_minute")
    .eq("reminder_enabled", true)
    .eq("reminder_hour", nowHour);

  if (profilesError) throw new Error(profilesError.message);
  if (!profiles || profiles.length === 0) {
    return { sent: 0, skipped: 0, hour: nowHour, timestamp: now.toISOString() };
  }

  const today = now.toISOString().split("T")[0];
  let sent = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email;
    if (!email) { skipped++; continue; }

    const { data: habits } = await supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", profile.id);
    if (!habits || habits.length === 0) { skipped++; continue; }

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("user_id", profile.id)
      .gte("completed_at", `${today}T00:00:00.000Z`)
      .lt("completed_at", `${today}T23:59:59.999Z`);

    const completedIds = new Set((logs ?? []).map((l) => l.habit_id));
    const remaining = habits.filter((h) => !completedIds.has(h.id)).map((h) => h.name);
    if (remaining.length === 0) { skipped++; continue; }

    // Consecutive-day streak (look back 90 days)
    const { data: recentLogs } = await supabase
      .from("habit_logs")
      .select("completed_at")
      .eq("user_id", profile.id)
      .order("completed_at", { ascending: false })
      .limit(90);

    const uniqueDays = [
      ...new Set((recentLogs ?? []).map((l) => l.completed_at.split("T")[0])),
    ].sort().reverse();

    let streak = 0;
    const todayMs = new Date(today).getTime();
    for (let i = 0; i < uniqueDays.length; i++) {
      const diff = Math.round((todayMs - new Date(uniqueDays[i]).getTime()) / 86400000);
      if (diff === i || diff === i + 1) streak++;
      else break;
    }

    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?uid=${profile.id}`;

    await resend.emails.send({
      from: "HabitAI <reminders@habitai.app>",
      to: email,
      subject: "🔥 Don't break your streak! Your habits are waiting",
      html: buildEmailHtml(remaining, streak, unsubscribeUrl),
    });

    sent++;
  }

  return { sent, skipped, hour: nowHour, timestamp: now.toISOString() };
}

// GET — called by Vercel Cron (Authorization: Bearer <CRON_SECRET>)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runReminders();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST — called by Supabase pg_cron via pg_net (x-cron-secret: <CRON_SECRET>)
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runReminders();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
