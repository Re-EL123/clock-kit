import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, viewParam, formatTime, toast } from '../../utils/dom.js';
import { shell, table } from '../../components/sidebar.js';
import { StatCard } from '../../components/clock-card.js';
import { Modal } from '../../components/modal.js';
import { ConfirmationSheet } from '../../components/confirmation-sheet.js';
import { isEmail, isPassword } from '../../validators.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'organisations', label: 'Organisations' },
  { view: 'users', label: 'Users' },
  { view: 'hosts', label: 'Hosts' },
  { view: 'candidates', label: 'Candidates' },
  { view: 'sites', label: 'Sites' },
  { view: 'assignments', label: 'Assignments' },
  { view: 'security', label: 'Security' },
  { view: 'health', label: 'Health' },
];

function field(label, input) {
  return el('div', { class: 'field' }, [el('span', { text: label }), input]);
}

function textInput(placeholder, type = 'text') {
  return el('input', { class: 'input', type, placeholder, autocomplete: type === 'password' ? 'new-password' : 'off' });
}

function orgOptions(organisations) {
  return [
    el('option', { value: '', text: 'Select organisation' }),
    ...(organisations || []).map((o) => el('option', { value: o.id, text: o.name })),
  ];
}

function requireAccountFields({ email, password, confirm }) {
  if (!isEmail(email)) throw new Error('Enter a valid email');
  if (!isPassword(password)) throw new Error('Password must be at least 8 characters');
  if (password !== confirm) throw new Error('Passwords do not match');
}

function smBtn(label, onClick, kind = '') {
  return el('button', {
    class: `btn ${kind}`.trim(),
    style: 'padding:.45rem .75rem;font-size:.8rem',
    onClick,
  }, [label]);
}

function actions(buttons) {
  return el('div', { style: 'display:flex;flex-wrap:wrap;gap:.35rem' }, buttons);
}

function confirmAction(message, { danger = false, confirmLabel = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const node = ConfirmationSheet({
      message,
      danger,
      confirmLabel,
      onConfirm: () => {
        node.remove();
        resolve(true);
      },
      onCancel: () => {
        node.remove();
        resolve(false);
      },
    });
    document.body.append(node);
  });
}

function selectInput(options, value = '') {
  const node = el(
    'select',
    { class: 'input' },
    options.map((opt) => el('option', { value: opt.value, text: opt.label, selected: opt.value === value })),
  );
  if (value) node.value = value;
  return node;
}

