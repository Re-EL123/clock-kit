import '../../css/app.css';
import { el } from '../utils/dom.js';
import { withBase } from '../config.js';
import { api } from '../api.js';
import { popIn } from '../motion.js';
import { startPwa } from '../pwa.js';
import { FALLBACK_HELP } from '../help-content.js';
import { FaqList, SupportCard, FeedbackForm } from '../components/help-ui.js';

const page = /support/i.test(location.pathname)
  ? 'support'
  : /feedback/i.test(location.pathname)
    ? 'feedback'
    : 'faq';

function titleFor(data) {
  if (page === 'support') return data.support?.title || 'Support';
  if (page === 'feedback') return data.feedback?.title || 'Feedback';
  return 'FAQs';
}

function render(data) {
  const title = titleFor(data);
  document.title = `${title} — Clock-Kit`;
  const body = page === 'support'
    ? SupportCard({ support: data.support })
    : page === 'feedback'
      ? FeedbackForm({ settings: data.feedback, user: null })
      : FaqList({ faqs: data.faqs });
  const card = el('div', { class: 'auth-card card legal-card' }, [
    el('a', { href: withBase('login.html'), class: 'muted' }, ['← Sign in']),
    el('img', {
      src: withBase('assets/logo/clock-kit-full-logo.svg'),
      alt: 'Clock-Kit',
      width: '220',
    }),
    el('h1', { text: title }),
    el('p', { class: 'muted', text: 'Clock-Kit time and attendance' }),
    body,
    el('p', { class: 'legal-switch' }, [
      el('a', { href: withBase('faq.html') }, ['FAQs']),
      ' · ',
      el('a', { href: withBase('support.html') }, ['Support']),
      ' · ',
      el('a', { href: withBase('feedback.html') }, ['Feedback']),
    ]),
  ]);
  document.getElementById('app').replaceChildren(card);
  popIn(card);
}

render(FALLBACK_HELP);
try {
  const data = await api('system', 'help', { body: {} });
  render({
    faqs: data.faqs?.length ? data.faqs : FALLBACK_HELP.faqs,
    support: data.support || FALLBACK_HELP.support,
    feedback: data.feedback || FALLBACK_HELP.feedback,
  });
} catch {
  /* bundled copy stays visible */
}
startPwa();
