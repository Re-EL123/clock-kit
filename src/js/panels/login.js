import '../../css/app.css';
import { Auth } from '../auth.js';
import { el, toast } from '../utils/dom.js';
import { withBase } from '../config.js';
import { icon } from '../icons.js';
import { popIn } from '../motion.js';
import { armSounds } from '../sound.js';
import { startPwa } from '../pwa.js';

Auth.requireGuest();

const email = el('input', { class: 'input', type: 'email', autocomplete: 'username', placeholder: 'you@company.com' });
const password = el('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password' });
const error = el('div', { class: 'form-error' });
const submit = el('button', { class: 'btn btn-primary', type: 'submit' }, [
  icon('log-in', { size: 18 }),
  'Continue',
]);

const card = el('div', { class: 'auth-card card' }, [
  el('img', {
    src: withBase('assets/logo/clock-kit-light.svg'),
    alt: 'Clock-Kit',
    width: '280',
  }),
  el('h1', { text: 'Sign in' }),
  el('p', { class: 'muted', text: 'Use the email and password set by your platform admin or organisation. There is no self-signup.' }),
  el('form', {
    onSubmit: async (ev) => {
      ev.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      try {
        const user = await Auth.login(email.value, password.value);
        location.href = Auth.home(user.role);
      } catch (e) {
        error.textContent = e.message;
        toast(e.message, 'err');
      } finally {
        submit.disabled = false;
      }
    },
  }, [
    el('div', { class: 'field' }, [
      el('span', { text: 'Email' }),
      el('div', { class: 'input-wrap' }, [icon('mail', { size: 18 }), email]),
    ]),
    el('div', { class: 'field' }, [
      el('span', { text: 'Password' }),
      el('div', { class: 'input-wrap' }, [icon('lock', { size: 18 }), password]),
    ]),
    error,
    submit,
  ]),
  el('div', { class: 'pwa-slot', style: 'margin-top:1rem' }),
]);

document.getElementById('app').append(card);
popIn(card);
armSounds();
startPwa();
