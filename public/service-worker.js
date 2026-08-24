const BASE = new URL('./', self.location).pathname;
const CACHE = 'clock-kit-shell-v2';
const SHELL = ['', 'login.html', 'offline.html', 'candidate/', 'assets/logo/clock-kit-mark.svg'].map(
  (path) => `${BASE}${path}`,
);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match(`${BASE}offline.html`))),
  );
});
