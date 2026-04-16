const CACHE_NAME = "feur-events-v6.6";

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

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
  self.skipWaiting(); // FORCE INSTALL AGAD
});

// Fetch
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

// Activate
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName); // delete d old shi
          }
        }),
      );
    }),
  );
  return self.clients.claim(); // FORCE UPDATE SA LAHAT NG NAKABUKAS NA TABS/APPS
});
