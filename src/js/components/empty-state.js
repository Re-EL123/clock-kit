import { el } from '../utils/dom.js';

export function EmptyState(text = 'Nothing to show yet') {
  return el('div', { class: 'empty', text });
}
