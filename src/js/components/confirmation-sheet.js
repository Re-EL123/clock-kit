import { el } from '../utils/dom.js';

export function ConfirmationSheet({ message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return el('div', { class: 'modal-backdrop' }, [
    el('div', { class: 'modal card' }, [
      el('p', { text: message }),
      el('button', { class: 'btn', onClick: onCancel }, ['Cancel']),
      el('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onClick: onConfirm }, [confirmLabel]),
    ]),
  ]);
}
