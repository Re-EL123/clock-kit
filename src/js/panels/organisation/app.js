import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, toast, formatTime } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel, refreshPanel } from '../../runtime.js';
import { StatCard } from '../../components/clock-card.js';
import { can } from '../../permissions.js';
import { isEmail, isPassword } from '../../validators.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'candidates', label: 'Candidates' },
  { view: 'users', label: 'Users' },
  { view: 'hosts', label: 'Hosts' },
  { view: 'sites', label: 'Sites' },
  { view: 'assignments', label: 'Assignments' },
  { view: 'schedules', label: 'Schedules' },
  { view: 'attendance', label: 'Attendance' },
  { view: 'leave', label: 'Leave' },
  { view: 'approvals', label: 'Approvals' },
  { view: 'reports', label: 'Reports' },
  { view: 'audit', label: 'Audit' },
  { view: 'settings', label: 'Settings' },
];

function field(label, input) {
  return el('div', { class: 'field' }, [el('span', { text: label }), input]);
}

function textInput(placeholder, type = 'text') {
  return el('input', { class: 'input', type, placeholder, autocomplete: type === 'password' ? 'new-password' : 'off' });
}

function requireAccountFields({ email, password, confirm }) {
  if (!isEmail(email)) throw new Error('Enter a valid email');
  if (!isPassword(password)) throw new Error('Password must be at least 8 characters');
  if (password !== confirm) throw new Error('Passwords do not match');
}

async function dashboard() {
  const data = await api('organisation', 'dashboard', { body: {} });
  const t = data.today || {};
  const a = data.attention || {};
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-4' }, [
      StatCard('Scheduled', t.scheduled, '?view=attendance'),
      StatCard('Present', t.present, '?view=attendance'),
      StatCard('On break', t.onBreak),
      StatCard('On leave', t.onLeave, '?view=leave'),
    ]),
    el('div', { class: 'grid grid-4' }, [
      StatCard('Missing clock-outs', a.missingClockOuts, '?view=attendance'),
      StatCard('Corrections', a.pendingCorrections, '?view=approvals'),
      StatCard('Pending leave', a.pendingLeave, '?view=approvals'),
      StatCard('Absent', t.absent),
    ]),
  ]);
}

async function candidates() {
  const data = await api('organisation', 'candidates', { body: {} });
  const first = textInput('First name');
  const last = textInput('Last name');
  const email = textInput('Email', 'email');
  const ref = textInput('Reference');
  const password = textInput('Password', 'password');
  const confirm = textInput('Confirm password', 'password');
  const list = table(
    ['Ref', 'Name', 'Email', 'Status'],
    (data.candidates || []).map((c) => [c.candidate_reference, `${c.first_name} ${c.last_name}`, c.email, c.status]),
  );
  if (!can(user.role, 'createCandidate')) {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'You can view candidates. Creating accounts is limited to organisation owners, admins, and managers.' }),
      list,
    ]);
  }
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create candidate account' }),
      el('p', { class: 'muted', text: 'The candidate signs in with this email and password.' }),
      field('Reference', ref),
      field('First name', first),
      field('Last name', last),
      field('Email', email),
      field('Password', password),
      field('Confirm password', confirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!ref.value.trim() || !first.value.trim() || !last.value.trim()) {
              throw new Error('Reference and name are required');
            }
            requireAccountFields({ email: email.value, password: password.value, confirm: confirm.value });
            await api('organisation', 'create-candidate', {
              body: {
                candidateReference: ref.value.trim(),
                firstName: first.value.trim(),
                lastName: last.value.trim(),
                email: email.value.trim(),
                password: password.value,
              },
            });
            toast('Candidate account created. They can sign in now.');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create candidate account']),
    ]),
    list,
  ]);
}

async function users() {
  const data = await api('organisation', 'users', { body: {} });
  return el('div', { class: 'grid' }, [
    el('p', {
      class: 'muted',
      text: can(user.role, 'createHost')
        ? 'Host and candidate logins are created on the Hosts and Candidates pages, with a password they can use immediately.'
        : 'You can view organisation users. Creating host and candidate accounts is limited to owners, admins, and managers.',
    }),
    table(
      ['Name', 'Email', 'Role', 'Status'],
      (data.users || []).map((u) => [u.display_name, u.email, u.role, u.status]),
    ),
  ]);
}

