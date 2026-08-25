import { api } from './api.js';
import { el, toast } from './utils/dom.js';
import { TOKEN_KEY, withBase } from './config.js';
import { icon } from './icons.js';
import { playSound } from './sound.js';
import { Modal } from './components/modal.js';
import { alertsEnabledHint, detectDevice, installGuide, shouldAskNotificationPermission } from './device.js';
import {
  clearInstalledMemory,
  displayModeInstalled,
  installAndAlertFlags,
  isAppInstalled,
  markInstalled,
  relatedAppsInstalled,
  rememberedInstalled,
} from './pwa-display.js';

const PUSH_CACHE = 'clock-kit-push';
const INSTALL_DISMISS_KEY = 'ck_install_dismissed_at';
const INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

let deferredPrompt;
let started = false;
let listeningForInstall = false;

export function standalone() {
  return displayModeInstalled();
}

export function isAppleMobile() {
  return detectDevice().ios;
}

function onKiosk() {
  return location.pathname.includes('/kiosk');
}

function pushSupported() {
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

export function currentInstallGuide() {
  return installGuide(detectDevice(), { hasNativePrompt: Boolean(deferredPrompt) });
}

export function needsInstall() {
  return !onKiosk() && !isAppInstalled();
}

export function installLabel() {
  return currentInstallGuide().label;
}

export function installIconName() {
  return currentInstallGuide().icon || 'smartphone';
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

function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function canAskNotifications() {
  return shouldAskNotificationPermission(detectDevice(), {
    standalone: standalone(),
    permission: notificationPermission(),
  });
}

async function askNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  if (!shouldAskNotificationPermission(detectDevice(), {
    standalone: standalone(),
    permission: 'default',
  })) {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function onBeforeInstallPrompt(event) {
  if (displayModeInstalled()) {
    event.preventDefault();
    markInstalled();
    hideInstallUi();
    return;
  }
  if (rememberedInstalled()) clearInstalledMemory();
  event.preventDefault();
  deferredPrompt = event;
  fillPwaSlots();
  if (document.querySelector('.main') && !document.querySelector('.ck-install-banner')) {
    mountInstallBanner();
  }
}

function listenForInstallPrompt() {
  if (listeningForInstall || typeof window === 'undefined') return;
  listeningForInstall = true;
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
}

export function showInstallGuide() {
  document.querySelector('.more-sheet-backdrop')?.click();
  closeInstallGuide();
  const guide = currentInstallGuide();
  const askAlerts = canAskNotifications();
  const node = Modal({
    title: guide.title,
    onClose: closeInstallGuide,
    children: [
      el('p', { class: 'install-detected muted', text: `Detected: ${guide.detected}` }),
      el('p', { class: 'install-summary', text: guide.summary }),
      el('ol', { class: 'install-steps' }, guide.steps.map((step) => el('li', { text: step }))),
      guide.note ? el('p', { class: 'install-note muted', text: guide.note }) : null,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', type: 'button', onClick: closeInstallGuide }, ['Close']),
        askAlerts
          ? el('button', {
            class: guide.canNativePrompt ? 'btn' : 'btn btn-primary',
            type: 'button',
            onClick: () => enablePushNotifications().then(() => closeInstallGuide()),
          }, [icon('bell', { size: 16 }), 'Allow notifications'])
          : null,
        guide.canNativePrompt
          ? el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: () => promptInstall(),
          }, [icon(guide.icon, { size: 16 }), guide.label])
          : null,
      ]),
    ],
  });
  node.classList.add('ck-install-modal');
  document.body.append(node);
}

export async function promptInstall() {
  if (standalone()) {
    return subscribePush({ interactive: true });
  }

  let outcomePromise = Promise.resolve(null);
  const promptEvent = deferredPrompt;
  if (promptEvent?.prompt) {
    try {
      promptEvent.prompt();
      deferredPrompt = null;
      outcomePromise = promptEvent.userChoice.then((choice) => choice?.outcome || null);
    } catch {
      deferredPrompt = null;
      outcomePromise = Promise.resolve('error');
    }
  }

  const permissionPromise = askNotificationPermission();
  const [outcome, permission] = await Promise.all([outcomePromise, permissionPromise]);
  closeInstallGuide();
  if (permission === 'granted') await subscribePush({ interactive: false });

  if (outcome === 'accepted') {
    markInstalled();
    toast(
      permission === 'granted'
        ? 'Clock-Kit is installing. Notifications are allowed on this device.'
        : 'Clock-Kit is installing. Allow notifications if the browser still asks.',
      'ok',
    );
    hideInstallUi();
    return { ok: true, installed: true, permission };
  }

  if (!outcome || outcome === 'error') {
    showInstallGuide();
    if (permission === 'granted') {
      toast('Notifications are allowed. Follow the steps to put Clock-Kit on this device.', 'ok');
    } else if (permission === 'denied') {
      toast('Notifications were blocked. You can allow Clock-Kit in the browser settings.', 'err');
    }
    return { ok: false, guided: true, permission };
  }

  fillPwaSlots();
  if (!document.querySelector('.ck-install-banner')) mountInstallBanner();
  if (permission === 'granted') {
    toast('Notifications are allowed. You can still install Clock-Kit from the button or browser menu.', 'ok');
  }
  return { ok: false, dismissed: true, permission };
}

