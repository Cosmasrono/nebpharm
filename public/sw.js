// NebTech Pharmacy service worker.
//
// Step 1 of offline support: keep the app shell loadable without internet.
//  - /_next/static, /images, fonts: cache-first (hashed files never change)
//  - page navigations: network-first, falling back to the last saved copy,
//    then to /offline.html
//  - /api/*: untouched. Offline data (products, queued sales) lives in
//    IndexedDB, not here, so a stale API response can never be mistaken
//    for the truth.
//
// Bump VERSION to force every device to drop its caches on the next deploy.

const VERSION = "v2";
const STATIC_CACHE = `nebtech-static-${VERSION}`;
const PAGE_CACHE = `nebtech-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const STATIC_MAX_ENTRIES = 400;
// A flaky connection is worse than none: give the network this long before
// serving the saved page (the network response still refreshes the cache).
const NAV_TIMEOUT_MS = 4000;
const WARM_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/images/icons/icon-192.png",
  "/images/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("nebtech-") && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  // App Router client-side navigations fetch RSC payloads. Let them fail
  // offline: Next.js then falls back to a full page load, which lands in
  // handleNavigation above and gets the saved page.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/manifest.json" ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname)
  );
}

// Pages are keyed by path only, so /pos?order=123 still finds the saved /pos.
function pageKey(url) {
  const u = new URL(url);
  return u.origin + u.pathname;
}

// Only a real page for a logged-in user is worth keeping: never an error,
// and never the login page reached through a redirect.
function isCacheablePage(res) {
  return res && res.ok && res.type === "basic" && !res.redirected;
}

async function handleNavigation(event) {
  const { request } = event;
  const cache = await caches.open(PAGE_CACHE);
  const key = pageKey(request.url);

  const network = fetch(request).then(async (res) => {
    if (isCacheablePage(res)) await cache.put(key, res.clone());
    return res;
  });
  // Keep the service worker alive until the cache write finishes, even when
  // the saved copy wins the race below.
  event.waitUntil(network.catch(() => {}));

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
    // Network is slow: serve the saved copy if there is one, else keep waiting.
    return (await cache.match(key)) || (await network);
  } catch {
    return (await cache.match(key)) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    trimCache(cache, STATIC_MAX_ENTRIES);
  }
  return res;
}

// Every deploy adds new hashed chunks; drop the oldest so the cache can't grow forever.
async function trimCache(cache, max) {
  const keys = await cache.keys();
  const extra = keys.length - max;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

// Save a page plus every script and stylesheet it references, so it can boot
// offline even if this device has never opened it before.
async function warmPage(path) {
  const pages = await caches.open(PAGE_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  // Skip pages saved recently; normal visits keep them fresh anyway.
  const saved = await pages.match(pageKey(new URL(path, self.location.origin)));
  const savedAt = saved ? Date.parse(saved.headers.get("date") || "") : NaN;
  if (Date.now() - savedAt < WARM_MAX_AGE_MS) return;
  const res = await fetch(path, { credentials: "same-origin" });
  if (!isCacheablePage(res)) return;
  const html = await res.clone().text();
  await pages.put(pageKey(res.url), res);
  const assets = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(m[1]);
  await warmAssets(statics, [...assets]);
}

async function warmAssets(cache, urls) {
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {}
    })
  );
}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "WARM") {
    event.waitUntil(
      (async () => {
        const statics = await caches.open(STATIC_CACHE);
        // Chunks the current page loaded before this worker took control.
        await warmAssets(statics, (msg.assets || []).filter((u) => u.startsWith("/_next/static/")));
        for (const path of msg.pages || []) {
          try {
            await warmPage(path);
          } catch {}
        }
      })()
    );
  }
  // Saved pages contain the signed-in user's data; drop them on logout.
  if (msg.type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});
