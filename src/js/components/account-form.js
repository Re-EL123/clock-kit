import { el, toast } from '../utils/dom.js';
import { api, persistUser, currentUser } from '../api.js';
import { nationalitySelect } from '../nationalities.js';
import { dismissModal } from './modal.js';
import { SoundsToggle } from './sounds-toggle.js';

export function AccountForm({ user, candidate = null, showIdentity = false }) {
  const name = el('input', { class: 'input', value: user.displayName || user.display_name || '' });
  name.value = user.displayName || user.display_name || '';
  const phone = el('input', { class: 'input', type: 'tel', placeholder: '082 000 0000' });
  phone.value = user.phone || '';
  const idNumber = el('input', { class: 'input', placeholder: 'ID or passport number' });
  idNumber.value = candidate?.id_number || '';
  const nationality = nationalitySelect(el);
  if (candidate?.nationality) nationality.value = candidate.nationality;
  const error = el('div', { class: 'form-error' });

  return el('div', { class: 'card', style: 'padding:1.2rem' }, [
    el('h2', { text: 'Your details' }),
    el('p', { class: 'muted', text: user.email || '' }),
    el('div', { class: 'field' }, [el('span', { text: 'Name' }), name]),
    el('div', { class: 'field' }, [el('span', { text: 'Phone' }), phone]),
    showIdentity ? el('div', { class: 'field' }, [el('span', { text: 'ID / passport number' }), idNumber]) : null,
    showIdentity ? el('div', { class: 'field' }, [el('span', { text: 'Nationality' }), nationality]) : null,
    error,
    SoundsToggle(),
    el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onClick: async () => {
        error.textContent = '';
        try {
          const body = { displayName: name.value.trim(), phone: phone.value.trim() };
          if (showIdentity) {
            body.idNumber = idNumber.value.trim();
            body.nationality = nationality.value;
          }
          const data = await api('auth', 'update-profile', { body });
          if (data.user) persistUser({ ...currentUser(), ...data.user });
          toast('Details saved');
          dismissModal(error);
          window.dispatchEvent(new Event('ck:profile-saved'));
        } catch (err) {
          error.textContent = err.message;
          toast(err.message, 'err');
        }
      },
    }, ['Save']),
  ]);
}
