// HabitAI Service Worker — app shell caching + push notifications
const CACHE = "habitai-v2";

const PRECACHE = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
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

// ─── Offline fallback HTML ────────────────────────────────────────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#7C3AED">
  <title>HabitAI — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100dvh;background:#09090f;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;gap:1.5rem}
    .icon{width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,#6d28d9,#9333ea);display:flex;align-items:center;justify-content:center;font-size:2.4rem;box-shadow:0 0 40px rgba(124,58,237,.45)}
    h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
    h1 span{color:#a78bfa}
    p{color:#64748b;font-size:.95rem;max-width:320px;line-height:1.6}
    button{margin-top:.5rem;padding:.75rem 2rem;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:600;cursor:pointer;transition:background .2s}
    button:hover{background:#6d28d9}
  </style>
</head>
<body>
  <div class="icon">✨</div>
  <h1>habit<span>AI</span></h1>
  <p>You're offline. Connect to the internet and try again — your habits and streaks are safely stored.</p>
  <button onclick="location.reload()">Try again</button>
</body>
</html>`;

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip cross-origin requests (Supabase, Stripe, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // 2. Skip API and auth routes — never cache dynamic/personal data.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // 3. Next.js immutable static assets — cache-first (content-hashed filenames).
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

  // 4. Static icons and manifest — cache-first.
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

  // 5. HTML navigation — network-first, fall back to cache then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request) || await caches.match("/dashboard");
          if (cached) return cached;
          return new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "HabitAI", {
      body:      data.body ?? "",
      icon:      "/icons/icon-192.png",
      badge:     "/icons/icon-96.png",
      tag:       data.tag ?? "habitai",
      renotify:  true,
      data:      { url: data.url ?? "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(target);
      })
  );
});
