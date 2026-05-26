/**
 * pushNotify.ts
 * Server-side helper: send a push notification to a specific user.
 * Reads their push_subscriptions from Supabase and fires via Web Push.
 * Silently removes expired subscriptions.
 *
 * Usage (from any server API route):
 *   import { pushNotify } from "@/lib/pushNotify";
 *   await pushNotify(adminClient, userId, { title, body, tag, url });
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebPush } from "@/lib/webpush";

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

export async function pushNotify(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
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