async function hosts() {
  const data = await api('organisation', 'hosts', { body: {} });
  const name = textInput('Host name');
  const contact = textInput('Login name');
  const email = textInput('Login email', 'email');
  const password = textInput('Password', 'password');
  const confirm = textInput('Confirm password', 'password');
  const list = table(
    ['Host', 'Sites', 'Status'],
    (data.hosts || []).map((h) => [h.name, String(h.sites?.length || 0), h.status]),
  );
  if (!can(user.role, 'createHost')) {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'You can view hosts. Creating host accounts is limited to organisation owners, admins, and managers.' }),
      list,
    ]);
  }
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create host account' }),
      el('p', { class: 'muted', text: 'Creates the host and a HOST login. They sign in with this email and password.' }),
      field('Host name', name),
      field('Login name', contact),
      field('Email', email),
      field('Password', password),
      field('Confirm password', confirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!name.value.trim() || !contact.value.trim()) throw new Error('Host name and login name are required');
            requireAccountFields({ email: email.value, password: password.value, confirm: confirm.value });
            await api('organisation', 'create-host', {
              body: {
                name: name.value.trim(),
                contactName: contact.value.trim(),
                contactEmail: email.value.trim(),
                password: password.value,
              },
            });
            toast('Host account created. They can sign in now.');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create host account']),
    ]),
    list,
  ]);
}

async function sites() {
  const hostsData = await api('organisation', 'hosts', { body: {} });
  const data = await api('organisation', 'sites', { body: {} });
  const hostSel = el(
    'select',
    { class: 'input' },
    (hostsData.hosts || []).map((h) => el('option', { value: h.id, text: h.name })),
  );
  const name = el('input', { class: 'input', placeholder: 'Site name' });
  const lat = el('input', { class: 'input', placeholder: 'Latitude' });
  const lng = el('input', { class: 'input', placeholder: 'Longitude' });
  const mode = el('select', { class: 'input' }, [
    el('option', { value: 'DISABLED', text: 'Disabled' }),
    el('option', { value: 'SOFT', text: 'Soft' }),
    el('option', { value: 'STRICT', text: 'Strict' }),
  ]);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create site' }),
      field('Host', hostSel),
      field('Name', name),
      field('Latitude', lat),
      field('Longitude', lng),
      field('Geofence', mode),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            await api('organisation', 'create-site', {
              body: {
                hostId: hostSel.value,
                name: name.value,
                latitude: lat.value ? Number(lat.value) : undefined,
                longitude: lng.value ? Number(lng.value) : undefined,
                geofenceMode: mode.value,
              },
            });
            toast('Site created');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create site']),
    ]),
    table(
      ['Site', 'Mode', 'Status'],
      (data.sites || []).map((s) => [s.name, s.geofence_mode, s.status]),
    ),
  ]);
}

async function assignments() {
  const [asg, cands, hostsData] = await Promise.all([
    api('organisation', 'assignments', { body: {} }),
    api('organisation', 'candidates', { body: {} }),
    api('organisation', 'hosts', { body: {} }),
  ]);
  const sites = await api('organisation', 'sites', { body: {} });
  const candSel = el('select', { class: 'input' }, (cands.candidates || []).map((c) => el('option', { value: c.id, text: `${c.first_name} ${c.last_name}` })));
  const hostSel = el('select', { class: 'input' }, (hostsData.hosts || []).map((h) => el('option', { value: h.id, text: h.name })));
  const siteSel = el('select', { class: 'input' }, (sites.sites || []).map((s) => el('option', { value: s.id, text: s.name })));
  const start = el('input', { class: 'input', type: 'date' });
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Assign candidate' }),
      field('Candidate', candSel),
      field('Host', hostSel),
      field('Site', siteSel),
      field('Start date', start),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            await api('organisation', 'create-assignment', {
              body: {
                candidateId: candSel.value,
                hostId: hostSel.value,
                siteId: siteSel.value,
                startDate: start.value,
                roleTitle: 'Warehouse Assistant',
              },
            });
            toast('Assignment saved');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Assign']),
    ]),
    table(
      ['Candidate', 'Host', 'Site', 'Status'],
      (asg.assignments || []).map((a) => [
        `${a.candidates?.first_name || ''} ${a.candidates?.last_name || ''}`,
        a.hosts?.name || '',
        a.sites?.name || '',
        a.status,
      ]),
    ),
  ]);
}

async function schedules() {
  const data = await api('schedule', 'list', { body: {} });
  return table(
    ['Name', 'Timezone', 'Status'],
    (data.schedules || []).map((s) => [s.name, s.timezone, s.status]),
  );
}

