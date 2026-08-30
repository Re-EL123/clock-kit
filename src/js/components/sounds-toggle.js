import { el } from '../utils/dom.js';
import { soundsPreference, setSoundsEnabled } from '../sound.js';
import { reducedMotion } from '../motion.js';

export function SoundsToggle() {
  const prefersQuiet = reducedMotion();
  const box = el('input', { type: 'checkbox' });
  box.checked = soundsPreference() && !prefersQuiet;
  box.disabled = prefersQuiet;
  box.addEventListener('change', () => {
    setSoundsEnabled(box.checked);
  });
  return el('label', { class: 'check-row', style: 'margin:0.85rem 0 1rem' }, [
    box,
    el('span', {}, [
      el('strong', { text: 'Play sounds' }),
      el('span', {
        class: 'muted',
        style: 'display:block;font-weight:500',
        text: prefersQuiet
          ? 'Sounds stay off because this device prefers reduced motion.'
          : 'Short tones on buttons, toasts, and alerts. Turn this off if they become distracting.',
      }),
    ]),
  ]);
}
