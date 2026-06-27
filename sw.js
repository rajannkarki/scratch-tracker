/* The Pattern — service worker (app-shell cache for offline use) */
const CACHE = 'the-pattern-v12';
const ASSETS = [
  './',
  './index.html',
  './prizes.html',
  './admin.html',
  './css/style.css?v=12',
  './js/firebase-config.js?v=12',
  './js/games.js?v=12',
  './js/auth.js?v=12',
  './js/tracker.js?v=12',
  './js/ui.js?v=12',
  './js/app.js?v=12',
  './js/prizes-page.js?v=12',
  './js/admin.js?v=12',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests. Let Firebase / Google / CDN traffic
  // go straight to the network so live data is never served stale.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
