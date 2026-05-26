/**
 * pushNotify.ts
 * Server-side helper: send a push notification to a specific user.
 * Reads their push_subscriptions from Supabase and fires via Web Push.
 * Silently removes expired subscriptions.
 *
 * Usage (from any server API route):
 *   import { pushNotify } from "@/lib/pushNotify";
 *   await pushNotify(adminClient, userId, { title, body, tag, url }, "battle");
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebPush } from "@/lib/webpush";

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

/**
 * Notification type used to check the user's notification_preferences
 * before sending. Pass "general" to bypass the pref check.
 */
export type NotifType =
  | "battle"
  | "friend"
  | "streak"
  | "habit"
  | "morning_alarm"
  | "final_nudge"
  | "weekly_motivation"
  | "general";

type NotifPrefs = Record<string, boolean | string | undefined>;

/** Map a NotifType to the matching notification_preferences key */
function prefKey(type: NotifType): keyof NotifPrefs | null {
  switch (type) {
    case "battle":          return "battle_notifications";
    case "friend":          return "friend_notifications";
    case "streak":          return "streak_protection";
    case "morning_alarm":   return "morning_alarm";
    case "final_nudge":     return "final_nudge";
    case "weekly_motivation": return "weekly_motivation";
    default:                return null;
  }
}

export async function pushNotify(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload,
  notifType: NotifType = "general",
): Promise<void> {
  // ── Check notification preferences for type-specific pushes ───────────────
  if (notifType !== "general" && notifType !== "habit") {
    const key = prefKey(notifType);
    if (key) {
      const { data: profile } = await admin
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .single();

      const prefs: NotifPrefs =
        (profile?.notification_preferences as NotifPrefs) ?? {};

      // Default is ON for all types — only skip if explicitly set to false
      if (prefs[key] === false) return;
    }
  }

  // ── Fetch subscriptions ───────────────────────────────────────────────────
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const webpush = getWebPush();
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...payload, url: payload.url ?? "/dashboard" }),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) expiredIds.push(sub.id);
      }
    }),
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }
}
