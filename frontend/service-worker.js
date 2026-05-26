// ================= CACHE VERSION =================
const CACHE_NAME =
  "vryza-cache-v2";

// ================= FILES TO CACHE =================
const urlsToCache = [

  "/",
  "/index.html",
  "/home.html",
  "/chat.html",
  "/profile.html",
  "/auth.html",

  "/style.css",

  "/script.js",
  "/chat.js",
  "/profile.js",
  "/auth.js",

  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/vryza connect.png",
  "/images/default-avatar.png"
];

// ================= INSTALL =================
self.addEventListener(
  "install",
  (event) => {

    console.log(
      "Service Worker Installed"
    );

    event.waitUntil(

      caches.open(
        CACHE_NAME
      ).then((cache) => {

        console.log(
          "Caching files"
        );

        return cache.addAll(
          urlsToCache
        );
      })
    );

    // ACTIVATE IMMEDIATELY
    self.skipWaiting();
  }
);

// ================= ACTIVATE =================
self.addEventListener(
  "activate",
  (event) => {

    console.log(
      "Service Worker Activated"
    );

    event.waitUntil(

      caches.keys().then(
        (cacheNames) => {

          return Promise.all(

            cacheNames.map(
              (cache) => {

                // DELETE OLD CACHE
                if (
                  cache !==
                  CACHE_NAME
                ) {

                  console.log(
                    "Deleting old cache:",
                    cache
                  );

                  return caches.delete(
                    cache
                  );
                }
              }
            )
          );
        }
      )
    );

    // TAKE CONTROL
    self.clients.claim();
  }
);

// ================= FETCH =================
self.addEventListener(
  "fetch",
  (event) => {

    // ONLY CACHE GET REQUESTS
    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }

    event.respondWith(

      caches.match(
        event.request
      ).then(
        (cachedResponse) => {

          // RETURN CACHE
          if (
            cachedResponse
          ) {

            return cachedResponse;
          }

          // FETCH FROM NETWORK
          return fetch(
            event.request
          )

            .then(
              (networkResponse) => {

                // INVALID RESPONSE
                if (
                  !networkResponse ||
                  networkResponse.status !== 200 ||
                  networkResponse.type !== "basic"
                ) {

                  return networkResponse;
                }

                // CLONE RESPONSE
                const responseClone =
                  networkResponse.clone();

                // SAVE TO CACHE
                caches.open(
                  CACHE_NAME
                ).then(
                  (cache) => {

                    cache.put(
                      event.request,
                      responseClone
                    );
                  }
                );

                return networkResponse;
              }
            )

            .catch(() => {

              // OFFLINE FALLBACK
              if (
                event.request.destination ===
                "document"
              ) {

                return caches.match(
                  "/home.html"
                );
              }
            });
        }
      )
    );
  }
);