import { api } from '../api.js';
import { el, toast } from '../utils/dom.js';
import { icon } from '../icons.js';
import { isEmail } from '../validators.js';

function field(label, input) {
  return el('div', { class: 'field' }, [el('span', { text: label }), input]);
}

function textInput(placeholder, type = 'text') {
  return el('input', { class: 'input', type, placeholder, autocomplete: type === 'email' ? 'email' : 'off' });
}

function groupedFaqs(faqs) {
  const groups = [];
  for (const faq of faqs || []) {
    const last = groups[groups.length - 1];
    if (last && last.category === faq.category) last.items.push(faq);
    else groups.push({ category: faq.category || 'General', items: [faq] });
  }
  return groups;
}

export function FaqList({ faqs }) {
  if (!faqs?.length) return el('p', { class: 'muted', text: 'No FAQs have been published yet.' });
  return el('div', { class: 'faq-list' }, groupedFaqs(faqs).map((group) =>
    el('section', { class: 'faq-group' }, [
      el('h3', { text: group.category }),
      ...group.items.map((faq) =>
        el('details', { class: 'faq-item' }, [
          el('summary', {}, [faq.question]),
          el('p', { text: faq.answer }),
        ]),
      ),
    ]),
  ));
}

export function SupportCard({ support }) {
  const rows = [
    support.email ? ['Email', support.email, `mailto:${support.email}`] : null,
    support.phone ? ['Phone', support.phone, `tel:${support.phone.replace(/\s+/g, '')}`] : null,
    support.whatsapp ? ['WhatsApp', support.whatsapp, `https://wa.me/${support.whatsapp.replace(/\D/g, '')}`] : null,
    support.website ? ['Website', support.website, /^https?:\/\//i.test(support.website) ? support.website : `https://${support.website}`] : null,
    support.hours ? ['Hours', support.hours, null] : null,
  ].filter(Boolean);
  return el('div', { class: 'help-copy' }, [
    el('p', { text: support.intro || '' }),
    rows.length
      ? el('dl', { class: 'help-dl' }, rows.flatMap(([label, value, href]) => [
        el('dt', { text: label }),
        el('dd', {}, [href ? el('a', { href, rel: 'noopener noreferrer' }, [value]) : value]),
      ]))
      : el('p', { class: 'muted', text: 'Contact details will appear here once the platform admin adds them.' }),
    support.notes ? el('p', { class: 'muted', text: support.notes }) : null,
  ]);
}

export function FeedbackForm({ settings, user }) {
  const category = el(
    'select',
    { class: 'input' },
    (settings.categories || ['Other']).map((value) => el('option', { value, text: value })),
  );
  const name = textInput('Your name');
  name.value = user?.displayName || '';
  const email = textInput('Email', 'email');
  email.value = user?.email || '';
  const message = el('textarea', { class: 'input legal-editor', rows: '6', placeholder: 'What should we know?' });
  const err = el('div', { class: 'form-error' });
  return el('form', {
    class: 'help-copy',
    onSubmit: async (ev) => {
      ev.preventDefault();
      err.textContent = '';
      try {
        if (!user && !isEmail(email.value)) throw new Error('Enter a valid email');
        await api('system', 'submit-feedback', {
          body: {
            name: name.value.trim(),
            email: email.value.trim(),
            category: category.value,
            message: message.value.trim(),
          },
        });
        message.value = '';
        toast('Thank you. Clock-Kit has your feedback.');
      } catch (e) {
        err.textContent = e.message;
        toast(e.message, 'err');
      }
    },
  }, [
    el('p', { class: 'muted', text: settings.intro || '' }),
    user ? null : field('Name', name),
    user ? null : field('Email', email),
    field('Category', category),
    field('Message', message),
    err,
    el('button', { class: 'btn btn-primary', type: 'submit' }, [
      icon('mail', { size: 16 }),
      'Send feedback',
    ]),
  ]);
}

export { field, textInput };
