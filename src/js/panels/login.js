import '../../css/app.css';
import { Auth } from '../auth.js';
import { el, toast } from '../utils/dom.js';
import { withBase } from '../config.js';

Auth.requireGuest();

const email = el('input', { class: 'input', type: 'email', autocomplete: 'username', placeholder: 'Email' });
const password = el('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password' });
const error = el('div', { class: 'form-error' });

document.getElementById('app').append(
  el('div', { class: 'auth-card card' }, [
    el('img', { src: withBase('assets/logo/clock-kit-logo.png'), alt: 'Clock-Kit', width: '220' }),
    el('h1', { text: 'Sign in' }),
    el('p', { class: 'muted', text: 'Workforce clocking for host-site teams' }),
    el('form', {
      onSubmit: async (ev) => {
        ev.preventDefault();
        error.textContent = '';
        try {
          const user = await Auth.login(email.value, password.value);
          location.href = Auth.home(user.role);
        } catch (e) {
          error.textContent = e.message;
          toast(e.message, 'err');
        }
      },
    }, [
      el('div', { class: 'field' }, [el('span', { text: 'Email' }), email]),
      el('div', { class: 'field' }, [el('span', { text: 'Password' }), password]),
      error,
      el('button', { class: 'btn btn-primary', type: 'submit' }, ['Continue']),
    ]),
  ]),
);
