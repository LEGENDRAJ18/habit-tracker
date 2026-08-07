"use client";

import { useState, useCallback, useEffect } from "react";
import posthog from "posthog-js";

const SUBSCRIBED_KEY = "habitai-push-subscribed";
const SNOOZE_DAYS = 3;
const SNOOZE_MS = SNOOZE_DAYS * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

// Decodes a VAPID public key. This only guards against input that's
// genuinely unusable client-side (atob() throwing on unparseable base64url,
// e.g. a truncated env var or garbage value) — it does NOT hard-reject on a
// byte-length/prefix heuristic. An earlier version of this function also
// required exactly 65 bytes starting with 0x04 (the standard shape for an
// uncompressed P-256 key) and returned null otherwise; that turned out to be
// too strict; it rejected at least one real, working key, breaking subscribe
// for everyone. The browser's own pushManager.subscribe() is the actual
// authority on whether a key is valid — it throws a specific, catchable
// error (caught and logged where this is called) if the key it's handed
// doesn't work. We still log a warning here if the shape looks off, since
// that's useful diagnostic signal, but we no longer block on it.
function decodeVapidKey(base64String: string): Uint8Array<ArrayBuffer> | null {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(urlBase64ToUint8Array(base64String));
  } catch (err) {
    console.error("[push] VAPID public key failed to base64url-decode:", err);
    return null;
  }
  if (bytes.byteLength !== 65 || bytes[0] !== 4) {
    console.warn(
      "[push] VAPID public key has an unexpected shape — decoded to", bytes.byteLength,
      "bytes starting with 0x" + (bytes[0]?.toString(16) ?? "?"),
      "(uncompressed P-256 is usually 65 bytes starting with 0x04). Attempting subscribe anyway."
    );
  }
  return bytes;
}

// Discord/Instagram in-app browsers (WKWebView on iOS < 16.4, Android WebView)
// do not expose the Notification API at all. Accessing Notification.permission
// without this guard throws ReferenceError and crashes the dashboard.
const notifPermission = (): NotificationPermission | null => {
  if (typeof window === "undefined") return null;
  if (typeof Notification === "undefined") return null;
  return Notification.permission;
};

const hasNotifAPI = (): boolean =>
  typeof window !== "undefined" &&
  typeof Notification !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

export type SubscribeResult = "success" | "denied" | "error" | "no_vapid" | "unsupported";

