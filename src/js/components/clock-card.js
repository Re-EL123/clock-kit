import { el } from '../utils/dom.js';
import { icon } from '../icons.js';

const STAT_ICONS = {
  Organisations: 'organisations',
  'Active candidates': 'candidates',
  Hosts: 'hosts',
  'Clocked in today': 'activity',
  Scheduled: 'calendar',
  Present: 'user-check',
  'On break': 'coffee',
  'On leave': 'leave',
  'Missing clock-outs': 'alert',
  Corrections: 'clipboard',
  'Pending leave': 'leave',
  Absent: 'user',
};

export function ClockFace() {
  const hour = el('div', { class: 'hand hand-hour' });
  const minute = el('div', { class: 'hand hand-minute' });
  const second = el('div', { class: 'hand hand-second' });
  const marks = Array.from({ length: 12 }, (_, i) =>
    el('div', { class: 'clock-mark', style: `--deg:${i * 30}deg` }),
  );
  const face = el('div', { class: 'clock-face', role: 'img', 'aria-label': 'Analogue clock' }, [
    ...marks,
    hour,
    minute,
    second,
    el('div', { class: 'clock-center' }),
  ]);
  face.insertAdjacentHTML(
    'beforeend',
    '<svg class="clock-figure" viewBox="0 0 96 96" aria-hidden="true">'
      + '<circle cx="28" cy="64" r="7" fill="#F5BF48"/>'
      + '<path d="M22 78c2-10 10-16 20-14" fill="none" stroke="#F5BF48" stroke-width="7" stroke-linecap="round"/>'
      + '</svg>',
  );

  let mounted = false;
  function tick() {
    if (face.isConnected) {
      mounted = true;
      const now = new Date();
      const ms = now.getMilliseconds();
      const s = now.getSeconds() + ms / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      second.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
      minute.style.transform = `translateX(-50%) rotate(${m * 6}deg)`;
      hour.style.transform = `translateX(-50%) rotate(${h * 30}deg)`;
    } else if (mounted) return;
    face._raf = requestAnimationFrame(tick);
  }
  tick();
  return face;
}

export function StatusChip(status) {
  const map = {
    WORKING: ['chip chip-working', 'activity', 'WORKING'],
    ON_BREAK: ['chip chip-break', 'coffee', 'ON BREAK'],
    OFF_DUTY: ['chip chip-neutral', 'clock', 'OFF DUTY'],
    PENDING_SYNC: ['chip chip-break', 'timer', 'PENDING SYNC'],
    CONFIRMED: ['chip chip-working', 'check', 'CONFIRMED'],
  };
  const [cls, name, label] = map[status] || ['chip chip-neutral', 'clock', status];
  return el('span', { class: cls }, [icon(name, { size: 14 }), label]);
}

export function StatCard(label, value, href) {
  return el(href ? 'a' : 'div', { class: 'stat', href: href || undefined }, [
    el('div', { class: 'stat-head' }, [
      icon(STAT_ICONS[label] || 'activity', { size: 18 }),
      el('div', { class: 'label', text: label }),
    ]),
    el('div', { class: 'value', text: String(value ?? '0') }),
  ]);
}
