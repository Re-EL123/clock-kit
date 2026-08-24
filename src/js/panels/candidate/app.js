import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, viewParam, formatTime, nowClock, toast } from '../../utils/dom.js';
import { shell, table } from '../../components/sidebar.js';
import { ClockFace, StatusChip } from '../../components/clock-card.js';
import { icon } from '../../icons.js';
import { captureLocation } from '../../geolocation.js';
import { flushQueue, pendingCount, queueClock } from '../../offline.js';

const NAV = [
  { view: 'home', label: 'Home' },
  { view: 'attendance', label: 'Attendance' },
  { view: 'leave', label: 'Leave' },
  { view: 'schedule', label: 'Schedule' },
  { view: 'notifications', label: 'Alerts' },
  { view: 'profile', label: 'Profile' },
];

async function mutateClock(action, body = {}) {
  const location = await captureLocation();
  const payload = { ...body, location, source: 'APP' };
  if (!navigator.onLine) {
    queueClock(action, payload);
    toast('Saved locally — PENDING SYNC', 'ok');
    return { pending: true };
  }
  return api('clock', action, { body: payload, idempotent: true });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

async function home(user) {
  let status;
  try {
    status = await api('clock', 'status', { body: {} });
  } catch (err) {
    status = { state: 'OFF_DUTY', error: err.message };
  }
  await flushQueue(api);

  const assignment = status.assignment;
  const state = status.state || 'OFF_DUTY';
  const site = assignment?.sites;
  const digital = el('div', { class: 'digital', text: nowClock() });
  setInterval(() => {
    digital.textContent = nowClock();
  }, 250);

  const actions = el('div', { class: 'actions' });
  if (state === 'OFF_DUTY') {
    actions.append(
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            await mutateClock('clock-in', { siteId: assignment?.site_id });
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('log-in'), 'CLOCK IN']),
    );
  } else if (state === 'WORKING') {
    actions.append(
      el('button', {
        class: 'btn btn-gold',
        onClick: async () => {
          try {
            await mutateClock('start-break', { type: 'MEAL' });
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('coffee'), 'START BREAK']),
      el('button', {
        class: 'btn btn-danger',
        onClick: async () => {
          try {
            await mutateClock('clock-out');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('log-out'), 'CLOCK OUT']),
    );
  } else if (state === 'ON_BREAK') {
    actions.append(
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            await mutateClock('end-break');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('check'), 'END BREAK']),
    );
  }

  const pending = pendingCount();
  return el('section', { class: 'candidate-home card', style: 'padding:1.4rem' }, [
    el('div', { class: 'status-block' }, [
      el('h1', { text: state === 'WORKING' ? 'YOU ARE WORKING' : state === 'ON_BREAK' ? 'ON BREAK' : `${greeting()}, ${user.displayName?.split(' ')[0]?.toUpperCase() || ''}` }),
      StatusChip(pending ? 'PENDING_SYNC' : 'CONFIRMED'),
    ]),
    digital,
    el('div', { class: `clock-wrap ${state === 'WORKING' ? 'is-live' : state === 'ON_BREAK' ? 'is-break' : ''}` }, [ClockFace()]),
    el('div', { class: 'muted' }, [icon('warehouse', { size: 16 }), assignment?.hosts?.name || 'No active host']),
    el('div', { class: 'icon-label', style: 'justify-content:center' }, [icon('sites', { size: 16 }), site?.name || 'No site assigned']),
    pending ? el('div', { class: 'pending' }, [icon('timer', { size: 16 }), `${pending} PENDING SYNC`]) : null,
    actions,
  ]);
}

async function attendance() {
  const data = await api('attendance', 'attendance', { body: {} });
  return table(
    ['When', 'Site', 'In', 'Out', 'Status'],
    (data.sessions || []).map((s) => [
      s.clocked_in_at?.slice(0, 10),
      s.sites?.name || '',
      formatTime(s.clocked_in_at),
      formatTime(s.clocked_out_at),
      s.status,
    ]),
  );
}

async function leave() {
  const [types, reqs, balances] = await Promise.all([
    api('leave', 'types', { body: {} }),
    api('leave', 'list', { body: {} }),
    api('leave', 'balances', { body: {} }),
  ]);
  const typeSelect = el(
    'select',
    { class: 'input' },
    (types.types || []).map((t) => el('option', { value: t.id, text: t.name })),
  );
  const start = el('input', { class: 'input', type: 'date' });
  const end = el('input', { class: 'input', type: 'date' });
  const reason = el('textarea', { class: 'input', rows: '3', placeholder: 'Reason' });

  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Request leave' }),
      el('div', { class: 'field' }, [el('span', { text: 'Type' }), typeSelect]),
      el('div', { class: 'field' }, [el('span', { text: 'Start' }), start]),
      el('div', { class: 'field' }, [el('span', { text: 'End' }), end]),
      el('div', { class: 'field' }, [el('span', { text: 'Reason' }), reason]),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            await api('leave', 'request', {
              body: {
                leaveTypeId: typeSelect.value,
                startDate: start.value,
                endDate: end.value,
                reason: reason.value,
              },
              idempotent: true,
            });
            toast('Leave submitted');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('plus', { size: 18 }), 'Submit']),
    ]),
    el('div', {}, [
      el('h3', { text: 'Balances' }),
      table(
        ['Type', 'Available'],
        (balances.balances || []).map((b) => [b.leave_types?.name || '', String(b.available_hours)]),
      ),
      el('h3', { class: 'mt', text: 'Requests' }),
      table(
        ['Dates', 'Hours', 'Status'],
        (reqs.requests || []).map((r) => [`${r.start_date} → ${r.end_date}`, String(r.hours), r.status]),
      ),
    ]),
  ]);
}

async function schedule() {
  const data = await api('schedule', 'list', { body: { kind: 'shifts' } });
  return table(
    ['Start', 'End', 'Site', 'Status'],
    (data.shifts || []).map((s) => [formatTime(s.start_at), formatTime(s.end_at), s.sites?.name || '', s.status]),
  );
}

async function notifications() {
  const data = await api('notifications', 'list', { body: {} });
  return table(
    ['When', 'Title', 'Message'],
    (data.notifications || []).map((n) => [formatTime(n.created_at), n.title, n.body]),
  );
}

function profile(user) {
  return el('div', { class: 'card', style: 'padding:1.2rem' }, [
    el('h2', { class: 'icon-label' }, [icon('profile'), user.displayName]),
    el('p', { class: 'muted icon-label' }, [icon('mail', { size: 16 }), user.email]),
    el('p', { class: 'icon-label' }, [icon('shield', { size: 16 }), user.role]),
  ]);
}

const user = Auth.requireRole('CANDIDATE');
const view = viewParam('home');
const root = document.getElementById('app');

const views = {
  home: () => home(user),
  attendance,
  leave,
  schedule,
  notifications,
  profile: () => profile(user),
};

const content = await (views[view] || views.home)();
root.append(
  shell({
    title: 'Candidate',
    items: NAV,
    view,
    heading: NAV.find((n) => n.view === view)?.label || 'Home',
    user,
    content,
  }),
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`);
}
window.addEventListener('online', () => flushQueue(api));
