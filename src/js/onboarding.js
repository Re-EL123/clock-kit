import { el, toast } from './utils/dom.js';
import { api, persistUser, currentUser } from './api.js';
import { Modal, dismissModal } from './components/modal.js';
import { AccountForm } from './components/account-form.js';
import { startTour } from './tour.js';
import { withBase } from './config.js';

const NUDGE_MS = 12 * 60 * 60 * 1000;
const CHECK_MS = 60 * 60 * 1000;

function nudgeKey(userId) {
  return `ck_nudge_${userId}`;
}

function nudgeStale(userId) {
  try {
    const last = Number(localStorage.getItem(nudgeKey(userId)) || 0);
    return !last || Date.now() - last > NUDGE_MS;
  } catch {
    return true;
  }
}

function markNudge(userId) {
  try {
    localStorage.setItem(nudgeKey(userId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

function reminderItems(checklist) {
  return (checklist?.items || []).filter((item) => item.code !== 'TERMS');
}

function busyUi() {
  return Boolean(document.querySelector('.ck-tour, .modal-backdrop.is-blocking, .ck-reminder-modal'));
}

function legalBlock(doc, emptyLabel) {
  if (!doc) return el('p', { class: 'muted', text: emptyLabel });
  return el('article', { class: 'legal-doc' }, [
    el('h3', { text: `${doc.title || emptyLabel} · v${doc.version || 1}` }),
    ...(doc.sections || []).map((section) =>
      el('section', {}, [
        el('h4', { text: section.heading }),
        el('p', { text: section.body }),
      ]),
    ),
  ]);
}

function showLegalModal(checklist) {
  return new Promise((resolve) => {
    const agree = el('input', { type: 'checkbox', id: 'ck-legal-agree' });
    const err = el('div', { class: 'form-error' });
    const node = Modal({
      title: 'Updated Terms and Privacy Policy',
      dismissible: false,
      wide: true,
      children: [
        el('p', { text: 'Please read the current documents. You need to accept them before you continue.' }),
        legalBlock(checklist.legal?.terms, 'Terms and Conditions'),
        legalBlock(checklist.legal?.privacy, 'Privacy Policy'),
        el('label', { class: 'legal-agree icon-label', style: 'margin-top:0.8rem' }, [
          agree,
          'I have read and accept the Terms and Conditions and the Privacy Policy.',
        ]),
        err,
        el('div', { class: 'modal-actions' }, [
          el('a', { class: 'btn', href: withBase('terms.html'), target: '_blank' }, ['Open Terms']),
          el('a', { class: 'btn', href: withBase('privacy.html'), target: '_blank' }, ['Open Privacy']),
          el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: async (ev) => {
              const btn = ev.currentTarget;
              if (!agree.checked) {
                err.textContent = 'Tick the box to confirm you have read both documents.';
                return;
              }
              btn.disabled = true;
              try {
                const data = await api('auth', 'accept-legal', { body: {} });
                if (data.user) persistUser({ ...currentUser(), ...data.user });
                dismissModal(node);
                resolve(true);
              } catch (e) {
                btn.disabled = false;
                err.textContent = e.message;
                toast(e.message, 'err');
              }
            },
          }, ['Accept and continue']),
        ]),
      ],
    });
    document.body.append(node);
  });
}

function showReminder(checklist, user, { force = false } = {}) {
  const items = reminderItems(checklist);
  if (!items.length || busyUi()) return false;
  if (document.querySelector('.ck-reminder-modal')) return false;
  if (!force && !nudgeStale(user.id)) return false;
  markNudge(user.id);
  const needsProfile = items.some((item) => item.view === 'profile');
  const firstNav = items.find((item) => item.view && item.view !== 'profile');
  const node = Modal({
    title: 'Finish these Clock-Kit items',
    onClose: () => node.remove(),
    children: [
      el('ul', { class: 'legal-reminders' }, items.map((item) => el('li', { text: item.title }))),
      needsProfile
        ? AccountForm({
          user: checklist.user || user,
          candidate: checklist.candidate,
          showIdentity: user.role === 'CANDIDATE',
        })
        : null,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', type: 'button', onClick: () => node.remove() }, ['Later']),
        firstNav
          ? el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: () => {
              node.remove();
              window.dispatchEvent(new CustomEvent('ck:go', { detail: { view: firstNav.view } }));
            },
          }, ['Open'])
          : null,
      ]),
    ],
  });
  node.classList.add('ck-reminder-modal');
  document.body.append(node);
  toast('You still have unfinished Clock-Kit items');
  return true;
}

function paintBanner(checklist, user) {
  document.querySelector('.ck-nudge-banner')?.remove();
  const items = reminderItems(checklist);
  if (!items.length) return;
  const banner = el('div', { class: 'ck-nudge-banner', role: 'status' }, [
    el('strong', { text: 'Still needed' }),
    el('span', { text: items.map((item) => item.title).join(' · ') }),
    el('button', {
      class: 'btn',
      type: 'button',
      onClick: () => showReminder(checklist, user, { force: true }),
    }, ['Review']),
  ]);
  document.querySelector('.shell-main .topbar')?.after(banner);
}

async function refreshChecklist({ remind = false, popup = false } = {}) {
  let checklist;
  try {
    checklist = await api('auth', 'checklist', { body: { remind } });
  } catch {
    return null;
  }
  if (checklist.user) persistUser({ ...currentUser(), ...checklist.user });
  const nextUser = currentUser();
  if (!nextUser) return checklist;
  if (!checklist.termsAccepted) {
    if (!document.querySelector('.modal-backdrop.is-blocking')) {
      await showLegalModal(checklist);
      return refreshChecklist({ remind: false, popup: false });
    }
    return checklist;
  }
  paintBanner(checklist, nextUser);
  if (popup && !busyUi()) showReminder(checklist, nextUser);
  return checklist;
}

function schedulePeriodic(user) {
  const tick = () => {
    if (document.hidden) return;
    const next = currentUser() || user;
    const due = next?.id ? nudgeStale(next.id) : false;
    refreshChecklist({ remind: due, popup: due });
  };
  setInterval(tick, CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
}

let started = false;

export async function startOnboarding({ user, items }) {
  if (started) return;
  if (!user || location.pathname.includes('/kiosk')) return;
  started = true;

  let checklist;
  try {
    checklist = await api('auth', 'checklist', { body: { remind: true } });
  } catch {
    started = false;
    return;
  }
  if (checklist.user) persistUser({ ...user, ...checklist.user });
  const nextUser = currentUser() || user;

  if (!checklist.termsAccepted) {
    await showLegalModal(checklist);
    try {
      checklist = await api('auth', 'checklist', { body: { remind: false } });
    } catch {
      return;
    }
  }

  const replay = () => startTour({ user: nextUser, items, onDone: () => refreshChecklist({ popup: false }) });
  window.addEventListener('ck:tour', replay);
  window.addEventListener('ck:profile-saved', () => {
    document.querySelector('.ck-reminder-modal')?.remove();
    refreshChecklist({ popup: false });
  });
  schedulePeriodic(nextUser);

  if (!checklist.onboardingCompleted) {
    startTour({
      user: nextUser,
      items,
      onDone: () => refreshChecklist({ popup: false }),
    });
    return;
  }
  paintBanner(checklist, nextUser);
  showReminder(checklist, nextUser);
}
