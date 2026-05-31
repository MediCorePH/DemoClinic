// MediCore Clinic — Service Worker
// Bump CACHE_NAME whenever you deploy changes so clients pick up the new files.
const CACHE_NAME = 'medicore-v1';

// App shell. Paths are relative so this works on GitHub Pages project sites
// (e.g. https://user.github.io/repo/) as well as custom domains.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll fails the whole install if any file 404s; add individually instead.
      return Promise.all(
        ASSETS.map(function (url) {
          return cache.add(url).catch(function () { /* ignore missing optional asset */ });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;

  // Only handle GET.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache the Google Apps Script backend or any cross-origin request.
  // Let those go straight to the network so live data is always fresh.
  if (url.origin !== self.location.origin) return;

  // App shell: cache-first, then network, then offline fallback to index.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req)
        .then(function (res) {
          // Cache same-origin static files as they're fetched.
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
          }
          return res;
        })
        .catch(function () {
          // Navigation request offline -> serve cached index.
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
