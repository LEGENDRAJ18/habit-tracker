// HabitAI Service Worker — static asset caching + push notifications
// v10: navigation requests pass straight through to the network.
// Safari hard-rejects any SW response with redirected:true on navigations —
// the safest fix is to never intercept navigations at all.
const CACHE = "habitai-v10";

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Skip waiting immediately so this worker takes control right away.
  event.waitUntil(self.skipWaiting());
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Cross-origin (Supabase, Stripe, fonts, analytics) — never intercept.
  if (url.origin !== self.location.origin) return;

  // 2. Navigation requests — pass straight to network, no caching.
  //    Safari throws "Response served by service worker has redirections"
  //    whenever the SW returns a response whose URL differs from the request.
  //    Avoiding SW intervention on navigations eliminates this entirely.
  if (request.mode === "navigate") return;

  // 3. API and auth — always network, never cached.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // 4. Next.js immutable static assets — cache-first (content-hashed filenames).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // 5. Icons and manifest — cache-first.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Everything else — network only.
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const tag  = data.tag ?? "habitai";

  const actions = [];
  if (tag === "streak-risk" || tag.startsWith("habit-") || tag === "habits-reminder" || tag === "final-nudge") {
    actions.push({ action: "open", title: "✅ Open app" });
  } else if (tag === "morning-alarm") {
    actions.push({ action: "open", title: "📋 See today's habits" });
  } else if (tag === "weekly-monday" || tag === "weekly-sunday") {
    actions.push({ action: "open", title: "🚀 Go to dashboard" });
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "HabitAI", {
      body:      data.body ?? "",
      icon:      "/icons/icon-192.png",
      badge:     "/icons/icon-96.png",
      tag,
      renotify:  true,
      actions,
      data:      { url: data.url ?? "/dashboard", tag },
      vibrate:   [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data ?? {};
  const target = notifData.url ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return clients.openWindow(target);
      })
  );
});
