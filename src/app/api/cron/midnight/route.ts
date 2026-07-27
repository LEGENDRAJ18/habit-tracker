import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWebPush } from "@/lib/webpush";
import { Resend } from "resend";
import { generateUnsubscribeToken } from "@/lib/unsubscribeToken";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitaiapp.com";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ─── Push helper ──────────────────────────────────────────────────────────────

async function sendPushToUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  payload: { title: string; body: string; tag: string; url: string },
) {
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) return;
    const wp = getWebPush();
    const expiredEndpoints: string[] = [];
    for (const sub of subs) {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) expiredEndpoints.push(sub.endpoint);
      }
    }
    if (expiredEndpoints.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }
  } catch { /* non-fatal */ }
}

// ─── Streak Freezes ───────────────────────────────────────────────────────────

async function processStreakFreezes(supabase: ReturnType<typeof createAdminClient>) {
  const now       = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
  const today     = now.toISOString().split("T")[0];
  const isMonday  = now.getUTCDay() === 1;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, subscription_tier, streak_freeze_count, freeze_protected_date")
    .in("subscription_tier", ["plus", "pro"]);

  if (!profiles || profiles.length === 0) return { freezesApplied: 0, freezesRefilled: 0 };

  let freezesApplied  = 0;
  let freezesRefilled = 0;

  for (const profile of profiles) {
    try {
      const maxFreeze = profile.subscription_tier === "pro" ? 2 : 1;

      // Monday: refill one freeze and notify
      if (isMonday && profile.streak_freeze_count < maxFreeze) {
        const newCount = Math.min(maxFreeze, profile.streak_freeze_count + 1);
        await supabase.from("profiles")
          .update({ streak_freeze_count: newCount })
          .eq("id", profile.id);
        freezesRefilled++;

        void sendPushToUser(supabase, profile.id, {
          title: "🛡️ Streak freeze restored!",
          body:  `Your streak freeze is back. You're protected for ${newCount === maxFreeze ? "the full week" : "one missed day"} this week.`,
          tag:   "freeze-refill",
          url:   "/dashboard",
        });
      }

      if (profile.freeze_protected_date === yesterday) continue;
      if (profile.streak_freeze_count <= 0) continue;

      const { data: habits } = await supabase.from("habits").select("id").eq("user_id", profile.id);
      if (!habits || habits.length === 0) continue;

      const { data: logs } = await supabase.from("habit_logs")
        .select("habit_id")
        .eq("user_id", profile.id)
        .gte("completed_at", `${yesterday}T00:00:00.000Z`)
        .lt("completed_at", `${today}T00:00:00.000Z`);

      const completedIds = new Set((logs ?? []).map((l) => l.habit_id));
      if (!habits.some((h) => !completedIds.has(h.id))) continue;

      const newFreezeCount = Math.max(0, profile.streak_freeze_count - 1);

      // Calculate current streak to show in notification
      const { data: recentLogs } = await supabase.from("habit_logs")
        .select("completed_at")
        .eq("user_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(60);
      const doneDates = new Set((recentLogs ?? []).map((l) => (l.completed_at as string).slice(0, 10)));
      let streak = 0;
      for (let i = 1; i <= 60; i++) {
        const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
        if (doneDates.has(d)) streak++;
        else break;
      }

      await supabase.from("profiles").update({
        freeze_protected_date: yesterday,
        streak_freeze_count:   newFreezeCount,
      }).eq("id", profile.id);

      freezesApplied++;

      void sendPushToUser(supabase, profile.id, {
        title: "🛡️ Streak freeze used!",
        body:  `Your ${streak}-day streak is safe. ${newFreezeCount === 0 ? "No freezes left this week — they reset Monday." : `${newFreezeCount} freeze${newFreezeCount !== 1 ? "s" : ""} remaining.`}`,
        tag:   "freeze-used",
        url:   "/dashboard",
      });
    } catch { /* continue */ }
  }

  return { freezesApplied, freezesRefilled };
}

// ─── Referrer Rewards ─────────────────────────────────────────────────────────

async function processReferrerRewards(supabase: ReturnType<typeof createAdminClient>): Promise<{ rewarded: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // Find pending referrals where the referred user hasn't been checked yet
  const { data: pendingReferrals } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_id")
    .eq("friend_completed_week", false)
    .eq("status", "pending");

  if (!pendingReferrals?.length) return { rewarded: 0 };

  let rewarded = 0;

  for (const ref of pendingReferrals) {
    try {
      // Count distinct active days for referred user in last 30 days
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("completed_at")
        .eq("user_id", ref.referred_id)
        .gte("completed_at", `${thirtyDaysAgo}T00:00:00Z`);

      const distinctDays = new Set((logs ?? []).map((l) => (l.completed_at as string).slice(0, 10)));
      if (distinctDays.size < 7) continue;

      // Referred user has 7+ days — reward the referrer!
      const rewardDays = 14;
      const now = new Date();

      // Extend referrer's subscription
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("subscription_tier, trial_end_date, subscription_status")
        .eq("id", ref.referrer_id)
        .single();

      if (referrerProfile) {
        const isPaid = referrerProfile.subscription_tier === "plus" || referrerProfile.subscription_tier === "pro";
        const updates: Record<string, unknown> = {};

        if (!isPaid) {
          // Give them Plus for 14 days
          const trialEnd = new Date(now.getTime() + rewardDays * 86400000).toISOString();
          updates.subscription_tier   = "plus";
          updates.subscription_status = "trialing";
          updates.trial_end_date      = trialEnd;
        } else if (referrerProfile.subscription_status === "trialing" && referrerProfile.trial_end_date) {
          // Extend existing trial
          const current = new Date(referrerProfile.trial_end_date);
          updates.trial_end_date = new Date(Math.max(current.getTime(), now.getTime()) + rewardDays * 86400000).toISOString();
        }

        if (Object.keys(updates).length) {
          await supabase.from("profiles").update(updates).eq("id", ref.referrer_id);
        }
      }

      // Mark referral as rewarded
      await supabase.from("referrals").update({
        friend_completed_week:   true,
        referrer_reward_granted: true,
        status:                  "rewarded",
        rewarded_at:             now.toISOString(),
      }).eq("id", ref.id);

      // Also update referred user's referral status
      await supabase.from("referrals").update({ friend_completed_week: true }).eq("id", ref.id);

      rewarded++;

      // Send push notification to referrer
      void sendPushToUser(supabase, ref.referrer_id, {
        title: "🎉 You earned a reward!",
        body:  `Your friend completed their first week! You just earned ${rewardDays} days of Plus free.`,
        tag:   "referral-reward",
        url:   "/settings",
      });

      // Send email to referrer
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(ref.referrer_id);
        const email = userData?.user?.email;
        if (email) {
          const { data: p } = await supabase.from("profiles").select("full_name, username").eq("id", ref.referrer_id).single();
          const rawName = p?.full_name ?? p?.username ?? userData.user?.user_metadata?.full_name ?? email.split("@")[0];
          const name    = (rawName as string).split(/[\s_\-+@]/)[0];
          const display = name.charAt(0).toUpperCase() + name.slice(1);

          await resend.emails.send({
            from:    "HabitAI <hello@habitaiapp.com>",
            to:      email,
            subject: `🎉 You earned ${rewardDays} days of Plus free, ${display}!`,
            html:    buildReferralRewardEmail(display, rewardDays),
          });
        }
      } catch { /* non-fatal */ }
    } catch { /* continue */ }
  }

  return { rewarded };
}

