const KEY = 'ck_splash_seen';
const FIGURE =
  '<svg class="clock-figure" viewBox="0 0 96 96" aria-hidden="true">' +
  '<circle cx="28" cy="64" r="7" fill="#F5BF48"/>' +
  '<path d="M22 78c2-10 10-16 20-14" fill="none" stroke="#F5BF48" stroke-width="7" stroke-linecap="round"/>' +
  '</svg>';

function alwaysShow() {
  const path = location.pathname;
  return path.includes('login.html') || path.includes('/kiosk');
}

function shouldSkip() {
  try {
    return !alwaysShow() && sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

function buildClock(face) {
  face.replaceChildren();
  for (let i = 0; i < 12; i += 1) {
    const mark = document.createElement('div');
    mark.className = 'clock-mark';
    mark.style.setProperty('--deg', `${i * 30}deg`);
    face.append(mark);
  }
  const hour = document.createElement('div');
  hour.className = 'hand hand-hour';
  const minute = document.createElement('div');
  minute.className = 'hand hand-minute';
  const second = document.createElement('div');
  second.className = 'hand hand-second';
  const center = document.createElement('div');
  center.className = 'clock-center';
  face.append(hour, minute, second, center);
  face.insertAdjacentHTML('beforeend', FIGURE);
  return { hour, minute, second };
}

function tick(hands) {
  const now = new Date();
  const s = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  hands.second.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
  hands.minute.style.transform = `translateX(-50%) rotate(${m * 6}deg)`;
  hands.hour.style.transform = `translateX(-50%) rotate(${h * 30}deg)`;
}

function dismiss(root, raf) {
  if (!root.isConnected) return;
  cancelAnimationFrame(raf.id);
  root.classList.add('is-leaving');
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    root.remove();
    document.documentElement.classList.add('ck-splash-skip');
  };
  root.addEventListener('animationend', done, { once: true });
  setTimeout(done, 500);
}

function boot() {
  const root = document.getElementById('ck-splash');
  if (!root) return;
  if (shouldSkip()) {
    root.remove();
    return;
  }

  const face = root.querySelector('.clock-face');
  if (!face) return;
  const hands = buildClock(face);
  const raf = { id: 0 };
  const loop = () => {
    tick(hands);
    raf.id = requestAnimationFrame(loop);
  };
  loop();
  root.classList.add('is-live');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hold = reduced ? 200 : 2200;
  setTimeout(() => {
    markSeen();
    dismiss(root, raf);
  }, hold);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
