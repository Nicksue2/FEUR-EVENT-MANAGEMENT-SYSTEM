const CACHE_NAME = "feur-events-v2";
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

// Install: I-save ang mga files sa cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

// Fetch: Kapag walang internet, kunin ang files sa cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Ibigay ang cached file kung meron, kundi, kumuha sa internet
      return response || fetch(event.request);
    }),
  );
});
