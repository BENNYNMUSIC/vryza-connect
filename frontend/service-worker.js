const CACHE_NAME = "vryza-cache-v1";

const urlsToCache = [
  "/",
  "/home.html",
  "/style.css",
  "/script.js",
  "/images/icon-192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});