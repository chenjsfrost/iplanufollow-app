/* IPlanUFollow service worker — offline app shell, photos, map tiles and street routes. */
// The build (vite.config.ts) fills in the app's JS and CSS files and a version from their names,
// so one visit is enough to work offline and each deploy replaces the previous files.
const ASSETS = ["./assets/400-B64NE0zQ.css","./assets/400-BS5ZzyWr.css","./assets/400-BypzZ9oW.css","./assets/500-CQ7ujxxp.css","./assets/600-BbBzRlKk.css","./assets/600-CWzUIj3-.css","./assets/600-CasQMHw6.css","./assets/600-D4jwdYIB.css","./assets/600-Dy6pH2BK.css","./assets/600-HD9x7Lgs.css","./assets/600-UvDx4yN3.css","./assets/600-h4e430kf.css","./assets/700-C3dMrQH5.css","./assets/700-CU3pglbG.css","./assets/700-Do9gr8HN.css","./assets/700-FXZ5Usii.css","./assets/700-iDM42Kiu.css","./assets/800-BVn38vu4.css","./assets/800-D45Dn2k6.css","./assets/800-TjBlNPqs.css","./assets/800-yZeicKDW.css","./assets/800-zbzzpFpI.css","./assets/900-BiEMUlwo.css","./assets/TwemojiCountryFlags-Bymva2JV.woff2","./assets/australia-B8JgYegc.js","./assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","./assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","./assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","./assets/dm-sans-latin-ext-400-normal-BtiwyxMk.woff2","./assets/dm-sans-latin-ext-500-normal-BJfUCQsA.woff2","./assets/dm-sans-latin-ext-700-normal-CJIcxD6K.woff2","./assets/engine-DC7Rjstz.js","./assets/engine-rbBjNiKD.css","./assets/enrichment-CdKKh0nM.js","./assets/food-australia-D2ErKcet.js","./assets/food-checks-BU_cdCTz.js","./assets/food-dishes-DbGOxhkc.js","./assets/food-france-Cay-wOne.js","./assets/food-hong-kong-CdKLwW4g.js","./assets/food-iceland-DzhVkqUR.js","./assets/food-indonesia-O1fdwJ03.js","./assets/food-italy-CKdLRGGv.js","./assets/food-japan-B0ygFix_.js","./assets/food-malaysia-C6Ff6hTf.js","./assets/food-new-zealand-CDxjfgFo.js","./assets/food-singapore-G2PrjRQD.js","./assets/food-south-korea-CUezEXhL.js","./assets/food-spain-B_EZa10Q.js","./assets/food-switzerland-KTL9m7JW.js","./assets/food-taiwan-BfYMBU8T.js","./assets/food-thailand-CPMOqqs_.js","./assets/food-turkey-BZX_xkEv.js","./assets/food-united-arab-emirates-CuPeIEk9.js","./assets/food-united-kingdom-DUfYBUc_.js","./assets/food-united-states-D7U90Lnc.js","./assets/food-vietnam-Bq_ecs_p.js","./assets/france-wxP-Ynqp.js","./assets/fraunces-latin-600-normal-BFCDtZfi.woff2","./assets/fraunces-latin-800-normal-5RM8DebB.woff2","./assets/fraunces-latin-ext-600-normal-BtzmzP0X.woff2","./assets/fraunces-latin-ext-800-normal-DYQACqvw.woff2","./assets/fraunces-vietnamese-600-normal-BjlAJixd.woff2","./assets/fraunces-vietnamese-800-normal-B5-KC0PG.woff2","./assets/hong-kong-B8AJaAap.js","./assets/iceland-BwcPgkgz.js","./assets/index-C2TOmvVz.js","./assets/index-DJYVH5j4.css","./assets/indonesia-CUqVv9dH.js","./assets/italy-Cq87X35A.js","./assets/japan-CwOSbd-8.js","./assets/malaysia-DJ0mFVzI.js","./assets/maplibre-gl-worker-utlGVMLk.js","./assets/new-zealand-DYZ8CnLW.js","./assets/phrases-BjOd-IOb.js","./assets/singapore-C0JqHLwR.js","./assets/south-korea-Cuq0pJgf.js","./assets/spain-Dv2iETLw.js","./assets/switzerland-DqDYpP8L.js","./assets/taiwan-Cjujo_RP.js","./assets/thailand-D85SbFbK.js","./assets/turkey-w8BR12zm.js","./assets/united-arab-emirates-TavXLD8z.js","./assets/united-kingdom-CmTB-I3x.js","./assets/united-states-CLzZvo4K.js","./assets/vietnam-B7mKKz5s.js"];
const VERSION = '4733e3ec8b';
// All caches are prefixed: other apps on the same origin (github.io) keep theirs.
const SHELL = `iplanufollow-shell-${VERSION}`;
const PHOTOS = 'iplanufollow-photos';
const MAP = 'iplanufollow-map';
const ROUTES = 'iplanufollow-routes';
const OURS = [SHELL, PHOTOS, MAP, ROUTES];
// Names used before the prefix.
const LEGACY = /^(shell-v\d+|photos-v1|map-v1|routes-v1)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then(async (c) => {
      await c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg']);
      // Best effort: a missing file mustn't stop the app shell from installing.
      await Promise.all(ASSETS.map((a) => c.add(a).catch(() => undefined)));
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('iplanufollow-') && !OURS.includes(k)) || LEGACY.test(k)).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

