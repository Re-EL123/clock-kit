import '../../../css/app.css';
import { api, saveSession } from '../../api.js';
import { el, nowClock, toast } from '../../utils/dom.js';
import { ClockFace } from '../../components/clock-card.js';
import { captureLocation } from '../../geolocation.js';
import { withBase } from '../../config.js';

const siteId = localStorage.getItem('ck_kiosk_site') || '';
const digital = el('div', { class: 'digital', text: nowClock() });
setInterval(() => {
  digital.textContent = nowClock();
}, 1000);

const email = el('input', { class: 'input', placeholder: 'Candidate email', autocomplete: 'username' });
const password = el('input', { class: 'input', type: 'password', placeholder: 'PIN / password' });
const qr = el('input', { class: 'input', placeholder: 'QR token (optional)' });
const status = el('div', { class: 'muted', text: siteId ? `Site ${siteId}` : 'Configure site id in kiosk settings' });

async function clock(kind) {
  try {
    const login = await api('auth', 'login', { body: { email: email.value, password: password.value } });
    saveSession(login.session, login.user);
    const geo = await captureLocation();
    const data = await api('clock', kind, {
      body: { siteId: siteId || undefined, qrToken: qr.value || undefined, source: qr.value ? 'QR' : 'KIOSK', location: geo },
      idempotent: true,
    });
    result.replaceChildren(
      el('h2', { text: kind === 'clock-in' ? 'CLOCKED IN' : 'CLOCKED OUT' }),
      el('p', { text: login.user.displayName }),
      el('p', { text: nowClock(new Date(data.serverTime)) }),
    );
    setTimeout(() => window.location.reload(), 4000);
  } catch (e) {
    toast(e.message, 'err');
  }
}

const result = el('div', { class: 'center' });

document.getElementById('app').append(
  el('main', { class: 'kiosk' }, [
    el('div', { class: 'card hero-surface', style: 'padding:2rem;width:min(440px,94vw)' }, [
      el('img', { src: withBase('assets/logo/clock-kit-mark.svg'), alt: 'Clock-Kit', width: '72', height: '72' }),
      el('h1', { text: 'CLOCK-KIT' }),
      digital,
      el('div', { class: 'clock-wrap' }, [ClockFace()]),
      status,
      email,
      password,
      qr,
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-primary', onClick: () => clock('clock-in') }, ['CLOCK IN']),
        el('button', { class: 'btn btn-danger', onClick: () => clock('clock-out') }, ['CLOCK OUT']),
      ]),
      result,
    ]),
  ]),
);
