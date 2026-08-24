import { el } from '../utils/dom.js';

export function ApprovalCard({ title, body, onApprove, onReject }) {
  return el('div', { class: 'card', style: 'padding:1rem' }, [
    el('h3', { text: title }),
    el('p', { text: body }),
    el('button', { class: 'btn btn-primary', onClick: onApprove }, ['Approve']),
    el('button', { class: 'btn', onClick: onReject }, ['Reject']),
  ]);
}
