import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, toast, formatTime, downloadBase64, downloadText } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel, refreshPanel } from '../../runtime.js';
import { StatCard } from '../../components/clock-card.js';
import { hoursTrendChart, leaveStatusChart, reviewChart, todayMixChart, attentionChart, weekComboChart, timesheetCharts } from '../../components/charts.js';
import { can } from '../../permissions.js';
import { isEmail, isPassword } from '../../validators.js';
import { nationalitySelect } from '../../nationalities.js';
import { AccountForm } from '../../components/account-form.js';
import { AlertsPanel } from '../../components/alerts-panel.js';
import { SiteForm } from '../../components/site-form.js';
import { Modal } from '../../components/modal.js';

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
  { view: 'billing', label: 'Billing' },
  { view: 'settings', label: 'Settings' },
  { view: 'notifications', label: 'Alerts' },
  { view: 'profile', label: 'Account' },
];

const MANAGER_VIEWS = ['dashboard', 'candidates', 'assignments', 'attendance', 'leave', 'approvals', 'reports', 'notifications', 'profile'];

function navFor(role) {
  if (role === 'ORG_MANAGER') return NAV.filter((item) => MANAGER_VIEWS.includes(item.view));
  if (role === 'ORG_VIEWER') return NAV.filter((item) => item.view !== 'audit' && item.view !== 'billing');
  return NAV;
}

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
    user.role === 'ORG_MANAGER'
      ? el('p', { class: 'muted', text: 'You only see students assigned to you.' })
      : user.role === 'ORG_VIEWER'
        ? el('p', { class: 'muted', text: 'View only. You cannot create records or approve requests.' })
        : null,
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
    el('div', { class: 'grid grid-2 grid-charts' }, [
      todayMixChart(t),
      attentionChart(a),
    ]),
    weekComboChart(data.week),
  ]);
}

