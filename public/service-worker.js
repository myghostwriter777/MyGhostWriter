/* GhostwriterMe service worker (v1)
 *
 * Strategy (deliberately conservative so nothing about payments/auth breaks):
 *  - NAVIGATIONS (loading the app itself): network-first, fall back to the
 *    last cached index.html only when offline. Network-first means a new
 *    Vercel deploy is picked up immediately — no stale-app bug reports.
 *  - STATIC ASSETS (/static/*, icons): cache-first. CRA fingerprints these
 *    filenames (main.abc123.js), so serving from cache is always safe.
 *  - EVERYTHING ELSE (/api/*, api.stripe.com, accounts.google.com, Supabase):
 *    NOT intercepted at all. The fetch handler returns early, so payments,
 *    OAuth and history sync behave exactly as they do today.
 */

const CACHE_VERSION = "gwm-v2"; // bump this string to force-refresh old caches

self.addEventListener("install", (event) => {
  // Pre-cache the app shell so offline fallback works from first install.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(["/", "/manifest.json"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Edge case: delete caches from previous versions so storage doesn't grow forever.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1) Never touch non-GET requests (Stripe POSTs, Claude proxy calls, etc.)
  if (event.request.method !== "GET") return;

  // 2) Never touch cross-origin requests (Stripe JS, Google Identity, Supabase)
  //    or our own serverless API — always straight to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // 3) Navigations: network-first with offline fallback to cached shell.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Keep the freshest shell for offline use.
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // 4) Static assets: cache-first, populate cache on first fetch.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // Edge case: only cache successful, basic (same-origin) responses.
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
