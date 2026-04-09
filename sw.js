const CACHE_NAME = "feur-events-v5.1";

const urlsToCache = [
  "/",
  "/index.html",
  "/admin.html",
  "/style.css",
  "/admin-style.css",
  "/script.js",
  "/images/feurlogo.png",
  "/manifest.json",
];

// Install: I-save ang mga files at skip waiting
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
  self.skipWaiting(); // FORCE INSTALL AGAD
});

// Fetch: Kunin sa cache, kung wala, sa internet
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

// Activate: Burahin ang lumang cache at i-claim ang clients
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName); // Burahin luma
          }
        }),
      );
    }),
  );
  return self.clients.claim(); // FORCE UPDATE SA LAHAT NG NAKABUKAS NA TABS/APPS
});
