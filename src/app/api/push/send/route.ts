import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWebPush } from "@/lib/webpush";
import { isAuthorizedCron as verifyCron } from "@/lib/cronAuth";

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

type NotifPrefs = {
  morning_alarm?: boolean;
  morning_alarm_time?: string;       // "HH:MM"
  habit_reminders?: boolean;
  final_nudge?: boolean;
  final_nudge_time?: string;         // "HH:MM" — default "21:00"
  streak_protection?: boolean;
  weekly_motivation?: boolean;
  battle_notifications?: boolean;
  friend_notifications?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;        // "HH:MM"
  quiet_hours_end?: string;          // "HH:MM"
};

async function sendPush(
  sub: PushSub,
  payload: { title: string; body: string; tag: string; url: string },
) {
  try {
    await getWebPush().sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "expired";
    return false;
  }
}

/** Get user's local hour (0-23) from their timezone */
function getLocalHour(now: Date, timezone: string): number {
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(now),
      10,
    );
  } catch {
    return now.getUTCHours();
  }
}

/** Get user's local date as "YYYY-MM-DD" */
function getLocalDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Advance a "YYYY-MM-DD" date string by one day */
function nextDateStr(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Get user's local day-of-week (0=Sun,1=Mon,...6=Sat) */
function getLocalDow(now: Date, timezone: string): number {
  try {
    // en-US short weekday: Sun/Mon/Tue/Wed/Thu/Fri/Sat
    const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(now);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[name] ?? now.getUTCDay();
  } catch {
    return now.getUTCDay();
  }
}

/** Check if current local time falls inside quiet hours */
function isQuietHours(localHour: number, prefs: NotifPrefs): boolean {
  if (!prefs.quiet_hours_enabled) return false;
  const start = parseInt((prefs.quiet_hours_start ?? "22:00").split(":")[0], 10);
  const end   = parseInt((prefs.quiet_hours_end   ?? "07:00").split(":")[0], 10);
  if (start > end) {
    // Spans midnight: quiet if hour >= start OR hour < end
    return localHour >= start || localHour < end;
  }
  return localHour >= start && localHour < end;
}

/** How many hours since a timestamp */
function hoursSince(ts: string | null, now: Date): number {
  if (!ts) return 9999;
  return (now.getTime() - new Date(ts).getTime()) / 36e5;
}

// GET — Vercel Cron (Authorization: Bearer <CRON_SECRET>)
// POST — pg_cron   (x-cron-secret: <CRON_SECRET>)
// Run HOURLY. Handles all push notification types:
//   1. Morning alarm (if enabled, at user's morning_alarm_time)
//   2. Per-habit reminders (at each habit's preferred_reminder_time, if not yet done)
//   3. Final nudge (at final_nudge_time, if any habit incomplete)
//   4. Streak protection (if absent 24h)
//   5. Weekly motivation (Monday morning + Sunday evening)
export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now   = new Date();

  // Load all push subscriptions with user profiles
  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("*");

  if (subErr || !subs) {
    return NextResponse.json({ error: subErr?.message }, { status: 500 });
  }

  const expiredIds: string[] = [];
  const stats = {
    morning: 0, habit_reminder: 0, final_nudge: 0,
    streak: 0, weekly: 0, milestone: 0,
  };

  for (const sub of subs as PushSub[]) {
    const localHour = getLocalHour(now, sub.timezone);
    const localDate = getLocalDate(now, sub.timezone);
    const localDow  = getLocalDow(now, sub.timezone);

    // ── Load profile (notification prefs + last_seen_at) ───────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("last_seen_at, notification_preferences, username")
      .eq("id", sub.user_id)
      .single();

    if (!profile) continue;

    const prefs: NotifPrefs = (profile.notification_preferences as NotifPrefs) ?? {};

    // Skip everything if in quiet hours
    if (isQuietHours(localHour, prefs)) continue;

    // ── 1. Streak protection — absent 24h+ ────────────────────────────────
    if (prefs.streak_protection !== false) {
      const lastSeen    = profile.last_seen_at ? new Date(profile.last_seen_at) : null;
      const hoursAbsent = lastSeen ? (now.getTime() - lastSeen.getTime()) / 36e5 : 999;

      if (hoursAbsent >= 24 && hoursSince(sub.last_streak_warned_at, now) >= 23) {
        const result = await sendPush(sub, {
          title: "Your streak is at risk 🔥",
          body:  "You haven't opened HabitAI in 24 hours. Tap to keep your streak alive!",
          tag:   "streak-risk",
          url:   "/dashboard",
        });
        if (result === "expired") { expiredIds.push(sub.id); continue; }
        if (result) {
          stats.streak++;
          await admin.from("push_subscriptions")
            .update({ last_streak_warned_at: now.toISOString() })
            .eq("id", sub.id);
          continue; // don't pile on more notifications same tick
        }
      }
    }

    // Count today's completions once (shared by multiple checks below)
    const nextDate = nextDateStr(localDate);
    const { count: completedToday } = await admin
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id)
      .gte("completed_at", `${localDate}T00:00:00`)
      .lt("completed_at", `${nextDate}T00:00:00`);

    const { count: totalHabits } = await admin
      .from("habits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id);

    const hasHabits = (totalHabits ?? 0) > 0;
    const allDone   = hasHabits && (completedToday ?? 0) >= (totalHabits ?? 1);

    // ── 2. Morning alarm ──────────────────────────────────────────────────
    if (prefs.morning_alarm && prefs.morning_alarm_time && hasHabits) {
      const alarmHour = parseInt(prefs.morning_alarm_time.split(":")[0], 10);
      if (localHour === alarmHour && hoursSince(sub.last_reminded_at, now) >= 20) {
        const pending = (totalHabits ?? 0) - (completedToday ?? 0);
        const result = await sendPush(sub, {
          title: "Good morning! ☀️ Your habits await",
          body:  pending === (totalHabits ?? 0)
            ? `You have ${totalHabits} habit${(totalHabits ?? 0) !== 1 ? "s" : ""} to complete today. Let's go!`
            : `${completedToday} done, ${pending} to go — keep the momentum!`,
          tag:   "morning-alarm",
          url:   "/dashboard",
        });
        if (result === "expired") { expiredIds.push(sub.id); continue; }
        if (result) {
          stats.morning++;
          await admin.from("push_subscriptions")
            .update({ last_reminded_at: now.toISOString() })
            .eq("id", sub.id);
          continue;
        }
      }
    }

    // ── 3. Per-habit reminders ─────────────────────────────────────────────
    if (prefs.habit_reminders !== false && hasHabits) {
      // Find habits with a preferred_reminder_time matching this hour
      const { data: habitsWithReminder } = await admin
        .from("habits")
        .select("id, name, preferred_reminder_time")
        .eq("user_id", sub.user_id)
        .not("preferred_reminder_time", "is", null);

      if (habitsWithReminder && habitsWithReminder.length > 0) {
        for (const habit of habitsWithReminder) {
          if (!habit.preferred_reminder_time) continue;
          const habitHour = parseInt((habit.preferred_reminder_time as string).split(":")[0], 10);
          if (habitHour !== localHour) continue;

          // Check if this specific habit was already completed today
          const { count: habitDoneToday } = await admin
            .from("habit_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", sub.user_id)
            .eq("habit_id", habit.id)
            .gte("completed_at", `${localDate}T00:00:00`)
            .lt("completed_at", `${nextDate}T00:00:00`);

          if ((habitDoneToday ?? 0) > 0) continue; // already done — skip

          const result = await sendPush(sub, {
            title: `Time for: ${habit.name} ⏰`,
            body:  "Your reminder is here. Tap to mark it done and keep your streak!",
            tag:   `habit-${habit.id}`,
            url:   "/dashboard",
          });
          if (result === "expired") { expiredIds.push(sub.id); break; }
          if (result) stats.habit_reminder++;
        }
        if (expiredIds.includes(sub.id)) continue;
      }
    }

    // ── 4. Final nudge (default 9 PM) ─────────────────────────────────────
    if (prefs.final_nudge !== false && hasHabits && !allDone) {
      const nudgeHour = parseInt((prefs.final_nudge_time ?? "21:00").split(":")[0], 10);
      if (localHour === nudgeHour && hoursSince(sub.last_reminded_at, now) >= 20) {
        const pending = (totalHabits ?? 0) - (completedToday ?? 0);
        const result = await sendPush(sub, {
          title: "Last chance tonight! 🌙",
          body:  pending === (totalHabits ?? 0)
            ? `No habits done yet today — there's still time! Don't break your streak.`
            : `${pending} habit${pending !== 1 ? "s" : ""} left for today. You're so close!`,
          tag:   "final-nudge",
          url:   "/dashboard",
        });
        if (result === "expired") { expiredIds.push(sub.id); continue; }
        if (result) {
          stats.final_nudge++;
          await admin.from("push_subscriptions")
            .update({ last_reminded_at: now.toISOString() })
            .eq("id", sub.id);
          continue;
        }
      }
    }

    // ── 5. Legacy 8 PM general reminder (when no per-habit times set) ─────
    // Only fires if prefs.habit_reminders is true AND user hasn't set any per-habit times
    // AND no morning alarm is set (to avoid double-nudging)
    if (prefs.habit_reminders !== false && !prefs.morning_alarm && hasHabits && !allDone) {
      // Check if this user has ANY per-habit reminder times
      const { count: habitsWithTime } = await admin
        .from("habits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sub.user_id)
        .not("preferred_reminder_time", "is", null);

      if ((habitsWithTime ?? 0) === 0 && localHour === 20 && hoursSince(sub.last_reminded_at, now) >= 20) {
        const result = await sendPush(sub, {
          title: "Time to build your habits! ✨",
          body:  "You haven't completed your habits today. A few minutes now keeps your streak alive.",
          tag:   "habits-reminder",
          url:   "/dashboard",
        });
        if (result === "expired") { expiredIds.push(sub.id); continue; }
        if (result) {
          stats.habit_reminder++;
          await admin.from("push_subscriptions")
            .update({ last_reminded_at: now.toISOString() })
            .eq("id", sub.id);
        }
      }
    }

    // ── 6. Streak milestone — "Tomorrow you hit X days!" ─────────────────
    // Fire once per day around 6 PM when a user is 1 day away from 7/14/30/100
    if (prefs.streak_protection !== false && localHour === 18 && hasHabits) {
      const MILESTONES = [7, 14, 30, 50, 100, 200, 365];
      const { data: userHabits } = await admin
        .from("habits")
        .select("id, name")
        .eq("user_id", sub.user_id)
        .limit(10);

      for (const h of userHabits ?? []) {
        // Count distinct days completed in the last 400 days
        const { data: logs } = await admin
          .from("habit_logs")
          .select("completed_at")
          .eq("user_id", sub.user_id)
          .eq("habit_id", h.id)
          .gte("completed_at", new Date(Date.now() - 400 * 86400000).toISOString())
          .order("completed_at", { ascending: false })
          .limit(400);

        // Simple streak calc: count consecutive days back from yesterday
        const doneDates = new Set(
          (logs ?? []).map((l) => (l.completed_at as string).slice(0, 10))
        );
        let currentStreak = 0;
        const yesterday = new Date(Date.now() - 86400000);
        for (let i = 0; i < 400; i++) {
          const d = new Date(yesterday.getTime() - i * 86400000)
            .toISOString().slice(0, 10);
          if (doneDates.has(d)) currentStreak++;
          else break;
        }

        const nextMilestone = MILESTONES.find((m) => m === currentStreak + 1);
        if (nextMilestone) {
          const result = await sendPush(sub, {
            title: `🎯 One day from ${nextMilestone} days!`,
            body:  `${h.name}: You're on a ${currentStreak}-day streak. Complete it tomorrow to hit ${nextMilestone} days! Don't stop now.`,
            tag:   `milestone-${h.id}-${nextMilestone}`,
            url:   "/dashboard",
          });
          if (result === "expired") { expiredIds.push(sub.id); break; }
          if (result) stats.milestone++;
          break; // Only one milestone notification per user per hour
        }
      }
      if (expiredIds.includes(sub.id)) continue;
    }

    // ── 7. Weekly motivation ───────────────────────────────────────────────
    if (prefs.weekly_motivation !== false) {
      // Monday 8 AM — weekly kickoff
      if (localDow === 1 && localHour === 8) {
        const result = await sendPush(sub, {
          title: "New week, new wins 💪",
          body:  "Your habit streak is waiting. Start the week strong — even one habit counts!",
          tag:   "weekly-monday",
          url:   "/dashboard",
        });
        if (result === "expired") { expiredIds.push(sub.id); continue; }
        if (result) stats.weekly++;
      }

      // Sunday 7 PM — weekly reflection
      if (localDow === 0 && localHour === 19) {
        const result = await sendPush(sub, {
          title: "Finish the week strong 🏆",
          body:  "One last push before Monday. Complete your habits and close the week on a high!",
          tag:   "weekly-sunday",
          url:   "/dashboard",
        });
        if (result === "expired") { expiredIds.push(sub.id); continue; }
        if (result) stats.weekly++;
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return NextResponse.json({
    ok: true,
    ...stats,
    expired_removed: expiredIds.length,
    ts: now.toISOString(),
  });
}
