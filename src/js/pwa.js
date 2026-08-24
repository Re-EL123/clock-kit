import { api } from './api.js';
import { el, toast } from './utils/dom.js';
import { TOKEN_KEY, withBase } from './config.js';
import { icon } from './icons.js';
import { playSound } from './sound.js';
import { Modal } from './components/modal.js';

const PUSH_CACHE = 'clock-kit-push';
const INSTALL_DISMISS_KEY = 'ck_install_dismissed_at';
const INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

let deferredPrompt;
let started = false;

export function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isAppleMobile() {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function onKiosk() {
  return location.pathname.includes('/kiosk');
}

function isAndroid() {
  return /android/i.test(navigator.userAgent || '');
}

function pushSupported() {
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

export function needsInstall() {
  return !onKiosk() && !standalone();
}

export function installLabel() {
  if (isAppleMobile() || isAndroid()) return 'Add to Home Screen';
  return deferredPrompt ? 'Install app' : 'Install Clock-Kit';
}

function installDismissed() {
  try {
    const at = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0);
    return Boolean(at) && Date.now() - at < INSTALL_DISMISS_MS;
  } catch {
    return false;
  }
}

function dismissInstall() {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  hideInstallUi();
}

function hideInstallUi() {
  document.querySelectorAll('.pwa-slot').forEach((node) => node.replaceChildren());
  document.querySelectorAll('.ck-install-banner').forEach((node) => node.remove());
  document.querySelector('.ck-install-modal')?.remove();
}

function closeInstallGuide() {
  document.querySelector('.ck-install-modal')?.remove();
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, {
    scope: import.meta.env.BASE_URL,
    updateViaCache: 'none',
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function installSteps() {
  if (isAppleMobile()) {
    return [
      'Tap Share (the square with the arrow).',
      'Tap Add to Home Screen, then Add.',
      'Open Clock-Kit from the Home Screen icon — not from Safari.',
      'In Alerts, tap Enable background alerts and allow notifications.',
    ];
  }
  if (isAndroid()) {
    return [
      'Tap Install app, or open the browser menu and choose Install app / Add to Home screen.',
      'Open Clock-Kit from the Home Screen icon.',
      'In Alerts, tap Enable background alerts and allow notifications.',
    ];
  }
  return [
    'Tap Install Clock-Kit, or use the install icon in the address bar (Chrome or Edge).',
    'Open the installed Clock-Kit app.',
    'In Alerts, tap Enable background alerts and allow notifications.',
  ];
}

export function showInstallGuide() {
  document.querySelector('.more-sheet-backdrop')?.click();
  closeInstallGuide();
  const native = Boolean(deferredPrompt);
  const node = Modal({
    title: isAppleMobile() || isAndroid() ? 'Add to Home Screen' : 'Install Clock-Kit',
    onClose: closeInstallGuide,
    children: [
      el('p', {
        text: 'Install Clock-Kit on this phone, tablet, or computer so alerts still arrive when the app is closed.',
      }),
      el('ol', { class: 'install-steps' }, installSteps().map((step) => el('li', { text: step }))),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', type: 'button', onClick: closeInstallGuide }, ['Close']),
        native
          ? el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: () => promptInstall(),
          }, [icon('plus', { size: 16 }), installLabel()])
          : null,
      ]),
    ],
  });
  node.classList.add('ck-install-modal');
  document.body.append(node);
}

export async function promptInstall() {
  if (standalone()) return { ok: true, installed: true };
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      closeInstallGuide();
      if (choice.outcome === 'accepted') {
        toast('Clock-Kit is installing. Open it from the Home Screen, then enable background alerts.', 'ok');
        return { ok: true };
      }
    } catch {
      deferredPrompt = null;
      showInstallGuide();
      return { ok: false, guided: true };
    }
    fillPwaSlots();
    if (!document.querySelector('.ck-install-banner')) mountInstallBanner();
    return { ok: false };
  }
  showInstallGuide();
  return { ok: false, guided: true };
}

