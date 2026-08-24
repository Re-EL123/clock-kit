import { el } from './utils/dom.js';
import { animate } from 'motion';
import { reducedMotion } from './motion.js';

export function fieldError(field, message) {
  if (!field) return;
  let hint = field.querySelector('.field-hint');
  if (!hint) {
    hint = el('p', { class: 'field-hint' });
    field.append(hint);
  }
  hint.textContent = message || '';
  field.classList.toggle('is-invalid', Boolean(message));
  field.classList.toggle('is-ok', !message && field.classList.contains('was-checked'));
  if (message) {
    field.classList.add('was-checked');
    shake(field.querySelector('.input, select, textarea, .addr-box') || field);
  }
}

export function clearFieldError(field) {
  fieldError(field, '');
}

export function shake(node) {
  if (!node || reducedMotion()) return;
  animate(node, { x: [0, -6, 5, -3, 0] }, { duration: 0.32, easing: 'ease-out' });
}

export function requireValue(input, label) {
  const value = String(input?.value || '').trim();
  const field = input?.closest('.field');
  if (!value) {
    fieldError(field, `${label} is required`);
    return '';
  }
  clearFieldError(field);
  field?.classList.add('was-checked', 'is-ok');
  return value;
}