export function usePushNotifications() {
  const [showModal, setShowModal] = useState(false);
  // isSubscribed reflects whether the SERVER has a saved push_subscriptions
  // row for this device — never derived from Notification.permission alone.
  // Permission persists forever once granted, independent of whether we've
  // ever actually saved a subscription, so it can't be used as a proxy for
  // "subscribed". Starts false; the mount-time reconciliation effect below
  // sets it once it has confirmed (or created + saved) a real subscription.
  const [isSubscribed, setSubscribed] = useState(false);
  // True while the mount-time reconciliation (below) is in flight, so
  // consumers can show a neutral "checking…" state instead of a misleading
  // "disabled" flash for users who are actually already set up.
  const [reconciling, setReconciling] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  // POSTs a browser PushSubscription to the server. The route upserts on
  // (user_id, endpoint), so this is idempotent — safe to call every time we
  // reconcile, not just on the very first subscribe. credentials:"same-origin"
  // is explicit (not just relying on the browser default) so the Supabase
  // auth cookie is guaranteed to be sent — a missing/expired session here is
  // the #1 way this silently comes back 401.
  const persistSubscription = useCallback(async (sub: PushSubscription): Promise<boolean> => {
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        console.error("[push] POST /api/push/subscribe failed:", res.status, body?.error ?? "(no error body)");
        return false;
      }
      return true;
    } catch (err) {
      console.error("[push] POST /api/push/subscribe threw:", err);
      return false;
    }
  }, []);

  // Core subscribe: gets (or creates) a SW push subscription and saves it to
  // the backend. Returns a SubscribeResult so callers can show appropriate
  // feedback. Always runs the full subscribe→POST flow — callers must not
  // skip calling this just because Notification.permission is "granted";
  // permission alone says nothing about whether the server has a row.
  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("[push] subscribe(): NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in the client bundle");
      return "no_vapid";
    }
    if (!hasNotifAPI()) return "unsupported";

    const applicationServerKey = decodeVapidKey(vapidKey);
    if (!applicationServerKey) return "no_vapid";

    try {
      const reg = await navigator.serviceWorker.ready;

      // Clear any existing subscription first. If the VAPID keypair was ever
      // rotated, a leftover subscription tied to the OLD key makes
      // pushManager.subscribe() throw InvalidStateError ("a subscription
      // with a different applicationServerKey already exists") — a common,
      // otherwise-silent cause of this failing for users who granted
      // permission under a previous deployment/key.
      const stale = await reg.pushManager.getSubscription();
      if (stale) {
        await stale.unsubscribe().catch((err) => {
          console.error("[push] subscribe(): failed to clear stale subscription:", err);
        });
      }

      let sub: PushSubscription;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (err) {
        const e = err as { name?: string; message?: string };
        console.error("[push] subscribe(): pushManager.subscribe() threw:", e?.name, e?.message);
        return "error";
      }

      const ok = await persistSubscription(sub);

      if (!ok) {
        // Unsubscribe from the browser too so state stays consistent
        await sub.unsubscribe().catch(() => {});
        setSubscribed(false);
        return "error";
      }

      setSubscribed(true);
      setSubscribeSuccess(true);
      setSubscribeError(null);
      localStorage.setItem(SUBSCRIBED_KEY, "1");
      setTimeout(() => setSubscribeSuccess(false), 4000);
      return "success";
    } catch (err) {
      console.error("[push] subscribe(): unexpected error:", err);
      return "error";
    }
  }, [persistSubscription]);

  const allow = useCallback(async () => {
    setShowModal(false);
    if (!hasNotifAPI()) return;
    const permission = await Notification.requestPermission();
    posthog.capture(permission === "granted" ? "notification_permission_granted" : "notification_permission_denied");
    if (permission === "granted") {
      const result = await subscribe();
      if (result !== "success") {
        console.error("[push] allow(): subscribe() returned", result);
        setSubscribeError("Couldn't enable notifications, please try again.");
      }
    }
    // If denied at the browser level, notifPermission() === "denied" is now
    // permanent and already checked everywhere below — no local flag needed.
  }, [subscribe]);

  // "Maybe later" — just hides the modal. The 3-day snooze is enforced by the
  // caller persisting `notif_prompt_last_asked_at` on the profile (survives
  // devices) and passing it back into showAfterFirstCompletion.
  const dismiss = useCallback(() => {
    setShowModal(false);
  }, []);

  // Allow external trigger (e.g. from settings page "Enable notifications" button)
  const requestPermission = useCallback(async (): Promise<SubscribeResult> => {
    if (!hasNotifAPI()) return "unsupported";
    setSubscribeError(null);

    let permission = notifPermission();
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
      posthog.capture(permission === "granted" ? "notification_permission_granted" : "notification_permission_denied");
    }
    if (permission !== "granted") return "denied";

    const result = await subscribe();
    if (result !== "success") {
      console.error("[push] requestPermission(): subscribe() returned", result);
      setSubscribeError("Couldn't enable notifications, please try again.");
    }
    return result;
  }, [subscribe]);

  // On mount: if the browser already has permission granted, reconcile with
  // the server instead of assuming a saved row exists. This is what actually
  // fixes users whose permission was granted before a subscription row ever
  // got persisted (or whose subscription later dropped server-side) — it
  // reuses the existing PushSubscription if one exists (idempotent POST), or
  // creates one if permission is granted but no subscription exists yet.
  useEffect(() => {
    if (!hasNotifAPI()) return;
    if (notifPermission() !== "granted") return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReconciling(true);

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          const applicationServerKey = vapidKey ? decodeVapidKey(vapidKey) : null;
          if (!applicationServerKey) { if (!cancelled) setReconciling(false); return; }
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        const ok = await persistSubscription(sub);
        if (cancelled) return;
        setSubscribed(ok);
        if (ok) localStorage.setItem(SUBSCRIBED_KEY, "1");
        else console.error("[push] mount reconciliation: persistSubscription failed");
      } catch (err) {
        console.error("[push] mount reconciliation failed:", err);
        if (!cancelled) setSubscribed(false);
      } finally {
        if (!cancelled) setReconciling(false);
      }
    })();

    return () => { cancelled = true; };
  }, [persistSubscription]);

  // Called right after the user's first-ever habit completion celebration —
  // not on dashboard load, so they've already seen the app deliver value.
  // `lastAskedAt` is the profile's `notif_prompt_last_asked_at` timestamp; if
  // they dismissed with "Maybe later" less than SNOOZE_DAYS ago, skip.
  const showAfterFirstCompletion = useCallback((lastAskedAt: string | null) => {
    if (!hasNotifAPI()) return;
    // Permission already granted — don't re-prompt for it. The mount-time
    // reconciliation effect above handles verifying/saving the server-side
    // row; it does not depend on this modal being shown.
    if (notifPermission() === "granted") return;
    if (notifPermission() === "denied") return;
    if (localStorage.getItem(SUBSCRIBED_KEY)) return;
    if (lastAskedAt && Date.now() - new Date(lastAskedAt).getTime() < SNOOZE_MS) return;
    setShowModal(true);
  }, []);

  return {
    showModal,
    isSubscribed,
    reconciling,
    subscribeError,
    subscribeSuccess,
    allow,
    dismiss,
    requestPermission,
    showAfterFirstCompletion,
  };
}
