import { el } from '../utils/dom.js';

export function Modal({ title, children = [], onClose, dismissible = true, wide = false }) {
  return el('div', { class: `modal-backdrop${dismissible ? '' : ' is-blocking'}`, onClick: dismissible ? onClose : undefined }, [
    el('div', {
      class: `modal card${wide ? ' modal-wide' : ''}`,
      style: 'max-height:90vh;overflow:auto',
      onClick: (e) => e.stopPropagation(),
      role: 'dialog',
      'aria-modal': 'true',
    }, [
      el('h2', { text: title }),
      ...[].concat(children),
    ]),
  ]);
}

export function dismissModal(node) {
  if (!node) return;
  const target = node.classList?.contains('modal-backdrop')
    ? node
    : node.closest?.('.modal-backdrop');
  target?.remove();
}
