import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webpush from "@/lib/webpush";

// Verify caller is our cron runner (same pattern as send-reminder).
function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const legacy  = req.headers.get("x-cron-secret");
  return bearer === secret || legacy === secret;
}

type PushSub = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  last_reminded_at: string | null;
  last_streak_warned_at: string | null;
};

async function sendPush(
  sub: PushSub,
  payload: { title: string; body: string; tag: string; url: string },
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: unknown) {
    // 410 Gone / 404 = subscription expired — caller should delete it
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "expired";
    return false;
  }
}

// GET — Vercel Cron  (Authorization: Bearer <CRON_SECRET>)
// POST — pg_cron    (x-cron-secret: <CRON_SECRET>)
// Run this hourly. It handles two notification types:
//   1. habits  — 8 pm local if no completions today
//   2. streak  — if last_seen_at > 24 h ago
export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now   = new Date();
  const todayUTC = now.toISOString().slice(0, 10);

  // Load all push subscriptions
  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("*");
  if (subErr || !subs) {
    return NextResponse.json({ error: subErr?.message }, { status: 500 });
  }

  const expiredIds: string[] = [];
  let habitsSent = 0;
  let streakSent = 0;

  for (const sub of subs as PushSub[]) {
    // ── 1. Streak-at-risk: last_seen_at > 24 h ago ──────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("last_seen_at")
      .eq("id", sub.user_id)
      .single();

    const lastSeen = profile?.last_seen_at ? new Date(profile.last_seen_at) : null;
    const hoursAbsent = lastSeen
      ? (now.getTime() - lastSeen.getTime()) / 36e5
      : 999;

    if (hoursAbsent >= 24) {
      // Only warn once per 24 h window
      const lastWarned = sub.last_streak_warned_at
        ? new Date(sub.last_streak_warned_at)
        : null;
      const warnedRecently = lastWarned
        ? (now.getTime() - lastWarned.getTime()) / 36e5 < 23
        : false;

      if (!warnedRecently) {
        const result = await sendPush(sub, {
          title: "Your streak is at risk! 🔥",
          body:  "You haven't opened HabitAI in 24 hours. Don't break your streak!",
          tag:   "streak-risk",
          url:   "/dashboard",
        });
        if (result === "expired") {
          expiredIds.push(sub.id);
        } else if (result) {
          streakSent++;
          await admin.from("push_subscriptions")
            .update({ last_streak_warned_at: now.toISOString() })
            .eq("id", sub.id);
        }
        continue; // Don't also send habit reminder in same tick
      }
    }

    // ── 2. 8 pm habits reminder — check user's local hour ───────────────────
    let localHour: number;
    try {
      localHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: sub.timezone,
          hour: "numeric",
          hour12: false,
        }).format(now),
        10,
      );
    } catch {
      localHour = now.getUTCHours();
    }

    if (localHour !== 20) continue; // Only fire at 8 pm local

    // Already sent a habit reminder in the past ~1 h?
    const lastReminded = sub.last_reminded_at
      ? new Date(sub.last_reminded_at)
      : null;
    const remindedRecently = lastReminded
      ? (now.getTime() - lastReminded.getTime()) / 36e5 < 1
      : false;
    if (remindedRecently) continue;

    // Any habit completions today (in user's local date)?
    let localToday: string;
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: sub.timezone,
        year: "numeric", month: "2-digit", day: "2-digit",
      }).format(now);
      localToday = parts; // en-CA gives YYYY-MM-DD
    } catch {
      localToday = todayUTC;
    }

    const { count } = await admin
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id)
      .gte("completed_at", `${localToday}T00:00:00`)
      .lt("completed_at", `${localToday}T23:59:59`);

    if ((count ?? 0) > 0) continue; // Already completed habits today

    // Check they have at least one habit
    const { count: habitCount } = await admin
      .from("habits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id);

    if ((habitCount ?? 0) === 0) continue;

    const result = await sendPush(sub, {
      title: "Time to build your habits! ✨",
      body:  "You haven't completed your habits today. A few minutes now keeps your streak alive.",
      tag:   "habits-reminder",
      url:   "/dashboard",
    });

    if (result === "expired") {
      expiredIds.push(sub.id);
    } else if (result) {
      habitsSent++;
      await admin.from("push_subscriptions")
        .update({ last_reminded_at: now.toISOString() })
        .eq("id", sub.id);
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return NextResponse.json({
    ok: true,
    habits_sent: habitsSent,
    streak_sent: streakSent,
    expired_removed: expiredIds.length,
  });
}