async function attendance() {
  const data = await api('attendance', 'attendance', { body: {} });
  return table(
    ['Date', 'Candidate', 'In', 'Out', 'Status'],
    (data.sessions || []).map((s) => [
      s.clocked_in_at?.slice(0, 10),
      `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
      formatTime(s.clocked_in_at),
      formatTime(s.clocked_out_at),
      s.status,
    ]),
  );
}

async function leaveView() {
  const data = await api('leave', 'list', { body: {} });
  return table(
    ['Candidate', 'Dates', 'Hours', 'Status'],
    (data.requests || []).map((r) => [
      `${r.candidates?.first_name || ''} ${r.candidates?.last_name || ''}`,
      `${r.start_date} → ${r.end_date}`,
      String(r.hours),
      r.status,
    ]),
  );
}

async function approvals() {
  const [leave, corr] = await Promise.all([
    api('leave', 'list', { body: { status: 'PENDING' } }),
    api('attendance', 'corrections', { body: { status: 'PENDING' } }),
  ]);
  return el('div', { class: 'grid grid-2' }, [
    el('div', {}, [
      el('h3', { text: 'Leave' }),
      ...(leave.requests || []).map((r) =>
        el('div', { class: 'card', style: 'padding:1rem;margin-bottom:.6rem' }, [
          el('strong', { text: `${r.candidates?.first_name} ${r.candidates?.last_name}` }),
          el('div', { text: `${r.start_date} → ${r.end_date}` }),
          el('button', {
            class: 'btn btn-primary mt',
            onClick: async () => {
              await api('leave', 'approve', { body: { id: r.id } });
              refreshPanel();
            },
          }, ['Approve']),
          el('button', {
            class: 'btn mt',
            onClick: async () => {
              await api('leave', 'reject', { body: { id: r.id } });
              refreshPanel();
            },
          }, ['Reject']),
        ]),
      ),
    ]),
    el('div', {}, [
      el('h3', { text: 'Corrections' }),
      ...(corr.corrections || []).map((c) =>
        el('div', { class: 'card', style: 'padding:1rem;margin-bottom:.6rem' }, [
          el('div', { text: `ORIGINAL ${formatTime(c.attendance_sessions?.clocked_out_at)}` }),
          el('div', { text: c.reason }),
          el('button', {
            class: 'btn btn-primary mt',
            onClick: async () => {
              await api('attendance', 'approve-correction', { body: { id: c.id } });
              refreshPanel();
            },
          }, ['Approve']),
          el('button', {
            class: 'btn mt',
            onClick: async () => {
              await api('attendance', 'reject-correction', { body: { id: c.id } });
              refreshPanel();
            },
          }, ['Reject']),
        ]),
      ),
    ]),
  ]);
}

async function reports() {
  return el('div', { class: 'card', style: 'padding:1rem' }, [
    el('h2', { text: 'Attendance CSV' }),
    el('button', {
      class: 'btn btn-primary',
      onClick: async () => {
        const data = await api('attendance', 'export', { body: {} });
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const a = el('a', { href: URL.createObjectURL(blob), download: data.filename || 'attendance.csv' });
        a.click();
      },
    }, ['Download CSV']),
  ]);
}

async function audit() {
  const data = await api('organisation', 'audit', { body: {} });
  return table(
    ['When', 'Action', 'Actor'],
    (data.events || []).map((e) => [formatTime(e.created_at), e.action, e.actor_role || '']),
  );
}

async function settings() {
  const data = await api('organisation', 'settings', { body: {} });
  return el('div', { class: 'card', style: 'padding:1rem' }, [
    el('h2', { text: data.settings?.name || 'Settings' }),
    el('p', { text: `Timezone: ${data.settings?.timezone}` }),
    el('p', { text: `Retention: ${data.settings?.retention_period_days} days` }),
    el('p', { class: 'muted', text: data.settings?.legal_hold ? 'Legal hold is ON' : 'Legal hold is off' }),
  ]);
}

const user = Auth.requireRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER', 'ORG_VIEWER');
await bootPanel({
  title: 'Organisation',
  items: NAV,
  user,
  defaultView: 'dashboard',
  views: {
    dashboard,
    candidates,
    users,
    hosts,
    sites,
    assignments,
    schedules,
    attendance,
    leave: leaveView,
    approvals,
    reports,
    audit,
    settings,
  },
});
