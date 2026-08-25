import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, formatTime, liveText, nowClock, toast } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel, refreshPanel } from '../../runtime.js';
import { ClockFace, StatusChip } from '../../components/clock-card.js';
import { hoursTrendChart, reviewChart, leaveBalanceChart, leaveStatusChart } from '../../components/charts.js';
import { icon } from '../../icons.js';
import { captureLocation } from '../../geolocation.js';
import { flushQueue, pendingCount, queueClock } from '../../offline.js';
import { AccountForm } from '../../components/account-form.js';
import { AlertsPanel } from '../../components/alerts-panel.js';

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
  const payload = { ...body, source: 'APP' };
  if (location) payload.location = location;
  if (!payload.siteId) delete payload.siteId;
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
  liveText(digital, (node) => {
    node.textContent = nowClock();
  }, 250);

  const actions = el('div', { class: 'actions' });
  if (state === 'OFF_DUTY') {
    if (!assignment) {
      actions.append(
        el('p', {
          class: 'muted',
          text: 'You do not have an active host assignment, so you cannot clock in yet.',
        }),
      );
    } else if (!assignment.site_id) {
      actions.append(
        el('p', {
          class: 'muted',
          text: 'No site is assigned to you yet. Ask your organisation to assign a site.',
        }),
      );
    } else {
      actions.append(
        el('button', {
          class: 'btn btn-primary',
          onClick: async () => {
            try {
              const result = await mutateClock('clock-in', { siteId: assignment.site_id });
              if (!result?.pending) toast('Clocked in');
              refreshPanel();
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, [icon('log-in'), 'CLOCK IN']),
      );
    }
  } else if (state === 'WORKING') {
    actions.append(
      el('button', {
        class: 'btn btn-gold',
        onClick: async () => {
            try {
              const result = await mutateClock('start-break', { type: 'MEAL' });
              if (!result?.pending) toast('Break started');
              refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('coffee'), 'START BREAK']),
      el('button', {
        class: 'btn btn-danger',
        onClick: async () => {
            try {
              const result = await mutateClock('clock-out');
              if (!result?.pending) toast('Clocked out');
              refreshPanel();
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
              const result = await mutateClock('end-break');
              if (!result?.pending) toast('Break ended');
              refreshPanel();
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
  const sessions = data.sessions || [];
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-2 grid-charts' }, [
      reviewChart(sessions, { title: 'Your host reviews' }),
      hoursTrendChart(sessions, { title: 'Your hours' }),
    ]),
    table(
      ['When', 'Host', 'Site', 'In', 'Out', 'Host review'],
      sessions.map((s) => [
        s.clocked_in_at?.slice(0, 10),
        s.hosts?.name || '—',
        s.sites?.name || '',
        formatTime(s.host_corrected_in_at || s.clocked_in_at),
        formatTime(s.host_corrected_out_at || s.clocked_out_at),
        s.host_review_status === 'CONFIRMED'
          ? `Confirmed${s.host_reviewer?.display_name ? ` by ${s.host_reviewer.display_name}` : ''}`
          : s.host_review_status === 'REJECTED'
            ? `Rejected${s.host_reviewer?.display_name ? ` by ${s.host_reviewer.display_name}` : ''}`
            : 'Unreviewed',
      ]),
    ),
  ]);
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
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, [icon('plus', { size: 18 }), 'Submit']),
    ]),
    el('div', {}, [
      el('h3', { text: 'Balances' }),
      leaveBalanceChart(balances.balances || []),
      table(
        ['Type', 'Available'],
        (balances.balances || []).map((b) => [b.leave_types?.name || '', String(b.available_hours)]),
      ),
      el('h3', { class: 'mt', text: 'Requests' }),
      leaveStatusChart(reqs.requests || []),
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

async function profile() {
  let extra = { user, candidate: null };
  try {
    extra = await api('auth', 'checklist', { body: { remind: false } });
  } catch {
    /* use signed-in user */
  }
  return AccountForm({
    user: extra.user || user,
    candidate: extra.candidate,
    showIdentity: true,
  });
}

const user = Auth.requireRole('CANDIDATE');
await bootPanel({
  title: 'Candidate',
  items: NAV,
  user,
  defaultView: 'home',
  views: {
    home: () => home(user),
    attendance,
    leave,
    schedule,
    notifications: AlertsPanel,
    profile,
  },
});
window.addEventListener('online', () => flushQueue(api));
