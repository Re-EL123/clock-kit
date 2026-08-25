import '../../../css/app.css';
import { api, saveSession } from '../../api.js';
import { el, liveText, nowClock, toast } from '../../utils/dom.js';
import { ClockFace } from '../../components/clock-card.js';
import { captureLocation } from '../../geolocation.js';
import { withBase } from '../../config.js';
import { icon } from '../../icons.js';
import { popIn } from '../../motion.js';
import { armSounds } from '../../sound.js';
import { startPwa } from '../../pwa.js';

const siteId = localStorage.getItem('ck_kiosk_site') || '';
const digital = el('div', { class: 'digital', text: nowClock() });
liveText(digital, (node) => {
  node.textContent = nowClock();
}, 250);

const email = el('input', { class: 'input', placeholder: 'Candidate email', autocomplete: 'username' });
const password = el('input', { class: 'input', type: 'password', placeholder: 'PIN / password' });
const qr = el('input', { class: 'input', placeholder: 'QR token (optional)' });
const status = el('div', { class: 'muted icon-label', style: 'justify-content:center;margin:.6rem 0' }, [
  icon('sites', { size: 16 }),
  siteId ? `Site ${siteId}` : 'Configure site id in kiosk settings',
]);

async function clock(kind) {
  try {
    const login = await api('auth', 'login', { body: { email: email.value, password: password.value } });
    saveSession(login.session, login.user);
    const geo = await captureLocation();
    if (!geo.ok) toast(geo.message, 'err');
    const data = await api('clock', kind, {
      body: {
        siteId: siteId || undefined,
        qrToken: qr.value || undefined,
        source: qr.value ? 'QR' : 'KIOSK',
        ...(geo.ok ? { location: geo.location } : {}),
      },
      idempotent: true,
    });
    toast(kind === 'clock-in' ? 'Clocked in' : 'Clocked out');
    result.replaceChildren(
      el('h2', { class: 'icon-label', style: 'justify-content:center' }, [
        icon(kind === 'clock-in' ? 'log-in' : 'log-out'),
        kind === 'clock-in' ? 'CLOCKED IN' : 'CLOCKED OUT',
      ]),
      el('p', { text: login.user.displayName }),
      el('p', { text: nowClock(new Date(data.serverTime)) }),
    );
    setTimeout(() => window.location.reload(), 4000);
  } catch (e) {
    toast(e.message, 'err');
  }
}

const result = el('div', { class: 'center' });
const card = el('div', { class: 'card hero-surface kiosk-card' }, [
  el('div', { class: 'kiosk-brand' }, [
    el('img', { src: withBase('assets/logo/clock-kit-icon.svg'), alt: 'Clock-Kit', width: '72', height: '72' }),
    el('h1', { text: 'CLOCK-KIT' }),
    digital,
    el('div', { class: 'clock-wrap is-live' }, [ClockFace()]),
    status,
  ]),
  el('div', { class: 'kiosk-form' }, [
    el('div', { class: 'input-wrap', style: 'margin-bottom:.7rem' }, [icon('mail', { size: 18 }), email]),
    el('div', { class: 'input-wrap', style: 'margin-bottom:.7rem' }, [icon('lock', { size: 18 }), password]),
    el('div', { class: 'input-wrap', style: 'margin-bottom:.7rem' }, [icon('clipboard', { size: 18 }), qr]),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn btn-primary', onClick: () => clock('clock-in') }, [icon('log-in'), 'CLOCK IN']),
      el('button', { class: 'btn btn-danger', onClick: () => clock('clock-out') }, [icon('log-out'), 'CLOCK OUT']),
    ]),
    result,
    el('div', { class: 'pwa-slot', style: 'margin-top:1rem' }),
  ]),
]);

document.getElementById('app').append(el('main', { class: 'kiosk' }, [card]));
popIn(card);
armSounds();
startPwa();
