import { el } from '../utils/dom.js';

export function Calendar({ note = 'Use organisation schedules for shift dates.' }) {
  return el('div', { class: 'card', style: 'padding:1rem' }, [el('p', { class: 'muted', text: note })]);
}
