// ================= CACHE VERSION =================
const CACHE_NAME = "vryza-cache-v4";
const API_ORIGIN = "https://vryza-connect-backend-1.onrender.com";

// ================= FILES TO CACHE =================
const urlsToCache = [
  "./",
  "index.html",
  "home.html",
  "chat.html",
  "friends.html",
  "profile.html",
  "auth.html",
  "settings.html",
  "user.html",
  "admin.html",

  "style.css",

  "script.js",
  "admin.js",
  "chat.js",
  "authcheck.js",
  "profile.js",
  "auth.js",
  "loggin.js",
  "settings.js",

  "images/icon-192.png",
  "images/icon-512.png",
  "images/vryza connect.png"
];

// ================= INSTALLATION =================
self.addEventListener("install", (event) => {
  console.log("⚙️ Service Worker: Installing Assets...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Service Worker: Pre-caching static core shells");
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.warn(`⚠️ Failed to cache asset: ${url}`, err));
        })
      );
    })
  );

  self.skipWaiting();
});

// ================= ACTIVATION =================
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker: Activated Successfully.");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("🗑️ Deleting legacy structural cache store:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// ================= FETCH PASS THROUGH INTERCEPTOR =================
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Dynamic live server endpoints & WebSockets bypass cache
  if (requestUrl.origin === API_ORIGIN || requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse || 
            networkResponse.status !== 200 || 
            (networkResponse.type !== "basic" && networkResponse.type !== "cors")
          ) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          if (event.request.destination === "document") {
            return caches.match("home.html") || caches.match("./");
          }
        });
    })
  );
});