async function candidates() {
  const [data, people] = await Promise.all([
    api('organisation', 'candidates', { body: {} }),
    can(user.role, 'assignManager') ? api('organisation', 'users', { body: {} }) : Promise.resolve({ users: [] }),
  ]);
  const managers = (people.users || []).filter((u) => u.role === 'ORG_MANAGER' && u.status !== 'suspended');
  const first = textInput('First name');
  const last = textInput('Last name');
  const idNumber = textInput('ID or passport number');
  const nationality = nationalitySelect(el);
  const sponsor = textInput('Sponsor name');
  const email = textInput('Email', 'email');
  const ref = textInput('Reference');
  const password = textInput('Password', 'password');
  const confirm = textInput('Confirm password', 'password');
  const managerSel = el('select', { class: 'input' }, [
    el('option', { value: '', text: 'Unassigned' }),
    ...managers.map((m) => el('option', { value: m.id, text: m.display_name })),
  ]);

  function managerCell(c) {
    if (!can(user.role, 'assignManager')) return c.manager?.display_name || 'Unassigned';
    const sel = el('select', { class: 'input' }, [
      el('option', { value: '', text: 'Unassigned' }),
      ...managers.map((m) => el('option', { value: m.id, text: m.display_name })),
    ]);
    sel.value = c.manager_user_id || c.manager?.id || '';
    return el('div', { class: 'btn-row' }, [
      sel,
      el('button', {
        class: 'btn',
        onClick: async () => {
          try {
            await api('organisation', 'assign-manager', {
              body: { candidateId: c.id, managerUserId: sel.value || null },
            });
            toast('Manager updated');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Save']),
    ]);
  }

  const list = table(
    ['Ref', 'Name', 'ID / passport', 'Sponsor', 'Nationality', 'Email', 'Manager', 'Status'],
    (data.candidates || []).map((c) => [
      c.candidate_reference,
      `${c.first_name} ${c.last_name}`,
      c.id_number || '—',
      c.sponsor_name || '—',
      c.nationality || '—',
      c.email,
      managerCell(c),
      c.status,
    ]),
  );

  if (user.role === 'ORG_MANAGER') {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'You only see candidates assigned to you.' }),
      list,
    ]);
  }
  if (!can(user.role, 'createCandidate')) {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'View only. You cannot create candidates or assign managers.' }),
      list,
    ]);
  }
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create candidate account' }),
      el('p', { class: 'muted', text: 'The candidate signs in with this email and password. Assign a manager so they only manage this student.' }),
      field('Reference', ref),
      field('First name', first),
      field('Last name', last),
      field('ID / passport number', idNumber),
      field('Sponsor', sponsor),
      field('Nationality', nationality),
      field('Email', email),
      field('Password', password),
      field('Confirm password', confirm),
      field('Manager', managerSel),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!ref.value.trim() || !first.value.trim() || !last.value.trim()) {
              throw new Error('Reference and name are required');
            }
            if (!idNumber.value.trim()) throw new Error('ID or passport number is required');
            if (!sponsor.value.trim()) throw new Error('Sponsor name is required');
            if (!nationality.value) throw new Error('Nationality is required');
            requireAccountFields({ email: email.value, password: password.value, confirm: confirm.value });
            await api('organisation', 'create-candidate', {
              body: {
                candidateReference: ref.value.trim(),
                firstName: first.value.trim(),
                lastName: last.value.trim(),
                idNumber: idNumber.value.trim(),
                sponsorName: sponsor.value.trim(),
                nationality: nationality.value,
                email: email.value.trim(),
                password: password.value,
                managerUserId: managerSel.value || undefined,
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
  const list = table(
    ['Name', 'Email', 'Role', 'Status'],
    (data.users || []).map((u) => [u.display_name, u.email, u.role, u.status]),
  );
  if (!can(user.role, 'createOrgUser')) {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'View only. Managers and viewers cannot create organisation logins.' }),
      list,
    ]);
  }
  const name = textInput('Display name');
  const email = textInput('Email', 'email');
  const password = textInput('Password', 'password');
  const confirm = textInput('Confirm password', 'password');
  const role = el('select', { class: 'input' }, [
    el('option', { value: 'ORG_MANAGER', text: 'Manager' }),
    el('option', { value: 'ORG_VIEWER', text: 'Viewer' }),
    ...(user.role === 'ORG_OWNER' ? [el('option', { value: 'ORG_ADMIN', text: 'Organisation admin' })] : []),
  ]);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create staff login' }),
      el('p', { class: 'muted', text: 'Managers only see candidates assigned to them. Viewers can look but cannot change anything.' }),
      field('Name', name),
      field('Email', email),
      field('Role', role),
      field('Password', password),
      field('Confirm password', confirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!name.value.trim()) throw new Error('Name is required');
            requireAccountFields({ email: email.value, password: password.value, confirm: confirm.value });
            await api('organisation', 'create-user', {
              body: {
                displayName: name.value.trim(),
                email: email.value.trim(),
                password: password.value,
                role: role.value,
              },
            });
            toast('Staff login created. They can sign in now.');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create staff login']),
    ]),
    list,
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
      el('p', { class: 'muted', text: 'You can view hosts. Creating host accounts is limited to organisation owners and admins.' }),
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
  const hostsList = hostsData.hosts || [];
  const canEdit = can(user.role, 'createSite');

  function openEdit(site) {
    const node = Modal({
      title: 'Update site',
      wide: true,
      onClose: () => node.remove(),
      children: [
        SiteForm({
          hosts: hostsList,
          site,
          submitLabel: 'Save changes',
          onSubmit: async (body) => {
            await api('organisation', 'update-site', {
              body: {
                siteId: site.id,
                name: body.name,
                address: body.address,
                latitude: body.latitude,
                longitude: body.longitude,
                geofenceMode: body.geofenceMode,
                geofenceRadiusM: body.geofenceRadiusM,
              },
            });
            toast('Site updated');
            node.remove();
            refreshPanel();
          },
        }),
      ],
    });
    document.body.append(node);
  }

  const list = table(
    ['Site', 'Address', 'Mode', 'Status', ...(canEdit ? ['Edit'] : [])],
    (data.sites || []).map((s) => [
      s.name,
      s.address || '—',
      s.geofence_mode,
      s.status,
      canEdit
        ? el('button', {
          class: 'btn',
          type: 'button',
          onClick: () => openEdit(s),
        }, ['Edit'])
        : null,
    ].filter((cell) => cell !== null)),
  );
  if (!canEdit) {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'View only. You cannot create or update sites.' }),
      list,
    ]);
  }
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Add site' }),
      el('p', { class: 'muted', text: 'Search for the workplace address or pick it on the map. Coordinates are filled in for you.' }),
      SiteForm({
        hosts: hostsList,
        submitLabel: 'Create site',
        onSubmit: async (body) => {
          await api('organisation', 'create-site', { body });
          toast('Site created');
          refreshPanel();
        },
      }),
    ]),
    list,
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
  const list = table(
    ['Candidate', 'Host', 'Site', 'Status'],
    (asg.assignments || []).map((a) => [
      `${a.candidates?.first_name || ''} ${a.candidates?.last_name || ''}`,
      a.hosts?.name || '',
      a.sites?.name || '',
      a.status,
    ]),
  );
  if (!can(user.role, 'assignCandidate')) {
    return el('div', { class: 'grid' }, [
      el('p', { class: 'muted', text: 'View only. You cannot assign candidates to hosts.' }),
      list,
    ]);
  }
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
    list,
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
  const sessions = data.sessions || [];
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-2 grid-charts' }, [
      reviewChart(sessions),
      hoursTrendChart(sessions, { title: 'Recent hours' }),
    ]),
    table(
      ['Date', 'Candidate', 'ID / passport', 'Sponsor', 'Host', 'In', 'Out', 'Host review', 'Reviewed by'],
      sessions.map((s) => [
        s.clocked_in_at?.slice(0, 10),
        `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
        s.candidates?.id_number || '—',
        s.candidates?.sponsor_name || '—',
        s.hosts?.name || '—',
        formatTime(s.host_corrected_in_at || s.clocked_in_at),
        formatTime(s.host_corrected_out_at || s.clocked_out_at),
        s.host_review_status === 'CONFIRMED' ? 'Confirmed' : s.host_review_status === 'REJECTED' ? 'Rejected' : 'Unreviewed',
        s.host_reviewer?.display_name || '—',
      ]),
    ),
  ]);
}

async function leaveView() {
  const data = await api('leave', 'list', { body: {} });
  const requests = data.requests || [];
  return el('div', { class: 'grid' }, [
    leaveStatusChart(requests),
    table(
      ['Candidate', 'Dates', 'Hours', 'Status'],
      requests.map((r) => [
        `${r.candidates?.first_name || ''} ${r.candidates?.last_name || ''}`,
        `${r.start_date} → ${r.end_date}`,
        String(r.hours),
        r.status,
      ]),
    ),
  ]);
}

function reviewButtons(canAct, onApprove, onReject) {
  if (!canAct) return [el('p', { class: 'muted mt', text: 'View only' })];
  return [
    el('button', {
      class: 'btn btn-primary mt',
      onClick: async () => {
        try {
          await onApprove();
          refreshPanel();
        } catch (e) {
          toast(e.message, 'err');
        }
      },
    }, ['Approve']),
    el('button', {
      class: 'btn mt',
      onClick: async () => {
        try {
          await onReject();
          refreshPanel();
        } catch (e) {
          toast(e.message, 'err');
        }
      },
    }, ['Reject']),
  ];
}

async function approvals() {
  const [leave, corr] = await Promise.all([
    api('leave', 'list', { body: { status: 'PENDING' } }),
    api('attendance', 'corrections', { body: { status: 'PENDING' } }),
  ]);
  const canLeave = can(user.role, 'leaveApproval');
  const canCorr = can(user.role, 'correctionApproval');
  return el('div', { class: 'grid grid-2' }, [
    el('div', {}, [
      el('h3', { text: 'Leave' }),
      ...(leave.requests || []).map((r) =>
        el('div', { class: 'card', style: 'padding:1rem;margin-bottom:.6rem' }, [
          el('strong', { text: `${r.candidates?.first_name} ${r.candidates?.last_name}` }),
          el('div', { text: `${r.start_date} → ${r.end_date}` }),
          ...reviewButtons(
            canLeave,
            () => api('leave', 'approve', { body: { id: r.id } }),
            () => api('leave', 'reject', { body: { id: r.id } }),
          ),
        ]),
      ),
    ]),
    el('div', {}, [
      el('h3', { text: 'Corrections' }),
      ...(corr.corrections || []).map((c) =>
        el('div', { class: 'card', style: 'padding:1rem;margin-bottom:.6rem' }, [
          el('div', { text: `ORIGINAL ${formatTime(c.attendance_sessions?.clocked_out_at)}` }),
          el('div', { text: c.reason }),
          ...reviewButtons(
            canCorr,
            () => api('attendance', 'approve-correction', { body: { id: c.id } }),
            () => api('attendance', 'reject-correction', { body: { id: c.id } }),
          ),
        ]),
      ),
    ]),
  ]);
}

async function reports() {
  if (!can(user.role, 'exportAttendance')) {
    return el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Reports' }),
      el('p', { class: 'muted', text: 'View only. Exporting attendance is limited to owners, admins, and managers.' }),
    ]);
  }
  const people = await api('organisation', 'candidates', { body: {} });
  const period = el('select', { class: 'input' }, [
    el('option', { value: 'week', text: 'Weekly' }),
    el('option', { value: 'month', text: 'Monthly' }),
  ]);
  const date = el('input', { class: 'input', type: 'date' });
  date.value = new Date().toISOString().slice(0, 10);
  const candidate = el('select', { class: 'input' }, [
    el('option', { value: '', text: 'All candidates (bulk)' }),
    ...(people.candidates || []).map((c) =>
      el('option', {
        value: c.id,
        text: `${c.first_name} ${c.last_name} (${c.candidate_reference})${c.id_number ? ` · ${c.id_number}` : ''}${c.sponsor_name ? ` · ${c.sponsor_name}` : ''}`,
      }),
    ),
  ]);

  function payload() {
    if (!date.value) throw new Error('Pick a date in the week or month');
    return {
      period: period.value,
      date: date.value,
      candidateId: candidate.value || undefined,
    };
  }

  const preview = el('div', { class: 'grid' });
  async function renderPreview() {
    try {
      const data = await api('attendance', 'timesheet', { body: payload() });
      preview.replaceChildren(timesheetCharts(data));
    } catch (err) {
      preview.replaceChildren(el('p', { class: 'muted', text: err.message || 'Charts will appear when this period has attendance.' }));
    }
  }
  period.addEventListener('change', renderPreview);
  date.addEventListener('change', renderPreview);
  candidate.addEventListener('change', renderPreview);
  renderPreview();

  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Timesheets' }),
      el('p', {
        class: 'muted',
        text: 'Download a weekly or monthly PDF. Each candidate block shows their host and ID or passport number, plus who confirmed or rejected each day.',
      }),
      field('Period', period),
      field('Date in period', date),
      field('Candidate', candidate),
      el('div', { class: 'btn-row mt' }, [
        el('button', {
          class: 'btn btn-primary',
          onClick: async () => {
            try {
              const data = await api('attendance', 'timesheet-pdf', { body: payload() });
              downloadBase64(data.filename || 'timesheet.pdf', data.pdfBase64, 'application/pdf');
              toast(`Downloaded ${data.period?.label || 'timesheet'}`);
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, ['Download PDF']),
        el('button', {
          class: 'btn',
          onClick: async () => {
            try {
              const data = await api('attendance', 'export', { body: payload() });
              downloadText(data.filename || 'attendance.csv', data.csv, 'text/csv');
              toast('CSV downloaded');
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, ['Download CSV']),
      ]),
    ]),
    preview,
  ]);
}

async function audit() {
  const data = await api('organisation', 'audit', { body: {} });
  return table(
    ['When', 'Action', 'Actor'],
    (data.events || []).map((e) => [formatTime(e.created_at), e.action, e.actor_role || '']),
  );
}

async function billing() {
  const data = await api('organisation', 'billing', { body: {} });
  if (!data.visible) {
    return el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Billing' }),
      el('p', {
        class: 'muted',
        text: 'The platform administrator has not shared this organisation’s bill with organisation admins yet.',
      }),
    ]);
  }
  const preview = data.preview || {};
  const quote = preview.quote || {};
  const org = preview.organisation || {};
  const invoices = data.invoices || [];
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'This month' }),
      el('p', {
        text: `${preview.period?.label || ''} · ${org.billing_type === 'NGO' ? 'NGO' : 'Private'} plan`,
      }),
      el('p', { text: `${preview.activeCandidates || 0} active candidate${preview.activeCandidates === 1 ? '' : 's'}` }),
      quote.floorApplied
        ? el('p', { class: 'muted', text: `Monthly floor applied (${quote.floorLabel})` })
        : null,
      el('p', { text: `Subtotal (ex VAT) ${quote.subtotalLabel || 'R0.00'}` }),
      el('p', { text: `VAT 15% ${quote.vatLabel || 'R0.00'}` }),
      el('p', { text: `Total ${quote.totalLabel || 'R0.00'}` }),
    ]),
    table(
      ['Invoice', 'Period', 'Candidates', 'Total', 'Status', 'Actions'],
      invoices.map((invoice) => [
        invoice.invoice_number,
        `${invoice.period_start} – ${invoice.period_end}`,
        String(invoice.billed_candidates),
        `R${((Number(invoice.total_cents) || 0) / 100).toFixed(2)}`,
        invoice.status_label || invoice.status,
        el('button', {
          class: 'btn',
          style: 'padding:.45rem .75rem;font-size:.8rem',
          onClick: async () => {
            try {
              const file = await api('organisation', 'billing-invoice-pdf', { body: { invoiceId: invoice.id } });
              downloadBase64(file.filename || 'invoice.pdf', file.pdfBase64);
              toast('Invoice downloaded');
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, ['Download PDF']),
      ]),
    ),
  ]);
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

async function profileView() {
  return AccountForm({ user, showIdentity: false });
}

const user = Auth.requireRole('ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER', 'ORG_VIEWER');
const items = navFor(user.role);
const allViews = {
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
  billing,
  settings,
  notifications: AlertsPanel,
  profile: profileView,
};
await bootPanel({
  title: 'Organisation',
  items,
  user,
  defaultView: 'dashboard',
  views: Object.fromEntries(items.map((item) => [item.view, allViews[item.view]])),
});
