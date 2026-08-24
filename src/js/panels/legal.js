import '../css/app.css';
import { el } from './utils/dom.js';
import { withBase } from './config.js';
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from './legal-content.js';
import { popIn } from './motion.js';
import { startPwa } from './pwa.js';

const isPrivacy = /privacy/i.test(location.pathname);
const title = isPrivacy ? 'Privacy Policy' : 'Terms and Conditions';
const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

document.title = `${title} — Clock-Kit`;

const card = el('div', { class: 'auth-card card legal-card' }, [
  el('a', { href: withBase('login.html'), class: 'muted' }, ['← Sign in']),
  el('img', {
    src: withBase('assets/logo/clock-kit-light.svg'),
    alt: 'Clock-Kit',
    width: '220',
  }),
  el('h1', { text: title }),
  el('p', { class: 'muted', text: 'Clock-Kit time and attendance · Last updated 24 August 2026' }),
  ...sections.map((section) =>
    el('section', { class: 'legal-section' }, [
      el('h2', { text: section.heading }),
      el('p', { text: section.body }),
    ]),
  ),
  el('p', { class: 'legal-switch' }, [
    isPrivacy
      ? el('a', { href: withBase('terms.html') }, ['Terms and Conditions'])
      : el('a', { href: withBase('privacy.html') }, ['Privacy Policy']),
  ]),
]);

document.getElementById('app').append(card);
popIn(card);
startPwa();