function installButton() {
  const guide = currentInstallGuide();
  return el('button', {
    class: 'btn btn-primary install-btn',
    type: 'button',
    onClick: () => promptInstall(),
  }, [icon(guide.icon, { size: 16 }), guide.label]);
}

function renderInstall(slot) {
  if (!slot || !needsInstall() || installDismissed()) return;
  const guide = currentInstallGuide();
  if (slot.classList.contains('pwa-slot-card')) {
    slot.replaceChildren(
      el('p', { class: 'muted', text: guide.summary }),
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
  if (new URLSearchParams(location.search).get('view') === 'notifications') return;
  const main = document.querySelector('.main');
  if (!main) return;
  const guide = currentInstallGuide();
  const banner = el('div', { class: 'ck-install-banner card', role: 'status' }, [
    el('p', { text: guide.summary }),
    el('div', { class: 'btn-row' }, [
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        onClick: () => promptInstall(),
      }, [icon(guide.icon, { size: 16 }), guide.label]),
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
      if (!interactive) return { ok: false, reason: 'permission' };
      const permission = await askNotificationPermission();
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
    if (interactive) toast(alertsEnabledHint(detectDevice()), 'ok');
    return { ok: true };
  } catch (err) {
    if (interactive) toast(err.message || 'Could not enable background alerts.', 'err');
    return { ok: false, reason: 'error', error: err };
  }
}

export async function enablePushNotifications() {
  if (detectDevice().operaMini) {
    showInstallGuide();
    return { ok: false, reason: 'opera-mini' };
  }
  if (isAppleMobile() && !standalone()) {
    showInstallGuide();
    return { ok: false, reason: 'ios-install' };
  }
  const permission = await askNotificationPermission();
  if (permission !== 'granted') {
    if (permission === 'denied') {
      toast('Alerts are blocked. Allow notifications for Clock-Kit in your browser or system settings.', 'err');
    } else {
      toast('Allow notifications to get alerts when Clock-Kit is in the background.', 'err');
    }
    return { ok: false, reason: permission };
  }
  const result = await subscribePush({ interactive: true });
  if (result.reason === 'skipped') {
    toast('Notifications are allowed for Clock-Kit on this browser.', 'ok');
    return { ok: true, permission: 'granted', subscribed: false };
  }
  return result;
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
  const device = detectDevice();
  const guide = currentInstallGuide();
  const installNeeded = needsInstall();
  if (onKiosk()) {
    return { canEnable: false, canInstall: false, enabled: false, hint: 'The kiosk does not receive personal alerts.' };
  }
  if (device.operaMini) {
    return {
      ...installAndAlertFlags({ needsInstall: installNeeded }),
      hint: guide.summary,
    };
  }
  if (!pushSupported() && !device.ios) {
    return {
      canEnable: false,
      canInstall: installNeeded,
      enabled: false,
      hint: 'This browser does not support push alerts. Use Chrome, Edge, Firefox, Samsung Internet, Huawei Browser, or Safari 16.4+.',
    };
  }
  try {
    const vapid = await api('notifications', 'vapid-public-key', { body: {} });
    if (!vapid?.enabled || !vapid.publicKey) {
      return {
        canEnable: false,
        canInstall: installNeeded,
        enabled: false,
        hint: 'Background alerts are not configured on the server yet.',
      };
    }
  } catch {
    return {
      canEnable: false,
      canInstall: installNeeded,
      enabled: false,
      hint: 'Background alerts are not configured on the server yet.',
    };
  }

  const permission = notificationPermission();
  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.ready;
    subscribed = Boolean(await registration.pushManager.getSubscription());
  } catch {
    /* fall through */
  }

  const flags = installAndAlertFlags({
    needsInstall: installNeeded,
    permission,
    subscribed,
    ios: device.ios,
    standalone: standalone(),
    pushSupported: pushSupported() || device.ios,
  });

  if (flags.enabled) {
    return {
      ...flags,
      hint: alertsEnabledHint(device),
    };
  }
  if (permission === 'denied') {
    return {
      ...flags,
      hint: 'Alerts are blocked for this site. Allow notifications in your browser or system settings, then return here.',
    };
  }
  if (flags.canInstall) {
    return { ...flags, hint: guide.summary };
  }
  return {
    ...flags,
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
  if (displayModeInstalled()) markInstalled();
  listenForInstallPrompt();
  registerServiceWorker().then((registration) => registration?.update?.());
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markInstalled();
    try {
      localStorage.removeItem(INSTALL_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    hideInstallUi();
    subscribePush();
  });
  relatedAppsInstalled().then((installed) => {
    if (!installed) return;
    markInstalled();
    hideInstallUi();
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
    if (!needsInstall()) hideInstallUi();
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
}

listenForInstallPrompt();
