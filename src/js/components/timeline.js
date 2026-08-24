import { el } from '../utils/dom.js';

export function Timeline(items = []) {
  return el(
    'ol',
    { class: 'stack' },
    items.map((i) => el('li', {}, [el('strong', { text: i.title }), ' ', i.detail || ''])),
  );
}