function buildReferralRewardEmail(name: string, days: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:20px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.2));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.2);text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">🎉</div>
    <span style="font-size:18px;font-weight:700;color:#fff;">habit<span style="color:#a78bfa;">AI</span></span>
  </td></tr>
  <tr><td style="padding:32px 36px 28px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">You earned a reward, ${name}!</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8fa8;line-height:1.7;">
      A friend you referred just completed their first week of habits on HabitAI. As promised,
      <strong style="color:#a78bfa;">${days} days of Plus free</strong> have been added to your account automatically.
    </p>
    <div style="background:rgba(109,40,217,0.12);border:1px solid rgba(109,40,217,0.25);border-radius:14px;padding:18px 20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:#6d28d9;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Your reward</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:#a78bfa;">${days} days Plus</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Added to your account right now</p>
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#8b8fa8;line-height:1.7;">
      Share with more friends to keep earning. Every friend who sticks for a week = ${days} more days free for you.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">
      <a href="${APP_URL}/settings" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
        View Your Referral Stats →
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 36px;border-top:1px solid rgba(109,40,217,0.12);">
    <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;">HabitAI · <a href="${APP_URL}/settings" style="color:#6d28d9;text-decoration:none;">Manage account</a></p>
  </td></tr>
</table></td></tr>
</table></body></html>`;
}

// ─── Win-back Emails ──────────────────────────────────────────────────────────

function buildWinBackHtml(name: string, daysAway: number, unsubUrl: string): string {
  const isLong = daysAway >= 30;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:20px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(109,40,217,0.2));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.2);">
    <span style="font-size:18px;font-weight:700;color:#fff;">habit<span style="color:#a78bfa;">AI</span></span>
  </td></tr>
  <tr><td style="padding:32px 36px 28px;">
    <div style="font-size:40px;margin-bottom:16px;">${isLong ? "💫" : "🔥"}</div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">
      ${isLong ? `${name}, your habits miss you` : `${name}, don't let your progress fade`}
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#8b8fa8;line-height:1.7;">
      ${isLong
        ? `It's been ${daysAway} days since you last checked in. Every habit you built is still there — it only takes one day to restart.`
        : `You haven't opened HabitAI in ${daysAway} days. Jump back in before it gets harder.`}
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
        ${isLong ? "Restart My Journey →" : "Get Back on Track →"}
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 36px;border-top:1px solid rgba(109,40,217,0.12);">
    <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;">HabitAI · <a href="${unsubUrl}" style="color:#6d28d9;text-decoration:none;">Unsubscribe</a></p>
  </td></tr>
