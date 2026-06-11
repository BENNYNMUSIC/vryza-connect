// ================= CACHE VERSION =================
const CACHE_NAME = "vryza-cache-v3"; // Incremented version to force clear old caches
const API_ORIGIN = "https://vryza-connect-backend-production.up.railway.app";

// ================= FILES TO CACHE =================
// Fixed: Relative paths (no leading slashes) ensure compatibility with GitHub Pages subfolders
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
  "images/vryza connect.png",
  "images/default-avatar.png"
];

// ================= INSTALLATION =================
self.addEventListener("install", (event) => {
  console.log("⚙️ Service Worker: Installing Assets...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Service Worker: Pre-caching static core shells");
      // Using map inside Promise.all prevents one missing file from breaking the whole install
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.warn(`⚠️ Failed to cache asset: ${url}`, err));
        })
      );
    })
  );

  // Activate immediately without requiring a manual page refresh
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

  // Instantly seize control of all active clients/open browser tabs
  self.clients.claim();
});

// ================= FETCH PASS THROUGH INTERCEPTOR =================
self.addEventListener("fetch", (event) => {
  // 1. STRATEGY Bypass: Only intercept standard GET transactions
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // 2. STRATEGY Bypass: Let live real-time API or WebSocket data bypass caching completely
  if (requestUrl.origin === API_ORIGIN || requestUrl.pathname.startsWith("/api/")) {
    return; // Dynamic API database content must always be handled directly via live server
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return local cache immediately if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fall back to live network connection
      return fetch(event.request)
        .then((networkResponse) => {
          // FIXED: Allow 'cors' types so your cross-origin uploads and files work correctly
          if (
            !networkResponse || 
            networkResponse.status !== 200 || 
            (networkResponse.type !== "basic" && networkResponse.type !== "cors")
          ) {
            return networkResponse;
          }

          // Clone response stream since it can only be read once
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // OFFLINE FALLBACK ENGINE
          // Fixed: Fallback paths changed to relative matching configuration 
          if (event.request.destination === "document") {
            return caches.match("home.html") || caches.match("./");
          }
        });
    })
  );
});