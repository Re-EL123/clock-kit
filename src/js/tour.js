import { el } from './utils/dom.js';
import { api, persistUser, currentUser } from './api.js';

const STEPS = {
  CANDIDATE: [
    { view: 'home', title: 'Home', body: 'Clock in, start a break, and clock out here. Server time is the official time.' },
    { view: 'attendance', title: 'Attendance', body: 'Your days, host, and host review status are listed here.' },
    { view: 'leave', title: 'Leave', body: 'Request leave and watch the status until your organisation reviews it.' },
    { view: 'schedule', title: 'Schedule', body: 'See the shifts your organisation published for you.' },
    { view: 'profile', title: 'Profile', body: 'Keep your phone, ID or passport, and nationality up to date.' },
  ],
  HOST: [
    { view: 'dashboard', title: 'Dashboard', body: 'See who is scheduled and present at your workplace today.' },
    { view: 'candidates', title: 'Candidates', body: 'Students placed with you, including ID or passport numbers.' },
    { view: 'attendance', title: 'Attendance', body: 'Confirm, reject, or correct each day’s clock times.' },
    { view: 'profile', title: 'Account', body: 'Add a phone number so we can reach you.' },
  ],
  ORG_OWNER: [
    { view: 'dashboard', title: 'Dashboard', body: 'Today’s staffing picture for your organisation.' },
    { view: 'candidates', title: 'Candidates', body: 'Create candidate logins and assign a manager to each student.' },
    { view: 'attendance', title: 'Attendance', body: 'Review clock times, hosts, and ID numbers.' },
    { view: 'approvals', title: 'Approvals', body: 'Leave and correction requests wait here until you decide.' },
    { view: 'reports', title: 'Reports', body: 'Download weekly or monthly timesheet PDFs.' },
    { view: 'profile', title: 'Account', body: 'Add a phone number so we can reach you.' },
  ],
  PLATFORM_ADMIN: [
    { view: 'dashboard', title: 'Dashboard', body: 'Platform-wide counts across organisations.' },
    { view: 'organisations', title: 'Organisations', body: 'Create organisations and owner logins. There is no self-signup.' },
    { view: 'legal', title: 'Legal', body: 'Edit Terms and the Privacy Policy. Publishing a new version asks every user to accept it again.' },
    { view: 'profile', title: 'Account', body: 'Add a phone number so we can reach you.' },
    { view: 'health', title: 'Health', body: 'Check that the API and database are responding.' },
  ],
};

STEPS.ORG_ADMIN = STEPS.ORG_OWNER;
STEPS.ORG_MANAGER = STEPS.ORG_OWNER;
STEPS.ORG_VIEWER = STEPS.ORG_OWNER.filter((step) => step.view !== 'approvals');

function stepsFor(role, items = []) {
  const allowed = new Set((items || []).map((item) => item.view));
  return (STEPS[role] || STEPS.ORG_OWNER).filter((step) => !allowed.size || allowed.has(step.view));
}

function go(view) {
  window.dispatchEvent(new CustomEvent('ck:go', { detail: { view } }));
}

export function startTour({ user, items, onDone } = {}) {
  if (document.querySelector('.ck-tour')) return;
  const steps = stepsFor(user?.role, items);
  if (!steps.length) {
    onDone?.();
    return;
  }
  let index = 0;
  const overlay = el('div', { class: 'ck-tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Clock-Kit tour' });

  function clearSpot() {
    document.querySelectorAll('.nav-link.ck-tour-spot').forEach((node) => node.classList.remove('ck-tour-spot'));
  }

  function paint() {
    const step = steps[index];
    clearSpot();
    go(step.view);
    requestAnimationFrame(() => {
      document.querySelector(`.nav-link[data-view="${step.view}"]`)?.classList.add('ck-tour-spot');
    });
    overlay.replaceChildren(
      el('div', { class: 'ck-tour-card card' }, [
        el('p', { class: 'muted', text: `Step ${index + 1} of ${steps.length}` }),
        el('h2', { text: step.title }),
        el('p', { text: step.body }),
        el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn', type: 'button', onClick: finish }, ['Skip']),
          index > 0
            ? el('button', {
              class: 'btn',
              type: 'button',
              onClick: () => {
                index -= 1;
                paint();
              },
            }, ['Back'])
            : null,
          el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: () => {
              if (index >= steps.length - 1) finish();
              else {
                index += 1;
                paint();
              }
            },
          }, [index >= steps.length - 1 ? 'Finish' : 'Next']),
        ]),
      ]),
    );
  }

  async function finish() {
    overlay.remove();
    clearSpot();
    try {
      const data = await api('auth', 'complete-onboarding', { body: {} });
      if (data.user) persistUser({ ...currentUser(), ...data.user });
    } catch {
      /* still close the tour */
    }
    onDone?.();
  }

  document.body.append(overlay);
  paint();
}