</table></td></tr>
</table></body></html>`;
}

async function processWinBack(supabase: ReturnType<typeof createAdminClient>): Promise<{ sent: number }> {
  const now   = new Date();
  const today = now.toISOString().split("T")[0];

  const sevenDaysAgo    = new Date(now.getTime() -  7 * 86400000).toISOString().split("T")[0];
  const eightDaysAgo    = new Date(now.getTime() -  8 * 86400000).toISOString().split("T")[0];
  const thirtyDaysAgo   = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
  const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 86400000).toISOString().split("T")[0];

  const [{ data: p7 }, { data: p30 }] = await Promise.all([
    supabase.from("profiles")
      .select("id, win_back_7d_sent_at")
      .gte("last_seen_at", `${eightDaysAgo}T00:00:00Z`)
      .lt("last_seen_at", `${sevenDaysAgo}T00:00:00Z`)
      .is("win_back_7d_sent_at", null),
    supabase.from("profiles")
      .select("id, win_back_30d_sent_at")
      .gte("last_seen_at", `${thirtyOneDaysAgo}T00:00:00Z`)
      .lt("last_seen_at", `${thirtyDaysAgo}T00:00:00Z`)
      .is("win_back_30d_sent_at", null),
  ]);

  let sent = 0;

  async function send(profileId: string, days: number, field: "win_back_7d_sent_at" | "win_back_30d_sent_at") {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(profileId);
      const email = userData?.user?.email;
      if (!email) return;
      const { data: p } = await supabase.from("profiles").select("full_name, username").eq("id", profileId).single();
      const rawName = p?.full_name ?? p?.username ?? userData.user?.user_metadata?.full_name ?? email.split("@")[0];
      const name = (rawName as string).split(/[\s_\-+@]/)[0];
      const display = name.charAt(0).toUpperCase() + name.slice(1);
      await resend.emails.send({
        from:    "HabitAI <hello@habitaiapp.com>",
        to:      email,
        subject: days >= 30 ? `${display}, your habits are still here 💫` : `${display}, don't lose your streak 🔥`,
        html:    buildWinBackHtml(display, days, `${APP_URL}/api/unsubscribe?uid=${profileId}&token=${generateUnsubscribeToken(profileId)}`),
      });
      await supabase.from("profiles").update({ [field]: today }).eq("id", profileId);
      sent++;
    } catch { /* continue */ }
  }

  for (const p of p7  ?? []) await send(p.id,  7, "win_back_7d_sent_at");
  for (const p of p30 ?? []) await send(p.id, 30, "win_back_30d_sent_at");
  return { sent };
}

