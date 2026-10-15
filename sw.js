
const CACHE_NAME = "kamus-rejang-v1";
const BASE = "/kamus-bahasa-rejang/";

const APP_FILES = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith("kamus-rejang-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Hanya tangani file dari website ini.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Utamakan file yang sudah tersimpan agar offline berfungsi.
      const cached = await cache.match(request);

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        if (request.mode === "navigate") {
          return (
            await cache.match(BASE) ||
            await cache.match(BASE + "index.html") ||
            Response.error()
          );
        }

        return Response.error();
      }
    })()
  );
});