function openForm({ title, fields, submitLabel = 'Save', onSubmit }) {
  const inputs = {};
  const nodes = fields.map((item) => {
    const input = item.options
      ? selectInput(item.options, item.value || '')
      : textInput(item.placeholder || item.label, item.type || 'text');
    if (!item.options && item.value != null) input.value = item.value;
    inputs[item.name] = input;
    return field(item.label, input);
  });
  const modal = Modal({
    title,
    onClose: () => modal.remove(),
    children: [
      ...nodes,
      el('div', { style: 'display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem' }, [
        el('button', { class: 'btn', onClick: () => modal.remove() }, ['Cancel']),
        el('button', {
          class: 'btn btn-primary',
          onClick: async () => {
            try {
              const values = Object.fromEntries(
                Object.entries(inputs).map(([key, input]) => [key, input.value]),
              );
              await onSubmit(values);
              modal.remove();
              location.reload();
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, [submitLabel]),
      ]),
    ],
  });
  document.body.append(modal);
}

async function dashboard() {
  const stats = await api('admin', 'platform-stats', { body: {} });
  return el('div', { class: 'grid grid-4' }, [
    StatCard('Organisations', stats.organisations, '?view=organisations'),
    StatCard('Active candidates', stats.activeCandidates),
    StatCard('Hosts', stats.hosts, '?view=hosts'),
    StatCard('Clocked in today', stats.clockedInToday),
  ]);
}

async function organisations() {
  const data = await api('admin', 'list-organisations', { body: {} });
  const name = textInput('Organisation name');
  const ownerName = textInput('Owner name');
  const ownerEmail = textInput('Owner email', 'email');
  const ownerPassword = textInput('Owner password', 'password');
  const ownerConfirm = textInput('Confirm password', 'password');
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create organisation account' }),
      el('p', { class: 'muted', text: 'Creates the organisation and an owner login. The owner signs in with this email and password.' }),
      field('Name', name),
      field('Owner name', ownerName),
      field('Owner email', ownerEmail),
      field('Owner password', ownerPassword),
      field('Confirm password', ownerConfirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            requireAccountFields({
              email: ownerEmail.value,
              password: ownerPassword.value,
              confirm: ownerConfirm.value,
            });
            if (!name.value.trim() || !ownerName.value.trim()) throw new Error('Name and owner name are required');
            await api('admin', 'create-organisation', {
              body: {
                name: name.value.trim(),
                ownerEmail: ownerEmail.value.trim(),
                ownerName: ownerName.value.trim(),
                ownerPassword: ownerPassword.value,
              },
            });
            toast('Organisation account created. The owner can sign in now.');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create organisation']),
    ]),
    table(
      ['Name', 'Status', 'Timezone', 'Actions'],
      (data.organisations || []).map((o) => [
        o.name,
        o.status,
        o.timezone,
        actions([
          smBtn('Edit', () => {
            openForm({
              title: `Edit ${o.name}`,
              fields: [
                { name: 'name', label: 'Name', value: o.name },
                { name: 'timezone', label: 'Timezone', value: o.timezone || 'Africa/Johannesburg' },
                { name: 'countryCode', label: 'Country code', value: o.country_code || 'ZA' },
                { name: 'registrationNumber', label: 'Registration number', value: o.registration_number || '' },
                {
                  name: 'status',
                  label: 'Status',
                  value: o.status,
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                  ],
                },
                {
                  name: 'legalHold',
                  label: 'Legal hold',
                  value: o.legal_hold ? 'true' : 'false',
                  options: [
                    { value: 'false', label: 'Off' },
                    { value: 'true', label: 'On' },
                  ],
                },
              ],
              onSubmit: async (values) => {
                if (!values.name.trim()) throw new Error('Name is required');
                await api('admin', 'update-organisation', {
                  body: {
                    organisationId: o.id,
                    name: values.name.trim(),
                    timezone: values.timezone.trim(),
                    countryCode: values.countryCode.trim() || 'ZA',
                    registrationNumber: values.registrationNumber.trim() || undefined,
                    status: values.status,
                    legalHold: values.legalHold === 'true',
                  },
                });
                toast('Organisation updated');
              },
            });
          }),
          smBtn(o.status === 'suspended' ? 'Activate' : 'Suspend', async () => {
            const next = o.status === 'suspended' ? 'activate-organisation' : 'suspend-organisation';
            const ok = await confirmAction(
              o.status === 'suspended'
                ? `Activate ${o.name}?`
                : `Suspend ${o.name} and its member logins?`,
            );
            if (!ok) return;
            try {
              await api('admin', next, { body: { organisationId: o.id } });
              toast('Organisation status updated');
              location.reload();
            } catch (e) {
              toast(e.message, 'err');
            }
          }),
          smBtn('Delete', async () => {
            const ok = await confirmAction(`Delete ${o.name} and all of its data? This cannot be undone.`, {
              danger: true,
              confirmLabel: 'Delete',
            });
            if (!ok) return;
            try {
              await api('admin', 'delete-organisation', { body: { organisationId: o.id } });
              toast('Organisation deleted');
              location.reload();
            } catch (e) {
              toast(e.message, 'err');
            }
          }, 'btn-danger'),
        ]),
      ]),
    ),
  ]);
}