// ─── Streak Milestone Emails ──────────────────────────────────────────────────

const MILESTONE_DAYS = [7, 30, 100, 365];

function buildMilestoneHtml(name: string, habitName: string, days: number, unsubUrl: string): string {
  const emojis:   Record<number, string> = { 7: "🔥", 30: "⚡", 100: "🏆", 365: "👑" };
  const labels:   Record<number, string> = { 7: "One week", 30: "One month", 100: "100 days", 365: "One full year" };
  const taglines: Record<number, string> = {
    7:   "A full week without missing a day. Most people quit by day 3.",
    30:  "30 days builds a real habit. You've crossed the threshold.",
    100: "100 days. You're not just tracking habits — you're changing who you are.",
    365: "365 days. One full year. This is extraordinary — you're in the top 0.1%.",
  };
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:20px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,rgba(124,58,237,0.5),rgba(109,40,217,0.3));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.3);text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">${emojis[days] ?? "🎯"}</div>
    <span style="font-size:18px;font-weight:700;color:#fff;">habit<span style="color:#a78bfa;">AI</span></span>
  </td></tr>
  <tr><td style="padding:32px 36px 28px;text-align:center;">
    <div style="display:inline-block;background:rgba(124,58,237,0.2);border:1px solid rgba(139,92,246,0.4);border-radius:16px;padding:8px 20px;margin-bottom:20px;">
      <span style="font-size:13px;font-weight:700;color:#a78bfa;">${labels[days] ?? `${days} days`} streak</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#fff;">Incredible, ${name}!</h1>
    <p style="margin:0 0 6px;font-size:16px;color:#a78bfa;font-weight:600;">${days} days of "${habitName}"</p>
    <p style="margin:0 0 24px;font-size:14px;color:#8b8fa8;line-height:1.7;">${taglines[days] ?? `${days} days straight. You've proven you can do this.`}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
        View My Achievement →
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 36px;border-top:1px solid rgba(109,40,217,0.12);">
    <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;">HabitAI · <a href="${unsubUrl}" style="color:#6d28d9;text-decoration:none;">Unsubscribe</a></p>
  </td></tr>
