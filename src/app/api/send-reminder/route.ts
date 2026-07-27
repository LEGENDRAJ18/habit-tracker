import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { levelFromXP } from "@/lib/xp";
import { generateUnsubscribeToken } from "@/lib/unsubscribeToken";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

// ─── Weekly AI Report (Sundays only) ─────────────────────────────────────────

async function callOpenAIWeekly(userPrompt: string): Promise<{ summary: string; bestHabit: string; worstHabit: string; tips: string[] } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a habit coach writing a weekly summary email. Be warm, specific, and actionable. Respond ONLY with valid JSON:
{"summary":"2 sentence overall pattern analysis","bestHabit":"name of their best performing habit","worstHabit":"name of habit needing most work","tips":["tip 1 for next week","tip 2 for next week","tip 3 for next week"]}`,
          },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

function buildWeeklyEmailHtml(
  firstName: string,
  ai: { summary: string; bestHabit: string; worstHabit: string; tips: string[] },
  xp: number,
  level: number,
  totalCompletions: number,
  unsubscribeUrl: string,
): string {
  const tipRows = ai.tips
    .map(
      (tip, i) => `
      <tr><td style="padding:0 0 10px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(109,40,217,0.08);border:1px solid rgba(109,40,217,0.15);border-radius:12px;">
          <tr><td style="padding:14px 16px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:24px;vertical-align:top;">
                <div style="width:20px;height:20px;border-radius:50%;background:rgba(124,58,237,0.25);text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#a78bfa;">${i + 1}</div>
              </td>
              <td style="padding-left:10px;vertical-align:top;">
                <p style="margin:0;font-size:13px;color:#c4b5fd;line-height:1.5;">${tip}</p>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Your weekly HabitAI report</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:20px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.2));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.2);">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
          <span style="font-size:18px;line-height:1;">✨</span>
        </div>
      </td>
      <td style="padding-left:12px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:700;color:#ffffff;">habit<span style="color:#a78bfa;">AI</span></span>
        <span style="margin-left:8px;font-size:11px;font-weight:600;color:#7c3aed;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:2px 8px;">Weekly Report</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:32px 36px 0;">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Your week in review, ${firstName} 📊</h1>
    <p style="margin:0;font-size:14px;color:#8b8fa8;line-height:1.6;">Here's your AI-powered habit analysis for the past 7 days.</p>
  </td></tr>

  <!-- AI Summary -->
  <tr><td style="padding:24px 36px 0;">
    <div style="background:rgba(109,40,217,0.12);border:1px solid rgba(109,40,217,0.25);border-radius:14px;padding:18px 20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;">✦ AI Analysis</p>
      <p style="margin:0;font-size:14px;color:#c4b5fd;line-height:1.65;">${ai.summary}</p>
    </div>
  </td></tr>

  <!-- Best / Worst -->
  <tr><td style="padding:16px 36px 0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border-spacing:8px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:4px;">
          <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:0.06em;">🏆 Best habit</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#ffffff;">${ai.bestHabit}</p>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:4px;">
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);border-radius:12px;padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.06em;">⚡ Needs work</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#ffffff;">${ai.worstHabit}</p>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- XP / Level -->
  <tr><td style="padding:16px 36px 0;">
    <div style="background:rgba(109,40,217,0.08);border:1px solid rgba(109,40,217,0.18);border-radius:12px;padding:14px 20px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;"><tr>
        <td style="text-align:center;border-right:1px solid rgba(109,40,217,0.2);padding-right:16px;">
          <p style="margin:0 0 2px;font-size:22px;font-weight:800;color:#a78bfa;">${xp.toLocaleString()}</p>
          <p style="margin:0;font-size:10px;color:#6d28d9;text-transform:uppercase;font-weight:600;">Total XP</p>
        </td>
        <td style="text-align:center;padding-left:16px;">
          <p style="margin:0 0 2px;font-size:22px;font-weight:800;color:#a78bfa;">${totalCompletions}</p>
          <p style="margin:0;font-size:10px;color:#6d28d9;text-transform:uppercase;font-weight:600;">Completions</p>
        </td>
      </tr></table>
    </div>
  </td></tr>

  <!-- Tips -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#6d28d9;letter-spacing:0.08em;text-transform:uppercase;">Next week's action plan</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">${tipRows}</table>
  </td></tr>

  <!-- CTA -->
  <tr><td align="center" style="padding:28px 36px;">
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 24px rgba(124,58,237,0.4);">Open Dashboard</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 36px;border-top:1px solid rgba(109,40,217,0.12);">
    <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;line-height:1.6;">
      Weekly AI report from HabitAI &middot; Level ${level}<br/>
      <a href="${unsubscribeUrl}" style="color:#6d28d9;text-decoration:none;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${APP_URL}/dashboard" style="color:#6d28d9;text-decoration:none;">Open HabitAI</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function runWeeklyReport(supabase: ReturnType<typeof createAdminClient>): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  // Only run on Sundays (UTC day 0)
  if (now.getUTCDay() !== 0) return { sent: 0, skipped: 0 };

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, reminder_enabled, subscription_tier")
    .eq("reminder_enabled", true)
    .eq("subscription_tier", "pro");

  if (!profiles || profiles.length === 0) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const profile of profiles) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
      const email = userData?.user?.email;
      if (!email) { skipped++; continue; }

      const rawName = userData.user?.user_metadata?.full_name ?? email.split("@")[0] ?? "there";
      const firstName = rawName.split(/[\s_\-+@]/)[0];
      const display = firstName.charAt(0).toUpperCase() + firstName.slice(1);

      const [{ data: habits }, { data: logs }, { data: profileData }] = await Promise.all([
        supabase.from("habits").select("id, name").eq("user_id", profile.id),
        supabase.from("habit_logs").select("habit_id, completed_at").eq("user_id", profile.id).gte("completed_at", sevenDaysAgo),
        supabase.from("profiles").select("subscription_tier, xp, level").eq("id", profile.id).single(),
      ]);

      if (!habits || habits.length === 0) { skipped++; continue; }

      const logs7 = logs ?? [];

      // Per-habit 7-day rates
      const habitRates = habits.map((h) => {
        const count = logs7.filter((l) => l.habit_id === h.id).length;
        return { name: h.name, rate: count };
      }).sort((a, b) => b.rate - a.rate);

      const totalCompletions = logs7.length;

      const xp    = profileData?.xp    ?? 0;
      const level = profileData?.level ?? levelFromXP(xp);

      if (totalCompletions === 0) { skipped++; continue; }

      const prompt = `User's weekly habit data:
Habits and 7-day completion count:
${habitRates.map((h) => `- "${h.name}": ${h.rate}/7 days`).join("\n")}

Total completions this week: ${totalCompletions}
Plan tier: ${profileData?.subscription_tier ?? "free"}

Generate a warm weekly summary.`;

      const ai = await callOpenAIWeekly(prompt);
      if (!ai) { skipped++; continue; }

      const unsubscribeUrl = `${APP_URL}/api/unsubscribe?uid=${profile.id}&token=${generateUnsubscribeToken(profile.id)}`;
      await resend.emails.send({
        from: "HabitAI <reminders@habitai.app>",
        to: email,
        subject: `📊 Your weekly AI habit report, ${display}`,
        html: buildWeeklyEmailHtml(display, ai, xp, level, totalCompletions, unsubscribeUrl),
      });

      sent++;
    } catch {
      skipped++;
    }
  }

  return { sent, skipped };
}

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

