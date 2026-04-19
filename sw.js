const CACHE_NAME = "feur-events-v7.6.7";

const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./images/feurlogo.png",
  "./css/components/base.css",
  "./css/components/layout.css",
  "./css/components/components.css",
  "./css/components/admin.css",
  "./css/components/help.css",
  "./css/components/maps.css",
  "./css/components/signinup.css",
  "./js/modules/main.js",
  "./js/modules/api.js",
  "./js/modules/auth.js",
  "./js/modules/state.js",
  "./js/modules/ui.js",
  "./js/modules/admin.js",
  "./pages/admin.html",
  "./pages/signin.html",
  "./pages/signup.html",
  "./pages/help.html",
  "./pages/maps.html",
  "./pages/orderlist.html",
  "./pages/scanner.html",
  "./pages/reset-password.html",
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
