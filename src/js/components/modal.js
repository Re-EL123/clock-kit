import { el } from '../utils/dom.js';

export function Modal({ title, children = [], onClose }) {
  return el('div', { class: 'modal-backdrop', onClick: onClose }, [
    el('div', { class: 'modal card', style: 'max-height:90vh;overflow:auto', onClick: (e) => e.stopPropagation() }, [
      el('h2', { text: title }),
      ...[].concat(children),
    ]),
  ]);
}