async function runReminders(): Promise<{ sent: number; skipped: number; hour: number; timestamp: string; weeklySent?: number; trialRemindersSent?: number; weeklyPlansGenerated?: number; smartTimingSent?: number }> {
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

    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?uid=${profile.id}&token=${generateUnsubscribeToken(profile.id)}`;

    await resend.emails.send({
      from: "HabitAI <reminders@habitai.app>",
      to: email,
      subject: "🔥 Don't break your streak! Your habits are waiting",
      html: buildEmailHtml(remaining, streak, unsubscribeUrl),
    });

    sent++;
  }

  // Trial reminders — fires whenever a trial ends in ~48 h
  const trial = await runTrialReminders(supabase).catch(() => ({ sent: 0 }));
  // Weekly game plan auto-generation — only fires on Mondays
  const weeklyPlan = await runWeeklyPlanGeneration(supabase).catch(() => ({ generated: 0 }));
  // Smart timing reminders — fires for Pro users whose preferred hour matches
  const smartTiming = await runSmartTimingReminders(supabase).catch(() => ({ sent: 0 }));

  return { sent, skipped, hour: nowHour, timestamp: now.toISOString(), trialRemindersSent: trial.sent, weeklyPlansGenerated: weeklyPlan.generated, smartTimingSent: smartTiming.sent };
}

function buildTrialReminderHtml(firstName: string, trialEnd: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Your Plus trial ends soon</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:20px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(109,40,217,0.2));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.2);">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
          <span style="font-size:18px;line-height:1;">✨</span>
        </div>
      </td>
      <td style="padding-left:12px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:700;color:#ffffff;">habit<span style="color:#a78bfa;">AI</span></span>
        <span style="margin-left:8px;font-size:11px;font-weight:600;color:#7c3aed;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:2px 8px;">Trial Ending Soon</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 36px 28px;">
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#ffffff;">Your Plus trial ends in 2 days, ${firstName} ⏰</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8fa8;line-height:1.65;">
      Your 7-day Plus trial of <strong style="color:#c4b5fd;">HabitAI</strong> ends on
      <strong style="color:#ffffff;">${trialEnd}</strong>.
      Cancel before then and you won't be charged a thing.
    </p>

    <div style="background:rgba(109,40,217,0.12);border:1px solid rgba(109,40,217,0.25);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;">What you keep after your trial</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${["Unlimited habits & full AI coach", "Unlimited Habit Battles", "Group habits & Commitment Contracts", "Weekly AI email report", "Priority support"]
          .map((f) => `<tr><td style="padding:3px 0;font-size:13px;color:#c4b5fd;">✓ &nbsp;${f}</td></tr>`)
          .join("")}
      </table>
    </div>

    <p style="margin:0 0 24px;font-size:13px;color:#6d7280;line-height:1.6;">
      Want to cancel before being charged? You can manage your subscription anytime from your billing settings.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">
      <a href="${APP_URL}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
        Open Dashboard
      </a>
    </td></tr></table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 36px;border-top:1px solid rgba(109,40,217,0.12);">
    <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;line-height:1.6;">
      Plus trial reminder from HabitAI<br/>
      <a href="${unsubscribeUrl}" style="color:#6d28d9;text-decoration:none;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${APP_URL}/dashboard" style="color:#6d28d9;text-decoration:none;">Open HabitAI</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function runTrialReminders(supabase: ReturnType<typeof createAdminClient>): Promise<{ sent: number }> {
  const now = new Date();
  // Window: trials ending in ~2 days ± 12 h — wide enough for a daily cron to catch every user
  const windowStart = new Date(now.getTime() + 36 * 3600000).toISOString();
  const windowEnd   = new Date(now.getTime() + 60 * 3600000).toISOString();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("subscription_status", "trialing")
    .eq("trial_reminder_sent", false)
    .gte("trial_end_date", windowStart)
    .lte("trial_end_date", windowEnd);

  if (!profiles || profiles.length === 0) return { sent: 0 };

  let sent = 0;
  for (const profile of profiles) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
      const email = userData?.user?.email;
      if (!email) continue;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("trial_end_date")
        .eq("id", profile.id)
        .single();

      if (!profileData?.trial_end_date) continue;

      const rawName = userData.user?.user_metadata?.full_name ?? email.split("@")[0] ?? "there";
      const firstName = rawName.split(/[\s_\-+@]/)[0];
      const display = firstName.charAt(0).toUpperCase() + firstName.slice(1);

      const trialEnd = new Date(profileData.trial_end_date).toLocaleDateString("en-NZ", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });

      const unsubscribeUrl = `${APP_URL}/api/unsubscribe?uid=${profile.id}&token=${generateUnsubscribeToken(profile.id)}`;

      await resend.emails.send({
        from: "HabitAI <reminders@habitai.app>",
        to: email,
        subject: `⏰ Your HabitAI Plus trial ends in 5 days, ${display}`,
        html: buildTrialReminderHtml(display, trialEnd, unsubscribeUrl),
      });

      // Mark sent so we never send twice
      await supabase
        .from("profiles")
        .update({ trial_reminder_sent: true })
        .eq("id", profile.id);

      sent++;
    } catch {
      // continue to next user
    }
  }

  return { sent };
}

// ─── Weekly Game Plan auto-generation (Mondays) ───────────────────────────────

async function callOpenAIWeeklyPlan(prompt: string): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a concise habit coach. Respond ONLY with a valid JSON object: {\"actions\":[\"action1\",\"action2\"]}" },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const arr = Array.isArray(parsed) ? parsed : parsed.actions ?? Object.values(parsed)[0];
    if (!Array.isArray(arr)) return null;
    return (arr as unknown[]).filter((x) => typeof x === "string").slice(0, 5) as string[];
  } catch {
    return null;
  }
}

async function runWeeklyPlanGeneration(supabase: ReturnType<typeof createAdminClient>): Promise<{ generated: number }> {
  const now = new Date();
  // Only run on Mondays (UTC day 1)
  if (now.getUTCDay() !== 1) return { generated: 0 };

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];

  // Monday of this week
  const d = new Date(now);
  const weekStart = d.toISOString().split("T")[0];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, goals")
    .eq("subscription_tier", "pro");

  if (!profiles || profiles.length === 0) return { generated: 0 };

  let generated = 0;

  for (const profile of profiles) {
    try {
      // Skip if plan already exists for this week
      const { data: existing } = await supabase
        .from("weekly_plans")
        .select("id")
        .eq("user_id", profile.id)
        .eq("week_start", weekStart)
        .single();
      if (existing) continue;

      const [{ data: habits }, { data: logs }] = await Promise.all([
        supabase.from("habits").select("id, name").eq("user_id", profile.id),
        supabase.from("habit_logs")
          .select("habit_id, completed_at")
          .eq("user_id", profile.id)
          .gte("completed_at", sevenDaysAgo),
      ]);

      if (!habits || habits.length === 0) continue;

      const logsArr = logs ?? [];
      const habitData = habits.map((h) => {
        const count = logsArr.filter((l) => l.habit_id === h.id).length;
        return `- "${h.name}": completed ${count}/7 days`;
      });

      const goals: string[] = Array.isArray(profile.goals) ? profile.goals : [];
      const prompt = `Generate a weekly game plan (4–5 specific actions, 1 sentence each) for a user with these habits:\n${habitData.join("\n")}\nGoals: ${goals.join(", ") || "general wellbeing"}`;

      const actions = await callOpenAIWeeklyPlan(prompt);
      if (!actions) continue;

      await supabase.from("weekly_plans").upsert(
        { user_id: profile.id, week_start: weekStart, actions, created_at: now.toISOString() },
        { onConflict: "user_id,week_start" },
      );

      generated++;
    } catch {
      // continue
    }
  }

  return { generated };
}

// ─── Smart timing reminders (Pro, per-habit preferred time) ───────────────────

async function runSmartTimingReminders(supabase: ReturnType<typeof createAdminClient>): Promise<{ sent: number }> {
  const now = new Date();
  const nowHour = now.getUTCHours();
  const today = now.toISOString().split("T")[0];

  // Find Pro users' habits with preferred_reminder_time matching this hour
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, user_id, preferred_reminder_time")
    .eq("smart_timing", true)
    .not("preferred_reminder_time", "is", null);

  if (!habits || habits.length === 0) return { sent: 0 };

  // Filter to habits whose preferred hour matches current UTC hour
  const matchingHabits = habits.filter((h) => {
    if (!h.preferred_reminder_time) return false;
    const hour = parseInt(h.preferred_reminder_time.split(":")[0], 10);
    return hour === nowHour;
  });

  if (matchingHabits.length === 0) return { sent: 0 };

  // Group by user
  const byUser = new Map<string, typeof matchingHabits>();
  for (const h of matchingHabits) {
    const arr = byUser.get(h.user_id) ?? [];
    arr.push(h);
    byUser.set(h.user_id, arr);
  }

  let sent = 0;

  for (const [userId, userHabits] of byUser) {
    try {
      // Check subscription tier
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .single();
      if (profile?.subscription_tier !== "pro") continue;

      // Check which habits are not yet completed today
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", userId)
        .gte("completed_at", `${today}T00:00:00.000Z`)
        .lt("completed_at", `${today}T23:59:59.999Z`);

      const completedIds = new Set((logs ?? []).map((l) => l.habit_id));
      const remaining = userHabits.filter((h) => !completedIds.has(h.id));
      if (remaining.length === 0) continue;

      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      const rawName = userData.user?.user_metadata?.full_name ?? email.split("@")[0] ?? "there";
      const firstName = rawName.split(/[\s_\-+@]/)[0];
      const display = firstName.charAt(0).toUpperCase() + firstName.slice(1);

      const unsubscribeUrl = `${APP_URL}/api/unsubscribe?uid=${userId}&token=${generateUnsubscribeToken(userId)}`;

      await resend.emails.send({
        from: "HabitAI <reminders@habitai.app>",
        to: email,
        subject: `⚡ Smart reminder: time for your habits, ${display}`,
        html: buildEmailHtml(remaining.map((h) => h.name), 0, unsubscribeUrl),
      });

      sent++;
    } catch {
      // continue
    }
  }

  return { sent };
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
