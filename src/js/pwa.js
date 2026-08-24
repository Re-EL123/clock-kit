import { api } from './api.js';
import { el, toast } from './utils/dom.js';
import { TOKEN_KEY, withBase } from './config.js';
import { icon } from './icons.js';
import { playSound } from './sound.js';

let deferredPrompt;
let started = false;

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, {
    scope: import.meta.env.BASE_URL,
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

function renderInstall(slot) {
  if (!slot || standalone() || sessionStorage.getItem('ck_install_dismissed') === '1') return;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const label = deferredPrompt ? 'Install app' : isIos ? 'Add to Home Screen' : 'Install Clock-Kit';
  slot.replaceChildren(
    el('button', {
      class: 'btn install-btn',
      type: 'button',
      onClick: async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          slot.replaceChildren();
          return;
        }
        toast(isIos ? 'Share → Add to Home Screen to install Clock-Kit.' : 'Use your browser menu to install Clock-Kit.', 'ok');
        sessionStorage.setItem('ck_install_dismissed', '1');
        slot.replaceChildren();
      },
    }, [icon('plus', { size: 16 }), label]),
  );
}

async function subscribePush() {
  if (!localStorage.getItem(TOKEN_KEY)) return;
  if (!('Notification' in window) || !('PushManager' in window) || !navigator.serviceWorker) return;
  try {
    const vapid = await api('notifications', 'vapid-public-key', { body: {} });
    if (!vapid?.enabled || !vapid.publicKey) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
    }
    const json = subscription.toJSON();
    await api('notifications', 'subscribe', {
      body: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    });
  } catch {
    /* Push is optional when VAPID is not configured. */
  }
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

export function startPwa() {
  if (started) return;
  started = true;
  registerServiceWorker();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    renderInstall(document.querySelector('.pwa-slot'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.querySelector('.pwa-slot')?.replaceChildren();
    toast('Clock-Kit is installed', 'ok');
  });
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type !== 'ck:notify') return;
      toast(event.data.title || event.data.body || 'Update', 'notify');
    });
  }
  queueMicrotask(() => renderInstall(document.querySelector('.pwa-slot')));
  const unlockPush = () => {
    subscribePush();
    document.removeEventListener('pointerdown', unlockPush);
  };
  document.addEventListener('pointerdown', unlockPush, { once: true });
}
