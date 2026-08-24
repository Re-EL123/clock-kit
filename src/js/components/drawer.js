import { el } from '../utils/dom.js';

export function Drawer({ title, children, onClose }) {
  return el('aside', { class: 'card', style: 'position:fixed;right:1rem;top:1rem;bottom:1rem;width:min(420px,92vw);padding:1rem;z-index:30' }, [
    el('h2', { text: title }),
    children,
    el('button', { class: 'btn mt', onClick: onClose }, ['Close']),
  ]);
}
