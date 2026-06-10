"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "habitai-push-dismissed";
const SUBSCRIBED_KEY = "habitai-push-subscribed";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [showModal, setShowModal] = useState(false);
  const [isSubscribed, setSubscribed] = useState(
    () => typeof window !== "undefined" && Notification.permission === "granted"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (localStorage.getItem(SUBSCRIBED_KEY)) return;

    // Show the beautiful modal 5 seconds after the dashboard loads
    // (give user time to see their habits first)
    const t = setTimeout(() => setShowModal(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const subscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      setSubscribed(true);
      localStorage.setItem(SUBSCRIBED_KEY, "1");
      return true;
    } catch {
      return false;
    }
  }, []);

  const allow = useCallback(async () => {
    setShowModal(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await subscribe();
    } else {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
  }, [subscribe]);

  const dismiss = useCallback(() => {
    setShowModal(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  // Allow external trigger (e.g. from settings page "Enable notifications" button)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Notification.permission === "granted") {
      return subscribe();
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      return subscribe();
    }
    return false;
  }, [subscribe]);

  // Called after onboarding completes — show modal immediately (no timeout)
  const showAfterOnboarding = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") return; // already subscribed
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setShowModal(true);
  }, []);

  return { showModal, isSubscribed, allow, dismiss, requestPermission, showAfterOnboarding };
}
