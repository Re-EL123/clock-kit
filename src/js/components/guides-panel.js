import { api } from '../api.js';
import { el, toast, downloadBase64 } from '../utils/dom.js';
import { icon } from '../icons.js';
import { formatPublished } from '../legal-format.js';

export const GUIDE_KIND_LABEL = {
  SOP: 'Standard operating procedure',
  MANUAL: 'Training manual',
};

export const GUIDE_AUDIENCE_LABEL = {
  ORG_OWNER: 'Organisation owner',
  ORG_ADMIN: 'Organisation admin',
  ORG_MANAGER: 'Organisation manager',
  ORG_VIEWER: 'Organisation viewer',
  HOST: 'Host workplace',
};

export async function downloadGuide(fn, kind, audience) {
  const data = await api(fn, 'guide-pdf', { body: { kind, audience } });
  downloadBase64(data.filename || 'clock-kit-guide.pdf', data.pdfBase64);
}

function kindBadge(kind) {
  return el('span', {
    class: `guide-kind${kind === 'SOP' ? ' is-sop' : ' is-manual'}`,
    text: kind === 'SOP' ? 'SOP' : 'Training',
  });
}

export function GuideCard({ doc, fn }) {
  return el('article', { class: 'card guide-card' }, [
    el('div', { class: 'guide-card-head' }, [
      kindBadge(doc.kind),
      el('p', { class: 'muted', text: GUIDE_AUDIENCE_LABEL[doc.audience] || doc.audience }),
    ]),
    el('h2', { text: doc.title || GUIDE_KIND_LABEL[doc.kind] }),
    el('p', {
      class: 'muted',
      text: doc.version
        ? `Version ${doc.version}${doc.publishedAt ? ` · ${formatPublished(doc.publishedAt)}` : ''}`
        : 'Clock-Kit branded PDF',
    }),
    el('p', {
      class: 'guide-preview',
      text: doc.sections?.[0]?.body || 'Download the branded PDF for this role.',
    }),
    el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onClick: async () => {
        try {
          await downloadGuide(fn, doc.kind, doc.audience);
        } catch (e) {
          toast(e.message, 'err');
        }
      },
    }, [
      icon('file-text', { size: 16 }),
      'Download PDF',
    ]),
  ]);
}

export function GuidesLibrary({ documents, fn }) {
  const groups = [];
  for (const doc of documents || []) {
    const last = groups[groups.length - 1];
    if (last && last.audience === doc.audience) last.docs.push(doc);
    else groups.push({ audience: doc.audience, docs: [doc] });
  }
  if (!groups.length) {
    return el('p', { class: 'muted', text: 'No operating documents are available for your role yet.' });
  }
  return el('div', { class: 'guide-library' }, groups.map((group) =>
    el('section', { class: 'guide-group' }, [
      groups.length > 1
        ? el('h2', { class: 'guide-group-title', text: GUIDE_AUDIENCE_LABEL[group.audience] || group.audience })
        : null,
      el('div', { class: 'guide-grid' }, group.docs.map((doc) => GuideCard({ doc, fn }))),
    ]),
  ));
}

export async function GuidesPanel({ fn }) {
  const data = await api(fn, 'guides', { body: {} });
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Operating documents' }),
      el('p', {
        class: 'muted',
        text: 'Download the Clock-Kit branded standard operating procedure and training manual for your role. Server time is official.',
      }),
    ]),
    GuidesLibrary({ documents: data.documents, fn }),
  ]);
}
