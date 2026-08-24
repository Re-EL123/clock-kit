const BASE = new URL('./', self.location).pathname;
const CACHE = 'clock-kit-shell-v4';
const SHELL = [
  '',
  'login.html',
  'offline.html',
  'candidate/',
  'admin/',
  'organisation/',
  'host/',
  'kiosk/',
  'splash.css',
  'splash-boot.js',
  'manifest.webmanifest',
  'assets/logo/clock-kit-mark.svg',
  'assets/logo/clock-kit-light.svg',
  'assets/logo/clock-kit-icon-180.png',
  'assets/logo/clock-kit-icon-192.png',
  'assets/logo/clock-kit-icon-512.png',
].map((path) => `${BASE}${path}`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/service-worker.js')) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match(`${BASE}offline.html`))),
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Clock-Kit', body: 'You have an update', url: `${BASE}candidate/` };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = windows.find((client) => client.visibilityState === 'visible' || client.focused);
    if (visible) {
      visible.postMessage({ type: 'ck:notify', title: data.title, body: data.body });
      return;
    }
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: `${BASE}assets/logo/clock-kit-icon-192.png`,
      badge: `${BASE}assets/logo/clock-kit-icon-192.png`,
      lang: 'en',
      tag: data.tag || 'clock-kit',
      renotify: true,
      data: { url: data.url || `${BASE}candidate/` },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || `${BASE}candidate/`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.includes(self.location.origin));
      if (existing && 'focus' in existing) {
        existing.navigate?.(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
