import { el } from '../utils/dom.js';
import { icon } from '../icons.js';

export function EmptyState(text = 'Nothing to show yet') {
  return el('div', { class: 'empty' }, [icon('clipboard', { size: 28 }), text]);
}
