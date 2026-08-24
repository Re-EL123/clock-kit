import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, formatTime, toast } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel } from '../../runtime.js';
import { StatCard } from '../../components/clock-card.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'candidates', label: 'Candidates' },
  { view: 'attendance', label: 'Attendance' },
  { view: 'schedule', label: 'Schedule' },
  { view: 'profile', label: 'Profile' },
];

async function dashboard() {
  const data = await api('host', 'dashboard', { body: {} });
  const t = data.today || {};
  return el('div', { class: 'grid grid-4' }, [
    StatCard('Scheduled', t.scheduled),
    StatCard('Present', data.presentNow ?? t.present),
    StatCard('On break', t.onBreak),
    StatCard('On leave', t.onLeave),
  ]);
}

async function candidates() {
  const data = await api('host', 'candidates', { body: {} });
  return table(
    ['Name', 'Reference', 'Role'],
    (data.candidates || []).map((c) => [`${c.first_name} ${c.last_name}`, c.candidate_reference, c.assignment?.role_title || '']),
  );
}

async function attendance() {
  const data = await api('host', 'attendance', { body: {} });
  return table(
    ['Candidate', 'In', 'Out', 'Status'],
    (data.sessions || []).map((s) => [
      `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
      formatTime(s.clocked_in_at),
      formatTime(s.clocked_out_at),
      s.status,
    ]),
  );
}

async function schedule() {
  const data = await api('host', 'schedule', { body: {} });
  return table(
    ['Candidate', 'Start', 'End'],
    (data.shifts || []).map((s) => [
      `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
      formatTime(s.start_at),
      formatTime(s.end_at),
    ]),
  );
}

const user = Auth.requireRole('HOST');
await bootPanel({
  title: 'Host',
  items: NAV,
  user,
  defaultView: 'dashboard',
  views: {
    dashboard,
    candidates,
    attendance,
    schedule,
    profile: () => el('div', { text: user.displayName }),
  },
});
