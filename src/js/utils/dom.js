import { icon } from '../icons.js';
import { playSound } from '../sound.js';

function flatten(list) {
  const out = [];
  for (const item of [].concat(list)) {
    if (item == null || item === false) continue;
    if (Array.isArray(item)) out.push(...flatten(item));
    else out.push(item);
  }
  return out;
}

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
  for (const child of flatten(children)) {
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

export function liveText(node, write, ms = 1000) {
  let mounted = false;
  const tick = () => {
    if (node.isConnected) {
      mounted = true;
      write(node);
    } else if (mounted) return;
    node._live = setTimeout(tick, mounted ? ms : 40);
  };
  tick();
  return node;
}

export function toast(message, kind = 'ok') {
  document.querySelector('.toast')?.remove();
  const node = el('div', { class: `toast raised ${kind === 'err' ? 'chip-danger' : ''}` }, [
    icon(kind === 'err' ? 'alert' : kind === 'notify' ? 'bell' : 'check', { size: 18 }),
    el('span', { text: message }),
  ]);
  document.body.append(node);
  playSound(kind === 'err' ? 'err' : kind === 'notify' ? 'notify' : 'ok');
  setTimeout(() => node.remove(), kind === 'err' ? 10000 : 3800);
}

export function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function toDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function downloadBase64(filename, base64, mime = 'application/pdf') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = el('a', { href, download: filename });
  a.click();
  URL.revokeObjectURL(href);
}

export function downloadText(filename, text, mime = 'text/csv') {
  const blob = new Blob([text], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = el('a', { href, download: filename });
  a.click();
  URL.revokeObjectURL(href);
}

export function nowClock(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
