const BASE = new URL('./', self.location).pathname;
const CACHE = 'clock-kit-shell-v10';
const PUSH_CACHE = 'clock-kit-push';
const PRECACHE = []; // __CK_PRECACHE__
const SHELL = [
  '',
  'index.html',
  'login.html',
  'offline.html',
  'terms.html',
  'privacy.html',
  'candidate/',
  'admin/',
  'organisation/',
  'host/',
  'kiosk/',
  'splash.css',
  'splash-boot.js',
  'manifest.webmanifest',
  'assets/logo/clock-kit-icon.svg',
  'assets/logo/clock-kit-text.svg',
  'assets/logo/clock-kit-full-logo.svg',
  'assets/logo/clock-kit-mark.svg',
  'assets/logo/clock-kit-light.svg',
  'assets/logo/clock-kit-icon-180.png',
  'assets/logo/clock-kit-icon-192.png',
  'assets/logo/clock-kit-icon-512.png',
].map((path) => `${BASE}${path}`);

function isLaunchPath(pathname) {
  const trimmed = BASE.replace(/\/$/, '') || '/';
  return pathname === BASE || pathname === trimmed || pathname === `${BASE}index.html`;
}

function loginUrl() {
  return `${BASE}login.html`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = [...new Set([...SHELL, ...PRECACHE])];
    await Promise.all(urls.map((url) => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== PUSH_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/service-worker.js')) return;

  const navigate = req.mode === 'navigate';
  if (navigate && isLaunchPath(url.pathname)) {
    event.respondWith(Response.redirect(new URL(loginUrl(), self.location.origin), 302));
    return;
  }

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      if (navigate && !res.ok) {
        return (await caches.match(loginUrl()))
          || (await caches.match(`${BASE}offline.html`))
          || res;
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (navigate) {
        return (await caches.match(loginUrl()))
          || (await caches.match(`${BASE}offline.html`));
      }
      return Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Clock-Kit', body: 'You have an update', url: loginUrl() };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  const target = data.url || loginUrl();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows
      .filter((client) => client.visibilityState === 'visible')
      .forEach((client) => client.postMessage({ type: 'ck:notify', title: data.title, body: data.body, url: target }));
    await self.registration.showNotification(data.title || 'Clock-Kit', {
      body: data.body || 'You have an update',
      icon: `${BASE}assets/logo/clock-kit-icon-192.png`,
      badge: `${BASE}assets/logo/clock-kit-icon-192.png`,
      lang: 'en',
      tag: data.tag || 'clock-kit',
      renotify: true,
      vibrate: [120, 60, 120],
      timestamp: Date.now(),
      data: { url: target },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || loginUrl();
  event.waitUntil((async () => {
    const dest = new URL(target, self.location.origin);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const samePanel = windows.find((client) => {
      try {
        const url = new URL(client.url);
        return url.origin === dest.origin && url.pathname === dest.pathname;
      } catch {
        return false;
      }
    });
    const existing = samePanel || windows[0];
    if (existing) {
      existing.postMessage({ type: 'ck:navigate', url: dest.href });
      return existing.focus();
    }
    return self.clients.openWindow(dest.href);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PUSH_CACHE);
    const keyRes = await cache.match('vapid-public-key');
    if (!keyRes) return;
    const publicKey = await keyRes.text();
    if (!publicKey) return;
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await cache.put('pending-subscription', new Response(JSON.stringify(subscription.toJSON())));
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({ type: 'ck:push-resubscribe' }));
  })());
});