function installButton() {
  return el('button', {
    class: 'btn btn-primary install-btn',
    type: 'button',
    onClick: () => promptInstall(),
  }, [icon(isAppleMobile() ? 'share' : 'smartphone', { size: 16 }), installLabel()]);
}

function renderInstall(slot) {
  if (!slot || !needsInstall() || installDismissed()) return;
  if (slot.classList.contains('pwa-slot-card')) {
    slot.replaceChildren(
      el('p', { class: 'muted', text: 'Add Clock-Kit to your Home Screen so alerts work when you leave the browser.' }),
      installButton(),
    );
    return;
  }
  slot.replaceChildren(installButton());
}

export function fillPwaSlots() {
  document.querySelectorAll('.pwa-slot').forEach(renderInstall);
}

export function mountInstallBanner() {
  document.querySelectorAll('.ck-install-banner').forEach((node) => node.remove());
  if (!needsInstall() || installDismissed()) return;
  const main = document.querySelector('.main');
  if (!main) return;
  const banner = el('div', { class: 'ck-install-banner card', role: 'status' }, [
    el('p', {
      text: 'Install Clock-Kit or add it to your Home Screen so you still get alerts on this phone, tablet, or computer when the app is closed.',
    }),
    el('div', { class: 'btn-row' }, [
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        onClick: () => promptInstall(),
      }, [icon(isAppleMobile() ? 'share' : 'smartphone', { size: 16 }), installLabel()]),
      el('button', {
        class: 'btn',
        type: 'button',
        onClick: dismissInstall,
      }, ['Not now']),
    ]),
  ]);
  const topbar = main.querySelector('.topbar');
  if (topbar) topbar.after(banner);
  else main.prepend(banner);
}

async function rememberVapidKey(publicKey) {
  const cache = await caches.open(PUSH_CACHE);
  await cache.put('vapid-public-key', new Response(publicKey));
}

async function pendingSubscriptionJson() {
  const cache = await caches.open(PUSH_CACHE);
  const res = await cache.match('pending-subscription');
  if (!res) return null;
  const json = await res.json().catch(() => null);
  await cache.delete('pending-subscription');
  return json;
}

async function saveSubscription(json) {
  if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  await api('notifications', 'subscribe', {
    body: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  });
}

async function subscribePush({ interactive = false } = {}) {
  if (!localStorage.getItem(TOKEN_KEY) || onKiosk()) return { ok: false, reason: 'skipped' };
  if (!pushSupported()) {
    if (interactive) toast('This browser cannot receive background alerts.', 'err');
    return { ok: false, reason: 'unsupported' };
  }
  if (isAppleMobile() && !standalone()) {
    if (interactive) showInstallGuide();
    return { ok: false, reason: 'ios-install' };
  }
  try {
    const vapid = await api('notifications', 'vapid-public-key', { body: {} });
    if (!vapid?.enabled || !vapid.publicKey) {
      if (interactive) toast('Background alerts are not configured on the server yet.', 'err');
      return { ok: false, reason: 'vapid' };
    }
    await rememberVapidKey(vapid.publicKey);

    if (Notification.permission === 'denied') {
      if (interactive) toast('Alerts are blocked. Allow notifications for Clock-Kit in your browser or system settings.', 'err');
      return { ok: false, reason: 'denied' };
    }
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (interactive) toast('Allow notifications to get alerts when Clock-Kit is in the background.', 'err');
        return { ok: false, reason: permission };
      }
    }

    const registration = await navigator.serviceWorker.ready;
    const pending = await pendingSubscriptionJson();
    if (pending) await saveSubscription(pending);

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
    }
    await saveSubscription(subscription.toJSON());
    if (interactive) toast('Background alerts are on for this device.', 'ok');
    return { ok: true };
  } catch (err) {
    if (interactive) toast(err.message || 'Could not enable background alerts.', 'err');
    return { ok: false, reason: 'error', error: err };
  }
}

export async function enablePushNotifications() {
  if (isAppleMobile() && !standalone()) {
    showInstallGuide();
    return { ok: false, reason: 'ios-install' };
  }
  return subscribePush({ interactive: true });
}

