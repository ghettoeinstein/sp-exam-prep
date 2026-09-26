const CACHE_NAME = "sp72-v5";
const BASE = "/sp-exam-prep/";
const ASSETS = [
  BASE + "manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const isNavigation = request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  // Critical for iOS Safari/GitHub Pages: never serve a stale app shell first.
  // Try network for HTML, then fall back to cached index only when offline.
  if (isNavigation) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(BASE + "index.html", copy));
        return response;
      }).catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  // Static assets: stale-while-revalidate for offline support without pinning old UI.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
