/* IPlanUFollow service worker — offline app shell + font cache. */
const VERSION = 'v2';
const SHELL = `shell-${VERSION}`;
const FONTS = `fonts-`;
const PHOTOS = 'photos-v1';
const MAX_PHOTOS = 200;
const MAP = 'map-v1';
const MAX_MAP = 800; // vector tiles + label glyphs (~20–60 KB each)
const ROUTES = 'routes-v1';
const MAX_ROUTES = 300; // street routes for walk/car legs (~5–30 KB each)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== FONTS && k !== PHOTOS && k !== MAP && k !== ROUTES).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache-first (CSS + font files are immutable per URL).
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Place photos from Wikimedia: cache-first, capped so storage stays small.
  if (url.hostname === 'upload.wikimedia.org' || url.hostname === 'thumb.wikimedia.org') {
    event.respondWith(
      caches.open(PHOTOS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') {
          await cache.put(req, res.clone());
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PHOTOS)).map((k) => cache.delete(k)));
        }
        return res;
      }),
    );
    return;
  }

  // Map data from OpenFreeMap. The tile index (/planet) points at the latest weekly build, so it is
  // network-first; tiles and glyphs are immutable per URL, so cache-first, capped. Areas you've
  // looked at stay viewable offline.
  if (url.origin === 'https://tiles.openfreemap.org') {
    event.respondWith(
      caches.open(MAP).then(async (cache) => {
        if (url.pathname === '/planet') {
          try {
            const res = await fetch(req);
            if (res.ok) await cache.put(req, res.clone());
            return res;
          } catch {
            return (await cache.match(req)) || Response.error();
          }
        }
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_MAP)).map((k) => cache.delete(k)));
        }
        return res;
      }),
    );
    return;
  }

  // Street routes (FOSSGIS OSRM). A route between the same two points rarely changes, so
  // cache-first, capped: revisiting a day costs the routing server nothing and works offline.
  if (url.origin === 'https://routing.openstreetmap.de') {
    event.respondWith(
      caches.open(ROUTES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        let res;
        try {
          res = await fetch(req);
        } catch {
          return Response.error();
        }
        if (res.ok) {
          await cache.put(req, res.clone());
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ROUTES)).map((k) => cache.delete(k)));
        }
        return res;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Pages: network-first so updates arrive quickly; fall back to cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Hashed assets: stale-while-revalidate.
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(req);
      const net = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