</table></td></tr>
</table></body></html>`;
}

async function processStreakMilestones(supabase: ReturnType<typeof createAdminClient>): Promise<{ sent: number }> {
  const now = new Date();
  const { data: allHabits } = await supabase.from("habits").select("id, name, user_id");
  if (!allHabits?.length) return { sent: 0 };

  const byUser = new Map<string, typeof allHabits>();
  for (const h of allHabits) {
    const arr = byUser.get(h.user_id) ?? [];
    arr.push(h);
    byUser.set(h.user_id, arr);
  }

  let sent = 0;

  for (const [userId, habits] of byUser) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("streak_milestones_emailed")
        .eq("id", userId)
        .single();
      const emailedMilestones: number[] = profile?.streak_milestones_emailed ?? [];

      for (const habit of habits) {
        const { data: logs } = await supabase.from("habit_logs")
          .select("completed_at")
          .eq("user_id", userId)
          .eq("habit_id", habit.id)
          .gte("completed_at", new Date(now.getTime() - 400 * 86400000).toISOString())
          .order("completed_at", { ascending: false })
          .limit(400);

        const doneDates = new Set((logs ?? []).map((l) => (l.completed_at as string).slice(0, 10)));
        let streak = 0;
        for (let i = 0; i < 400; i++) {
          const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
          if (doneDates.has(d)) streak++;
          else break;
        }

        const hitMilestone = MILESTONE_DAYS.find((m) => streak === m && !emailedMilestones.includes(m));
        if (!hitMilestone) continue;

        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const email = userData?.user?.email;
        if (!email) continue;

        const { data: p } = await supabase.from("profiles").select("full_name, username").eq("id", userId).single();
        const rawName = p?.full_name ?? p?.username ?? userData.user?.user_metadata?.full_name ?? email.split("@")[0];
        const name    = (rawName as string).split(/[\s_\-+@]/)[0];
        const display = name.charAt(0).toUpperCase() + name.slice(1);

        await resend.emails.send({
          from:    "HabitAI <hello@habitaiapp.com>",
          to:      email,
          subject: `${hitMilestone} days straight — incredible, ${display}! ${hitMilestone === 365 ? "👑" : "🔥"}`,
          html:    buildMilestoneHtml(display, habit.name, hitMilestone, `${APP_URL}/api/unsubscribe?uid=${userId}&token=${generateUnsubscribeToken(userId)}`),
        });

        await supabase.from("profiles").update({
          streak_milestones_emailed: [...emailedMilestones, hitMilestone],
        }).eq("id", userId);

        void sendPushToUser(supabase, userId, {
          title: `${hitMilestone} day streak! ${hitMilestone === 365 ? "👑" : "🔥"}`,
          body:  `"${habit.name}" — ${hitMilestone} consecutive days. You're incredible!`,
          tag:   `milestone-email-${habit.id}-${hitMilestone}`,
          url:   "/dashboard",
        });

        sent++;
        break; // one milestone email per user per night max
      }
    } catch { /* continue */ }
  }

  return { sent };
}

// ─── Group Streak Reset ───────────────────────────────────────────────────────

async function processGroupStreaks(supabase: ReturnType<typeof createAdminClient>): Promise<{ reset: number }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: groups } = await supabase
    .from("groups")
    .select("id, members, group_streak, last_reset_date");

  if (!groups?.length) return { reset: 0 };
  let reset = 0;

  for (const group of groups) {
    try {
      if (group.last_reset_date === today) continue;

      const members = (group.members as Array<{ user_id: string; joined_at: string; completed_today?: boolean }>) ?? [];
      const allCompleted = members.length > 0 && members.every((m) => m.completed_today);

      // Reset completed_today for all members; decrease streak if not all done
      const resetMembers = members.map((m) => ({ ...m, completed_today: false }));
      const updates: Record<string, unknown> = {
        members:         resetMembers,
        last_reset_date: today,
      };
      if (!allCompleted && (group.group_streak ?? 0) > 0) {
        updates.group_streak = 0;
        reset++;
      }

      await supabase.from("groups").update(updates).eq("id", group.id);
    } catch { /* continue */ }
  }

  return { reset };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function run() {
  const supabase = createAdminClient();
  const [freezes, referrers, winback, milestones, groups] = await Promise.all([
    processStreakFreezes(supabase),
    processReferrerRewards(supabase),
    processWinBack(supabase),
    processStreakMilestones(supabase),
    processGroupStreaks(supabase),
  ]);
  return {
    ...freezes,
    referrersRewarded:  referrers.rewarded,
    winBackSent:        winback.sent,
    milestonesEmailed:  milestones.sent,
    groupStreaksReset:  groups.reset,
    timestamp:          new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try   { return NextResponse.json(await run()); }
  catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try   { return NextResponse.json(await run()); }
  catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 500 }); }
}
