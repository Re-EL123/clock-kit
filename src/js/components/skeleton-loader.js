import { el } from '../utils/dom.js';

export function SkeletonLoader() {
  return el('div', { class: 'muted', text: 'Loading…' });
}
