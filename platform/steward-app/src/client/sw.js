const CACHE_VERSION = "lifeschool-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const sw = /** @type {any} */ (self);

const PRECACHE_URLS = [
  "/",
  "/courses",
  "/learn",
  "/offline.html",
  "/manifest.webmanifest",
  "/styles.css",
  "/learner-nav.css",
  "/courses.css",
  "/learn.css",
  "/theme.js",
  "/i18n.js",
  "/i18n-entry.js",
  "/homepage.js",
  "/learn.js",
  "/lesson-page.js",
  "/lesson-renderer.js",
  "/curriculum-lessons.js",
  "/thinking-clearly-lessons.js",
  "/thinking-clearly-lessons-el.js",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon-180.png",
  "/pwa/apple-splash-2048x2732.png",
  "/lifeschool-logo.svg",
  "/favicon.svg",
  "/i18n/locales/en.json",
  "/i18n/locales/el.json",
];

sw.addEventListener("install", /** @param {any} event */ (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  sw.skipWaiting();
});

sw.addEventListener("activate", /** @param {any} event */ (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name !== STATIC_CACHE && name !== PAGE_CACHE)
        .map((name) => caches.delete(name)),
    );
    await sw.clients.claim();
  })());
});

sw.addEventListener("message", /** @param {any} event */ (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    sw.skipWaiting();
  }
});

/** @param {Request} request */
async function networkFirstPage(request) {
  const pageCache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await pageCache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedPage = await pageCache.match(request);
    if (cachedPage !== undefined) return cachedPage;

    if (new URL(request.url).pathname === "/") {
      const staticCache = await caches.open(STATIC_CACHE);
      const home = await staticCache.match("/");
      if (home !== undefined) return home;
    }

    const offline = await caches.match("/offline.html");
    return offline ?? new Response("Offline", { status: 503 });
  }
}

/** @param {Request} request */
async function staleWhileRevalidate(request) {
  const staticCache = await caches.open(STATIC_CACHE);
  const cached = await staticCache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) {
        void staticCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached !== undefined) {
    void refresh;
    return cached;
  }

  const network = await refresh;
  return network ?? new Response("Offline", { status: 503 });
}

/** @param {Request} request */
async function networkFirstStatic(request) {
  const staticCache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await staticCache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await staticCache.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}

function offlineApiResponse() {
  return new Response(
    JSON.stringify({
      error: { code: "OFFLINE" },
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

sw.addEventListener("fetch", /** @param {any} event */ (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore browser-generated only-if-cached probes that are invalid with non-same-origin mode.
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  if (request.method !== "GET") {
    if (url.origin === sw.location.origin && url.pathname === "/api/message") {
      event.respondWith(fetch(request).catch(() => offlineApiResponse()));
    }
    return;
  }

  if (url.origin !== sw.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith("/i18n/locales/")) {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
