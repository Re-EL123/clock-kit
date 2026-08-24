import { el } from '../utils/dom.js';

export function Modal({ title, children, onClose }) {
  return el('div', { class: 'modal-backdrop', onClick: onClose }, [
    el('div', { class: 'modal card', onClick: (e) => e.stopPropagation() }, [
      el('h2', { text: title }),
      children,
    ]),
  ]);
}