/** Cache-first, keeping at most `max` entries (oldest out). `load` fetches on a miss. */
function cacheFirst(name, max, req, load = () => fetch(req)) {
  return caches.open(name).then(async (cache) => {
    // Saved ahead by "Save for offline" (a CORS fetch), read back by an <img> or the map: ignore Vary.
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    const res = await load();
    if (res.ok) {
      await cache.put(req, res.clone());
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
    }
    return res;
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Place photos from Wikimedia. Fetched with CORS so only real images are kept: browsers count each
  // opaque response as megabytes of storage.
  if (url.hostname === 'upload.wikimedia.org' || url.hostname === 'thumb.wikimedia.org') {
    event.respondWith(cacheFirst(PHOTOS, 400, req, () => fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req))));
    return;
  }

  // Map data from OpenFreeMap. The tile index (/planet) points at the latest weekly build, so it is
  // network-first; tiles and glyphs are immutable per URL, so cache-first (~20–60 KB each). Areas
  // you've looked at stay viewable offline.
  if (url.origin === 'https://tiles.openfreemap.org') {
    if (url.pathname !== '/planet') {
      event.respondWith(cacheFirst(MAP, 1500, req));
      return;
    }
    event.respondWith(
      caches.open(MAP).then(async (cache) => {
        try {
          const res = await fetch(req);
          if (res.ok) await cache.put(req, res.clone());
          return res;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      }),
    );
    return;
  }

  // Street routes (FOSSGIS OSRM). A route between the same two points rarely changes, so
  // cache-first: revisiting a day costs the routing server nothing and works offline.
  // Routes from the traveller's own position are sent with cache: 'no-store' and never kept here.
  if (url.origin === 'https://routing.openstreetmap.de') {
    if (req.cache === 'no-store') return;
    event.respondWith(cacheFirst(ROUTES, 300, req, () => fetch(req).catch(() => Response.error())));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Pages: network-first so updates arrive quickly; fall back to cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only the real app page becomes the offline shell (never a 404 or an error page).
          const type = res.headers.get('content-type') || '';
          if (res.ok && res.type === 'basic' && type.includes('text/html')) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Hashed assets: stale-while-revalidate.
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      // Precached without the Origin header a module script request carries: ignore Vary.
      const hit = await cache.match(req, { ignoreVary: true });
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
