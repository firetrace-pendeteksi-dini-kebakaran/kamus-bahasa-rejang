const CACHE_NAME = "kamus-rejang-v1";
const BASE = "/kamus-bahasa-rejang/";
const APP_SHELL = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith("kamus-rejang-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isAppNavigation = request.mode === "navigate" &&
    url.origin === self.location.origin &&
    url.pathname.startsWith(BASE);

  // Navigation: network-first, so online visitors receive the latest HTML;
  // if offline, load the most recently saved copy.
  if (isAppNavigation) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          await cache.put(request, response.clone());
          // Keep the canonical entry available as an offline fallback.
          if (url.pathname === BASE || url.pathname === BASE + "index.html") {
            await cache.put(BASE, response.clone());
            await cache.put(BASE + "index.html", response.clone());
          }
        }
        return response;
      } catch (error) {
        return (await cache.match(request)) ||
          (await cache.match(BASE)) ||
          (await cache.match(BASE + "index.html")) ||
          Response.error();
      }
    })());
    return;
  }

  // Other assets, including Google Fonts and the developer photo:
  // cache-first after their first successful online load.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(request);
    if (saved) return saved;

    try {
      const response = await fetch(request);
      // Opaque cross-origin responses may be cached too (e.g. some images).
      if (response && (response.ok || response.type === "opaque")) {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
