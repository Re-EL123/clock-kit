import { api } from '../api.js';
import { el, toast } from '../utils/dom.js';
import { setView } from '../router.js';
import { refreshPanel } from '../runtime.js';
import { ConfirmationSheet } from './confirmation-sheet.js';
import { FALLBACK_HELP, HELP_TABS } from '../help-content.js';
import { FaqList, SupportCard, FeedbackForm, field, textInput } from './help-ui.js';

export function helpTabFromUrl() {
  const tab = new URLSearchParams(location.search).get('tab');
  if (tab === 'support' || tab === 'feedback' || tab === 'inbox') return tab;
  return 'faq';
}

function tabs(current, extra = []) {
  return el('div', { class: 'help-tabs', role: 'tablist' }, [
    ...HELP_TABS,
    ...extra,
  ].map((tab) =>
    el('button', {
      class: `help-tab${tab.id === current ? ' is-active' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-selected': tab.id === current ? 'true' : 'false',
      onClick: () => {
        setView('help', { tab: tab.id });
        refreshPanel();
      },
    }, [tab.label]),
  ));
}

function FaqEditor({ faqs }) {
  function form(faq = {}) {
    const category = textInput('Category');
    category.value = faq.category || 'General';
    const question = textInput('Question');
    question.value = faq.question || '';
    const answer = el('textarea', { class: 'input legal-editor' });
    answer.value = faq.answer || '';
    const sortOrder = textInput('Sort', 'number');
    sortOrder.value = String(faq.sortOrder ?? 0);
    const published = el('select', { class: 'input' }, [
      el('option', { value: 'true', text: 'Published' }),
      el('option', { value: 'false', text: 'Hidden' }),
    ]);
    published.value = faq.published === false ? 'false' : 'true';
    const err = el('div', { class: 'form-error' });
    return el('div', { class: 'card help-block' }, [
      el('h2', { text: faq.id ? 'Edit FAQ' : 'New FAQ' }),
      field('Category', category),
      field('Question', question),
      field('Answer', answer),
      field('Sort order', sortOrder),
      field('Visibility', published),
      err,
      el('div', { class: 'btn-row' }, [
        el('button', {
          class: 'btn btn-primary',
          type: 'button',
          onClick: async () => {
            err.textContent = '';
            try {
              await api('admin', 'save-faq', {
                body: {
                  id: faq.id,
                  category: category.value.trim(),
                  question: question.value.trim(),
                  answer: answer.value.trim(),
                  sortOrder: Number(sortOrder.value || 0),
                  published: published.value === 'true',
                },
              });
              toast(faq.id ? 'FAQ saved' : 'FAQ added');
              refreshPanel();
            } catch (e) {
              err.textContent = e.message;
              toast(e.message, 'err');
            }
          },
        }, [faq.id ? 'Save FAQ' : 'Add FAQ']),
        faq.id
          ? el('button', {
            class: 'btn btn-danger',
            type: 'button',
            onClick: () => {
              const sheet = ConfirmationSheet({
                message: `Delete “${faq.question}”?`,
                confirmLabel: 'Delete',
                danger: true,
                onCancel: () => sheet.remove(),
                onConfirm: async () => {
                  sheet.remove();
                  try {
                    await api('admin', 'delete-faq', { body: { id: faq.id } });
                    toast('FAQ deleted');
                    refreshPanel();
                  } catch (e) {
                    toast(e.message, 'err');
                  }
                },
              });
              document.body.append(sheet);
            },
          }, ['Delete'])
          : null,
      ]),
    ]);
  }

  const editorHost = el('div', { class: 'help-faq-editor' });
  return el('div', { class: 'grid' }, [
    form(),
    el('div', { class: 'card help-block' }, [
      el('h2', { text: 'All FAQs' }),
      el('p', { class: 'muted', text: 'Hidden questions stay off Help until you publish them.' }),
      ...(faqs || []).map((faq) =>
        el('article', { class: 'faq-admin-row' }, [
          el('div', {}, [
            el('strong', { text: faq.question }),
            el('p', { class: 'muted', text: `${faq.category} · ${faq.published === false ? 'Hidden' : 'Published'}` }),
          ]),
          el('button', {
            class: 'btn',
            type: 'button',
            onClick: () => editorHost.replaceChildren(form(faq)),
          }, ['Edit']),
        ]),
      ),
    ]),
    editorHost,
  ]);
}

function SupportEditor({ support }) {
  const title = textInput('Title');
  title.value = support.title || 'Support';
  const intro = el('textarea', { class: 'input legal-editor' });
  intro.value = support.intro || '';
  const email = textInput('Email');
  email.value = support.email || '';
  const phone = textInput('Phone');
  phone.value = support.phone || '';
  const hours = textInput('Hours');
  hours.value = support.hours || '';
  const whatsapp = textInput('WhatsApp');
  whatsapp.value = support.whatsapp || '';
  const website = textInput('Website');
  website.value = support.website || '';
  const notes = el('textarea', { class: 'input' });
  notes.value = support.notes || '';
  const err = el('div', { class: 'form-error' });
  return el('div', { class: 'card help-block' }, [
    el('h2', { text: 'Support page' }),
    el('p', { class: 'muted', text: 'This contact information appears on Help and on the public Support page.' }),
    field('Title', title),
    field('Intro', intro),
    field('Email', email),
    field('Phone', phone),
    field('Hours', hours),
    field('WhatsApp number', whatsapp),
    field('Website', website),
    field('Notes', notes),
    err,
    el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onClick: async () => {
        err.textContent = '';
        try {
          await api('admin', 'save-support', {
            body: {
              title: title.value.trim(),
              intro: intro.value.trim(),
              email: email.value.trim() || null,
              phone: phone.value.trim() || null,
              hours: hours.value.trim() || null,
              whatsapp: whatsapp.value.trim() || null,
              website: website.value.trim() || null,
              notes: notes.value.trim() || null,
            },
          });
          toast('Support page saved');
          refreshPanel();
        } catch (e) {
          err.textContent = e.message;
          toast(e.message, 'err');
        }
      },
    }, ['Save support']),
  ]);
}

function FeedbackSettingsEditor({ settings }) {
  const title = textInput('Title');
  title.value = settings.title || 'Feedback';
  const intro = el('textarea', { class: 'input legal-editor' });
  intro.value = settings.intro || '';
  const categories = el('textarea', { class: 'input' });
  categories.value = (settings.categories || []).join('\n');
  const err = el('div', { class: 'form-error' });
  return el('div', { class: 'card help-block' }, [
    el('h2', { text: 'Feedback form' }),
    el('p', { class: 'muted', text: 'People see this intro and these categories. One category per line.' }),
    field('Title', title),
    field('Intro', intro),
    field('Categories', categories),
    err,
    el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onClick: async () => {
        err.textContent = '';
        try {
          await api('admin', 'save-feedback-settings', {
            body: {
              title: title.value.trim(),
              intro: intro.value.trim(),
              categories: categories.value,
            },
          });
          toast('Feedback form saved');
          refreshPanel();
        } catch (e) {
          err.textContent = e.message;
          toast(e.message, 'err');
        }
      },
    }, ['Save feedback form']),
  ]);
}

function Inbox({ submissions }) {
  if (!submissions?.length) return el('p', { class: 'muted', text: 'No feedback yet.' });
  const statusOptions = [
    { value: 'NEW', label: 'New' },
    { value: 'REVIEWING', label: 'Reviewing' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];
  return el('div', { class: 'grid' }, submissions.map((row) => {
    const status = el('select', { class: 'input' }, statusOptions.map((opt) =>
      el('option', { value: opt.value, text: opt.label }),
    ));
    status.value = row.status || 'NEW';
    const note = el('textarea', { class: 'input', rows: '3' });
    note.value = row.adminNote || '';
    return el('article', { class: 'card help-block' }, [
      el('p', { class: 'muted', text: `${row.category} · ${row.createdAt?.slice(0, 10) || ''}` }),
      el('h2', { text: row.name || row.email || 'Feedback' }),
      row.email ? el('p', { text: row.email }) : null,
      el('p', { text: row.message }),
      field('Status', status),
      field('Admin note', note),
      el('button', {
        class: 'btn',
        type: 'button',
        onClick: async () => {
          try {
            await api('admin', 'update-feedback', {
              body: { id: row.id, status: status.value, adminNote: note.value.trim() || null },
            });
            toast('Feedback updated');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Save']),
    ]);
  }));
}

export async function HelpPanel({ fn = 'system', editable = false, user } = {}) {
  const tab = helpTabFromUrl();
  let data = FALLBACK_HELP;
  try {
    data = await api(editable ? 'admin' : fn, 'help', { body: {} });
  } catch (e) {
    if (editable) throw e;
  }
  const extra = editable ? [{ id: 'inbox', label: `Inbox${data.submissions?.length ? ` (${data.submissions.length})` : ''}` }] : [];
  let body;
  if (editable && tab === 'faq') body = FaqEditor({ faqs: data.faqs });
  else if (tab === 'faq') {
    body = el('div', { class: 'card help-block' }, [el('h2', { text: 'FAQs' }), FaqList({ faqs: data.faqs })]);
  } else if (editable && tab === 'support') body = SupportEditor({ support: data.support || FALLBACK_HELP.support });
  else if (tab === 'support') {
    body = el('div', { class: 'card help-block' }, [
      el('h2', { text: data.support?.title || 'Support' }),
      SupportCard({ support: data.support || FALLBACK_HELP.support }),
    ]);
  } else if (editable && tab === 'feedback') {
    body = el('div', { class: 'grid' }, [
      FeedbackSettingsEditor({ settings: data.feedback || FALLBACK_HELP.feedback }),
      el('div', { class: 'card help-block' }, [
        el('h2', { text: 'Preview' }),
        FeedbackForm({ settings: data.feedback || FALLBACK_HELP.feedback, user }),
      ]),
    ]);
  } else if (tab === 'feedback') {
    body = el('div', { class: 'card help-block' }, [
      el('h2', { text: data.feedback?.title || 'Feedback' }),
      FeedbackForm({ settings: data.feedback || FALLBACK_HELP.feedback, user }),
    ]);
  } else if (editable && tab === 'inbox') body = Inbox({ submissions: data.submissions });
  else body = FaqList({ faqs: data.faqs });

  return el('div', { class: 'help-page' }, [
    el('div', { class: 'card help-block' }, [
      el('h2', { text: 'Help' }),
      el('p', {
        class: 'muted',
        text: editable
          ? 'Edit the FAQs, support contacts, and feedback form that everyone else sees. Inbox is submitted feedback.'
          : 'Answers, how to reach Clock-Kit, and a way to send feedback.',
      }),
      tabs(tab, extra),
    ]),
    body,
  ]);
}
