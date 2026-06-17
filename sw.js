// ---- CoreLift Service Worker ----
// Bump CACHE_VERSION any time you ship a change to index.html (or any cached
// asset). That forces every client to fetch fresh files and clears old caches.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `corelift-cache-${CACHE_VERSION}`;

// Files that make up the installable app shell.
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// --- INSTALL: pre-cache the app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// --- ACTIVATE: delete any caches from older versions ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('corelift-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- FETCH: network-first for navigation/HTML, cache-first for everything else ---
// Network-first on the HTML page means you'll get the latest version whenever
// you're online, while still falling back to the cached copy when offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return networkResponse;
      });
    })
  );
});

// --- MESSAGE: allow the page to trigger an immediate activation of a waiting SW ---
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
