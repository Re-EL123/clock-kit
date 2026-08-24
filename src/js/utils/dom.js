import { icon } from '../icons.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === false || value == null) {
      /* skip */
    } else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function viewParam(fallback = 'dashboard') {
  return new URLSearchParams(location.search).get('view') || fallback;
}

export function href(view, extra = {}) {
  const params = new URLSearchParams({ view, ...extra });
  return `${location.pathname}?${params}`;
}

export function toast(message, kind = 'ok') {
  document.querySelector('.toast')?.remove();
  const node = el('div', { class: `toast raised ${kind === 'err' ? 'chip-danger' : ''}` }, [
    icon(kind === 'err' ? 'alert' : 'check', { size: 18 }),
    el('span', { text: message }),
  ]);
  document.body.append(node);
  setTimeout(() => node.remove(), 3800);
}

export function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function nowClock(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
