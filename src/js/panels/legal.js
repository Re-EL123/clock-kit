import '../../css/app.css';
import { el } from '../utils/dom.js';
import { withBase } from '../config.js';
import { api } from '../api.js';
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from '../legal-content.js';
import { formatPublished } from '../legal-format.js';
import { popIn } from '../motion.js';
import { startPwa } from '../pwa.js';

const isPrivacy = /privacy/i.test(location.pathname);
const fallbackTitle = isPrivacy ? 'Privacy Policy' : 'Terms and Conditions';
const fallbackSections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

function render({ title, version, publishedAt, sections }) {
  document.title = `${title} — Clock-Kit`;
  const card = el('div', { class: 'auth-card card legal-card' }, [
    el('a', { href: withBase('login.html'), class: 'muted' }, ['← Sign in']),
    el('img', {
      src: withBase('assets/logo/clock-kit-light.svg'),
      alt: 'Clock-Kit',
      width: '220',
    }),
    el('h1', { text: title }),
    el('p', {
      class: 'muted',
      text: version
        ? `Version ${version}${publishedAt ? ` · ${formatPublished(publishedAt)}` : ''}`
        : 'Clock-Kit time and attendance',
    }),
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
  document.getElementById('app').replaceChildren(card);
  popIn(card);
}

render({ title: fallbackTitle, sections: fallbackSections });

try {
  const data = await api('system', 'legal', { body: {} });
  const doc = isPrivacy ? data.privacy : data.terms;
  if (doc?.sections?.length) {
    render({
      title: doc.title || fallbackTitle,
      version: doc.version,
      publishedAt: doc.publishedAt,
      sections: doc.sections,
    });
  }
} catch {
  /* bundled copy stays visible */
}

startPwa();
