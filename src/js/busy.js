let requests = 0;
let paints = 0;
let extra = 0;
let armed = false;
let progress;
let idleClear;
let shownAt = 0;
let minTimer;
const MIN_MS = 220;

function work() {
  return requests > 0 || paints > 0 || extra > 0;
}

function node(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (value === false || value == null) continue;
    else el.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) el.append(child);
  }
  return el;
}

function spinner(size = '') {
  return node('span', {
    class: `ck-spinner${size ? ` ck-spinner-${size}` : ''}`,
    'aria-hidden': 'true',
  });
}

export function PanelLoader(label = 'Loading') {
  return node('div', { class: 'ck-page-loader', role: 'status', 'aria-live': 'polite' }, [
    spinner('lg'),
    node('p', { class: 'muted', text: label }),
  ]);
}

export function viewLoader() {
  return node('div', {
    class: 'ck-view-loader',
    hidden: true,
    role: 'status',
    'aria-live': 'polite',
    'aria-label': 'Loading',
  }, [
    spinner('lg'),
    node('span', { text: 'Loading' }),
  ]);
}

function progressEl() {
  if (progress?.isConnected) return progress;
  progress = node('div', {
    class: 'ck-progress',
    hidden: true,
    'aria-hidden': 'true',
  }, [node('div', { class: 'ck-progress-bar' })]);
  document.body.append(progress);
  return progress;
}

function addButtonSpinner(target) {
  if (!target.matches('button, .btn')) return;
  if (target.querySelector(':scope > .ck-spinner')) return;
  target.prepend(spinner());
}

function markControl(target) {
  if (!target || target.classList.contains('is-busy')) return;
  target.classList.add('is-busy');
  target.setAttribute('aria-busy', 'true');
  queueMicrotask(() => {
    if (target.isConnected && target.classList.contains('is-busy')) {
      target.classList.add('is-busy-lock');
    }
  });
}

function unmarkControls() {
  document.querySelectorAll('.is-busy').forEach((target) => {
    target.classList.remove('is-busy', 'is-busy-lock', 'is-pressed');
    target.removeAttribute('aria-busy');
    target.querySelectorAll(':scope > .ck-spinner').forEach((spin) => spin.remove());
  });
}

function sync() {
  const on = work();
  if (on && !shownAt) shownAt = Date.now();
  const hold = Boolean(shownAt) && Date.now() - shownAt < MIN_MS;
  const visible = on || hold;
  if (!on && hold) {
    clearTimeout(minTimer);
    minTimer = setTimeout(sync, MIN_MS - (Date.now() - shownAt));
  }
  if (!visible) shownAt = 0;

  const bar = progressEl();
  bar.hidden = !visible;
  bar.classList.toggle('is-on', visible);
  document.documentElement.classList.toggle('ck-busy', visible);
  if (visible) {
    document.querySelectorAll('.is-busy').forEach(addButtonSpinner);
  }
  document.querySelectorAll('.ck-view-loader').forEach((el) => {
    el.hidden = paints === 0;
  });
  document.querySelectorAll('.page-body').forEach((el) => {
    el.classList.toggle('is-refreshing', paints > 0);
  });
  if (!visible) unmarkControls();
}

function bump(field, delta) {
  if (field === 'requests') requests = Math.max(0, requests + delta);
  if (field === 'paints') paints = Math.max(0, paints + delta);
  if (field === 'extra') extra = Math.max(0, extra + delta);
  sync();
}

export function beginRequest() {
  bump('requests', 1);
}

export function endRequest() {
  bump('requests', -1);
}

export function beginPaint() {
  bump('paints', 1);
}

export function endPaint() {
  bump('paints', -1);
}

export function beginWork() {
  bump('extra', 1);
}

export function endWork() {
  bump('extra', -1);
}

export async function withBusy(fn) {
  beginWork();
  try {
    return await fn();
  } finally {
    endWork();
  }
}

function actionable(target) {
  const el = target?.closest?.('button, .btn, .nav-link, .mobile-nav a, a.brand, [type="submit"]');
  if (!el) return null;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return null;
  if (el.classList.contains('more-btn')) return null;
  if (el.target === '_blank' || el.hasAttribute('download')) return null;
  return el;
}

function holdUntilWork(el) {
  markControl(el);
  clearTimeout(idleClear);
  idleClear = setTimeout(() => {
    if (!work()) unmarkControls();
  }, 90);
}

function onClick(ev) {
  const el = actionable(ev.target);
  if (!el) return;
  holdUntilWork(el);
}

function onSubmit(ev) {
  const el = ev.submitter || ev.target.querySelector('button[type="submit"], .btn-primary, .btn');
  if (el) holdUntilWork(el);
}

export function armBusy() {
  if (armed) return;
  armed = true;
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
}
