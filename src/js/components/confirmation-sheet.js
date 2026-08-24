import { el } from '../utils/dom.js';

export function ConfirmationSheet({ message, onConfirm, onCancel }) {
  return el('div', { class: 'modal-backdrop' }, [
    el('div', { class: 'modal card' }, [
      el('p', { text: message }),
      el('button', { class: 'btn', onClick: onCancel }, ['Cancel']),
      el('button', { class: 'btn btn-primary', onClick: onConfirm }, ['Confirm']),
    ]),
  ]);
}