export async function unsubscribePush() {
  if (!pushSupported() || !navigator.serviceWorker) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    try {
      await api('notifications', 'unsubscribe', { body: { endpoint } });
    } catch {
      /* still drop the local subscription */
    }
    await subscription.unsubscribe();
  } catch {
    /* ignore */
  }
}

export async function pushStatus() {
  if (onKiosk()) {
    return { canEnable: false, canInstall: false, enabled: false, hint: 'The kiosk does not receive personal alerts.' };
  }
  if (!pushSupported() && !isAppleMobile()) {
    return {
      canEnable: false,
      canInstall: needsInstall(),
      enabled: false,
      hint: 'This browser does not support push alerts. Use Chrome, Edge, Firefox, or Safari 16.4+.',
    };
  }
  if (needsInstall()) {
    return {
      canEnable: !isAppleMobile(),
      canInstall: true,
      enabled: false,
      hint: isAppleMobile()
        ? 'Add Clock-Kit to your Home Screen, open it from the icon, then enable alerts. Safari only delivers background alerts from the installed app.'
        : 'Install Clock-Kit or add it to your Home Screen so alerts keep working when you leave the browser. Then enable background alerts.',
    };
  }
  if (Notification.permission === 'denied') {
    return {
      canEnable: false,
      canInstall: false,
      enabled: false,
      hint: 'Alerts are blocked for this site. Allow notifications in your browser or system settings, then return here.',
    };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (Notification.permission === 'granted' && subscription) {
      return {
        canEnable: false,
        canInstall: false,
        enabled: true,
        hint: 'Background alerts are on for this phone, tablet, or computer. You will get them even when Clock-Kit is closed.',
      };
    }
  } catch {
    /* fall through */
  }
  return {
    canEnable: true,
    canInstall: false,
    enabled: false,
    hint: 'Turn on alerts so you still get updates when Clock-Kit is in the background or closed.',
  };
}

export function showLocalNotice(title, body) {
  playSound('notify');
  if (document.visibilityState === 'visible') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notice = new Notification(title, {
      body,
      icon: withBase('assets/logo/clock-kit-icon-192.png'),
      badge: withBase('assets/logo/clock-kit-icon-192.png'),
    });
    setTimeout(() => notice.close(), 5000);
  } catch {
    /* ignore */
  }
}

function handleNavigate(href) {
  if (!href) return;
  const dest = new URL(href, location.href);
  if (dest.origin !== location.origin) return;
  if (dest.pathname === location.pathname) {
    const view = dest.searchParams.get('view');
    if (view) window.dispatchEvent(new CustomEvent('ck:go', { detail: { view } }));
    return;
  }
  location.assign(dest.href);
}

export function startPwa() {
  if (started) return;
  started = true;
  registerServiceWorker().then((registration) => registration?.update?.());
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    fillPwaSlots();
    mountInstallBanner();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    try {
      localStorage.removeItem(INSTALL_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    hideInstallUi();
    toast('Clock-Kit is installed. Open it from the Home Screen, then enable background alerts.', 'ok');
    subscribePush();
  });
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'ck:notify') {
        toast(event.data.title || event.data.body || 'Update', 'notify');
        return;
      }
      if (event.data?.type === 'ck:navigate') {
        handleNavigate(event.data.url);
        return;
      }
      if (event.data?.type === 'ck:push-resubscribe') {
        subscribePush();
      }
    });
  }
  queueMicrotask(() => {
    fillPwaSlots();
    mountInstallBanner();
  });

  const refreshSubscription = () => {
    if (Notification?.permission === 'granted') subscribePush();
    if (standalone()) hideInstallUi();
    else {
      fillPwaSlots();
      if (!document.querySelector('.ck-install-banner')) mountInstallBanner();
    }
  };
  refreshSubscription();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSubscription();
  });
  window.addEventListener('pageshow', refreshSubscription);
  const unlockPush = () => {
    subscribePush();
    document.removeEventListener('pointerdown', unlockPush);
  };
  document.addEventListener('pointerdown', unlockPush, { once: true });
}
