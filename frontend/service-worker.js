// ======================================================
// VRYZA+ SERVICE WORKER
//  - Pages / scripts / styles: network-first (you always get your latest deploy),
//    cached copy used when offline or the network is slow.
//  - Images & icons: cache-first.   CDN libraries (Tailwind, Socket.IO, fonts): stale-while-revalidate.
//  - API, uploads and sockets are NEVER cached.
//  - Updates wait until the user taps "Refresh" (so a call or stream is never cut off).
// ======================================================
const VERSION = "v8";
const STATIC_CACHE = `vryza-static-${VERSION}`;
const RUNTIME_CACHE = `vryza-runtime-${VERSION}`;
const API_ORIGIN = "https://vryza-connect-backend-1.onrender.com";
const NETWORK_TIMEOUT_MS = 4000;
const MAX_RUNTIME_ENTRIES = 120;

const CDN_HOSTS = [
  "cdn.tailwindcss.com",
  "cdn.jsdelivr.net",
  "cdn.socket.io",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

// Files that make the app open offline. Missing files are skipped, not fatal.
const PRECACHE = [
  "./",
  "offline.html",
  "manifest.json",
  // pages
  "home.html", "chat.html", "friends.html", "profile.html", "user.html", "settings.html",
  "notifications.html", "admin.html", "live.html", "live-viewer.html", "live-studio.html",
  "auth.html", "index.html",
  // scripts
  "theme.js", "script.js", "chat.js", "profile.js", "settings.js", "admin.js", "callmanager.js",
  "friendbadge.js", "chatBadge.js", "notificationbadge.js", "live.js", "live-viewer.js", "live-studio.js", "sw-register.js",
  // images
  "images/icon-192.png", "images/icon-512.png", "images/icon-maskable-192.png",
  "images/icon-maskable-512.png", "images/apple-touch-icon.png",
  "images/vryza-connect.png", "images/vryza connect.png"
];

// ================= INSTALL =================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.warn("SW: skipped (not found):", url, err && err.message);
          })
        )
      )
    )
  );
  // No skipWaiting() here: a new version waits until the user chooses to refresh.
});

// ================= ACTIVATE =================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("vryza-") && name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// The page asks for the update once the user taps "Refresh".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ================= HELPERS =================
async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    if (cacheName === RUNTIME_CACHE) {
      const keys = await cache.keys();
      if (keys.length > MAX_RUNTIME_ENTRIES) {
        await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES).map((k) => cache.delete(k)));
      }
    }
  } catch (err) {
    // storage full or unsupported response: ignore, the network response still works
  }
}

function cacheable(response, allowOpaque) {
  if (!response) return false;
  if (response.redirected) return false;                       // redirected responses break navigations
  if (response.ok) return true;
  return !!allowOpaque && response.type === "opaque";          // CDN scripts loaded without CORS
}

function networkFirst(request, { ignoreSearch = false, cacheName = STATIC_CACHE } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res) => { if (!settled && res) { settled = true; resolve(res); } };
    const fromCache = () => caches.match(request, { ignoreSearch });

    const timer = setTimeout(async () => finish(await fromCache()), NETWORK_TIMEOUT_MS);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        if (cacheable(response, false)) putInCache(cacheName, request, response.clone());
        if (!settled) { settled = true; resolve(response); }
      })
      .catch(async () => {
        clearTimeout(timer);
        const cached = await fromCache();
        if (!settled) { settled = true; resolve(cached || null); }
      });
  });
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response, false)) putInCache(RUNTIME_CACHE, request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (cacheable(response, true)) putInCache(RUNTIME_CACHE, request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await refresh) || Response.error();
}

// ================= FETCH =================
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;                    // video/audio seeking goes straight to the network

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Live data is never cached: API, uploads, sockets, streams.
  if (url.origin === API_ORIGIN) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/") || url.pathname.startsWith("/live/")) return;

  // Third-party libraries and fonts
  if (url.origin !== self.location.origin) {
    if (CDN_HOSTS.includes(url.hostname)) event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Page navigations: freshest page, cached copy offline, friendly offline screen last
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, { ignoreSearch: true }).then(
        (res) => res || caches.match("offline.html") || Response.error()
      )
    );
    return;
  }

  // Images, icons, fonts: cache-first
  if (["image", "font"].includes(request.destination)) {
    event.respondWith(cacheFirst(request).catch(() => Response.error()));
    return;
  }

  // Scripts, styles, manifest, everything else same-origin: network-first
  event.respondWith(
    networkFirst(request, { cacheName: RUNTIME_CACHE }).then((res) => res || Response.error())
  );
});

// ================= PUSH NOTIFICATIONS (ready for when the server sends them) =================
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || "Vryza+", {
      body: data.body || "You have a new notification",
      icon: "images/icon-192.png",
      badge: "images/icon-192.png",
      tag: data.tag || "vryza",
      data: { url: data.url || "notifications.html" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "home.html", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
