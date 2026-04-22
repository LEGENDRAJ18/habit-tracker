// HabitAI Service Worker — app shell caching for offline support
const CACHE = "habitai-v1";

// ─── Install ──────────────────────────────────────────────────────────────────
// Skip waiting so the new SW activates immediately.
self.addEventListener("install", () => self.skipWaiting());

// ─── Activate ────────────────────────────────────────────────────────────────
// Delete stale caches from previous versions.
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

  // 4. Icons and manifest — cache-first.
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

  // 5. HTML navigation — network-first, fall back to cache so the app
  //    shell loads even when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            // Cache a fresh copy for offline use.
            caches.open(CACHE).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(
          () =>
            caches.match(request) ||
            caches.match("/dashboard") ||
            new Response("You are offline. Open the app while connected to load it.", {
              headers: { "Content-Type": "text/plain" },
            })
        )
    );
  }
});