async function users() {
  const [orgs, people] = await Promise.all([
    api('admin', 'list-organisations', { body: {} }),
    api('admin', 'users', { body: {} }),
  ]);
  const organisations = orgs.organisations || [];

  const hostOrg = el('select', { class: 'input' }, orgOptions(organisations));
  const hostName = textInput('Host company name');
  const hostContact = textInput('Host login name');
  const hostEmail = textInput('Host email', 'email');
  const hostPassword = textInput('Host password', 'password');
  const hostConfirm = textInput('Confirm password', 'password');

  const candOrg = el('select', { class: 'input' }, orgOptions(organisations));
  const candRef = textInput('Reference');
  const candFirst = textInput('First name');
  const candLast = textInput('Last name');
  const candEmail = textInput('Candidate email', 'email');
  const candPassword = textInput('Candidate password', 'password');
  const candConfirm = textInput('Confirm password', 'password');

  const staffOrg = el('select', { class: 'input' }, orgOptions(organisations));
  const staffName = textInput('Display name');
  const staffEmail = textInput('Staff email', 'email');
  const staffPassword = textInput('Staff password', 'password');
  const staffConfirm = textInput('Confirm password', 'password');
  const staffRole = el('select', { class: 'input' }, [
    el('option', { value: 'ORG_OWNER', text: 'Organisation owner' }),
    el('option', { value: 'ORG_ADMIN', text: 'Organisation admin' }),
    el('option', { value: 'ORG_MANAGER', text: 'Organisation manager' }),
    el('option', { value: 'ORG_VIEWER', text: 'Organisation viewer' }),
  ]);

  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create host account' }),
      el('p', { class: 'muted', text: 'Creates the host and a HOST login for that organisation.' }),
      field('Organisation', hostOrg),
      field('Host name', hostName),
      field('Login name', hostContact),
      field('Email', hostEmail),
      field('Password', hostPassword),
      field('Confirm password', hostConfirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!hostOrg.value) throw new Error('Select an organisation');
            if (!hostName.value.trim() || !hostContact.value.trim()) throw new Error('Host name and login name are required');
            requireAccountFields({
              email: hostEmail.value,
              password: hostPassword.value,
              confirm: hostConfirm.value,
            });
            await api('admin', 'create-host', {
              body: {
                organisationId: hostOrg.value,
                name: hostName.value.trim(),
                contactName: hostContact.value.trim(),
                contactEmail: hostEmail.value.trim(),
                password: hostPassword.value,
              },
            });
            toast('Host account created. They can sign in now.');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create host account']),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create candidate account' }),
      el('p', { class: 'muted', text: 'Creates a CANDIDATE login. They clock in with this email and password.' }),
      field('Organisation', candOrg),
      field('Reference', candRef),
      field('First name', candFirst),
      field('Last name', candLast),
      field('Email', candEmail),
      field('Password', candPassword),
      field('Confirm password', candConfirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!candOrg.value) throw new Error('Select an organisation');
            if (!candRef.value.trim() || !candFirst.value.trim() || !candLast.value.trim()) {
              throw new Error('Reference and name are required');
            }
            requireAccountFields({
              email: candEmail.value,
              password: candPassword.value,
              confirm: candConfirm.value,
            });
            await api('admin', 'create-candidate', {
              body: {
                organisationId: candOrg.value,
                candidateReference: candRef.value.trim(),
                firstName: candFirst.value.trim(),
                lastName: candLast.value.trim(),
                email: candEmail.value.trim(),
                password: candPassword.value,
              },
            });
            toast('Candidate account created. They can sign in now.');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create candidate account']),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create organisation staff login' }),
      el('p', { class: 'muted', text: 'Adds an extra organisation login. Use Organisations to create the first owner.' }),
      field('Organisation', staffOrg),
      field('Role', staffRole),
      field('Name', staffName),
      field('Email', staffEmail),
      field('Password', staffPassword),
      field('Confirm password', staffConfirm),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            if (!staffOrg.value) throw new Error('Select an organisation');
            if (!staffName.value.trim()) throw new Error('Name is required');
            requireAccountFields({
              email: staffEmail.value,
              password: staffPassword.value,
              confirm: staffConfirm.value,
            });
            await api('admin', 'create-org-user', {
              body: {
                organisationId: staffOrg.value,
                role: staffRole.value,
                displayName: staffName.value.trim(),
                email: staffEmail.value.trim(),
                password: staffPassword.value,
              },
            });
            toast('Organisation login created. They can sign in now.');
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create staff account']),
    ]),
    table(
      ['Name', 'Email', 'Role', 'Organisation', 'Status', 'Actions'],
      (people.users || []).map((u) => [
        u.display_name,
        u.email,
        u.role,
        u.organisations?.name || '—',
        u.status,
        actions([
          smBtn('Edit', () => {
            openForm({
              title: `Edit ${u.display_name}`,
              fields: [
                { name: 'displayName', label: 'Name', value: u.display_name },
                { name: 'email', label: 'Email', type: 'email', value: u.email },
                { name: 'phone', label: 'Phone', value: u.phone || '' },
                {
                  name: 'role',
                  label: 'Role',
                  value: u.role,
                  options: [
                    { value: 'ORG_OWNER', label: 'Organisation owner' },
                    { value: 'ORG_ADMIN', label: 'Organisation admin' },
                    { value: 'ORG_MANAGER', label: 'Organisation manager' },
                    { value: 'ORG_VIEWER', label: 'Organisation viewer' },
                    { value: 'HOST', label: 'Host' },
                    { value: 'CANDIDATE', label: 'Candidate' },
                    { value: 'PLATFORM_ADMIN', label: 'Platform admin' },
                  ].filter((opt) => u.role === 'PLATFORM_ADMIN' || opt.value !== 'PLATFORM_ADMIN'),
                },
                { name: 'password', label: 'New password (optional)', type: 'password' },
              ],
              onSubmit: async (values) => {
                if (!values.displayName.trim()) throw new Error('Name is required');
                if (!isEmail(values.email)) throw new Error('Enter a valid email');
                const body = {
                  userId: u.id,
                  displayName: values.displayName.trim(),
                  email: values.email.trim(),
                  phone: values.phone.trim() || null,
                };
                if (u.role !== 'PLATFORM_ADMIN') body.role = values.role;
                if (values.password) {
                  if (!isPassword(values.password)) throw new Error('Password must be at least 8 characters');
                  body.password = values.password;
                }
                await api('admin', 'update-user', { body });
                toast('User updated');
              },
            });
          }),
          smBtn(u.status === 'suspended' ? 'Activate' : 'Suspend', async () => {
            const next = u.status === 'suspended' ? 'active' : 'suspended';
            const ok = await confirmAction(`${next === 'active' ? 'Activate' : 'Suspend'} ${u.display_name}?`);
            if (!ok) return;
            try {
              await api('admin', 'set-user-status', { body: { userId: u.id, status: next } });
              toast('User status updated');
              location.reload();
            } catch (e) {
              toast(e.message, 'err');
            }
          }),
          smBtn('Delete', async () => {
            const ok = await confirmAction(`Delete ${u.display_name}? They will no longer be able to sign in.`, {
              danger: true,
              confirmLabel: 'Delete',
            });
            if (!ok) return;
            try {
              await api('admin', 'delete-user', { body: { userId: u.id } });
              toast('User deleted');
              location.reload();
            } catch (e) {
              toast(e.message, 'err');
            }
          }, 'btn-danger'),
        ]),
      ]),
    ),
  ]);
}

