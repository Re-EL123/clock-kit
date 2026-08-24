import { el } from '../utils/dom.js';

export function ClockFace() {
  const hour = el('div', { class: 'hand hand-hour' });
  const minute = el('div', { class: 'hand hand-minute' });
  const second = el('div', { class: 'hand hand-second' });
  const face = el('div', { class: 'clock-face', role: 'img', 'aria-label': 'Analogue clock' }, [
    hour,
    minute,
    second,
    el('div', { class: 'clock-center' }),
  ]);

  function tick() {
    const now = new Date();
    const s = now.getSeconds();
    const m = now.getMinutes();
    const h = now.getHours() % 12;
    second.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
    minute.style.transform = `translateX(-50%) rotate(${m * 6 + s * 0.1}deg)`;
    hour.style.transform = `translateX(-50%) rotate(${h * 30 + m * 0.5}deg)`;
  }
  tick();
  setInterval(tick, 1000);
  return face;
}

export function StatusChip(status) {
  const map = {
    WORKING: ['chip chip-working', 'WORKING'],
    ON_BREAK: ['chip chip-break', 'ON BREAK'],
    OFF_DUTY: ['chip chip-neutral', 'OFF DUTY'],
    PENDING_SYNC: ['chip chip-break', 'PENDING SYNC'],
    CONFIRMED: ['chip chip-working', 'CONFIRMED'],
  };
  const [cls, label] = map[status] || ['chip chip-neutral', status];
  return el('span', { class: cls, text: label });
}

export function StatCard(label, value, href) {
  const node = el(href ? 'a' : 'div', { class: 'stat', href: href || undefined }, [
    el('div', { class: 'label', text: label }),
    el('div', { class: 'value', text: String(value ?? '0') }),
  ]);
  return node;
}