async function hosts() {
  const data = await api('admin', 'list-hosts', { body: {} });
  return table(
    ['Host', 'Organisation', 'Sites', 'Status'],
    (data.hosts || []).map((h) => [h.name, h.organisations?.name || '—', String(h.sites?.length || 0), h.status]),
  );
}

async function candidatesView() {
  const data = await api('admin', 'list-candidates', { body: {} });
  return table(
    ['Name', 'Reference', 'Organisation', 'Status'],
    (data.candidates || []).map((c) => [`${c.first_name} ${c.last_name}`, c.candidate_reference, c.organisations?.name || '—', c.status]),
  );
}

async function sites() {
  const data = await api('admin', 'sites', { body: {} });
  return table(
    ['Site', 'Host', 'Organisation', 'Geofence', 'Status'],
    (data.sites || []).map((s) => [s.name, s.hosts?.name || '—', s.organisations?.name || '—', s.geofence_mode, s.status]),
  );
}

async function assignments() {
  const data = await api('admin', 'assignments', { body: {} });
  return table(
    ['Candidate', 'Host', 'Site', 'Status'],
    (data.assignments || []).map((a) => [
      `${a.candidates?.first_name || ''} ${a.candidates?.last_name || ''}`.trim() || '—',
      a.hosts?.name || '—',
      a.sites?.name || '—',
      a.status,
    ]),
  );
}

async function security() {
  const data = await api('admin', 'security-events', { body: {} });
  return table(
    ['When', 'Action', 'Entity'],
    (data.events || []).map((e) => [formatTime(e.created_at), e.action, e.entity_type]),
  );
}

async function health() {
  const data = await api('system', 'health', { body: {} });
  return el('div', { class: 'card', style: 'padding:1rem' }, [
    el('h2', { text: data.ok ? 'Healthy' : 'Degraded' }),
    el('p', { text: `Database: ${data.db}` }),
    el('p', { text: `Latency: ${data.latencyMs}ms` }),
    el('p', { class: 'muted', text: data.time }),
  ]);
}

const user = Auth.requireRole('PLATFORM_ADMIN');
const view = viewParam('dashboard');
const views = {
  dashboard,
  organisations,
  users,
  hosts,
  candidates: candidatesView,
  sites,
  assignments,
  security,
  health,
};

let content;
try {
  content = await (views[view] || dashboard)();
} catch (e) {
  content = el('p', { class: 'form-error', text: e.message });
}

document.getElementById('app').append(
  shell({
    title: 'Platform',
    items: NAV,
    view,
    heading: NAV.find((n) => n.view === view)?.label || 'Dashboard',
    user,
    content,
  }),
);
