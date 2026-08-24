import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, viewParam, formatTime, toast } from '../../utils/dom.js';
import { shell, table } from '../../components/sidebar.js';
import { StatCard } from '../../components/clock-card.js';
import { isEmail, isPassword } from '../../validators.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'organisations', label: 'Organisations' },
  { view: 'users', label: 'Users' },
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

async function dashboard() {
  const stats = await api('admin', 'platform-stats', { body: {} });
  return el('div', { class: 'grid grid-4' }, [
    StatCard('Organisations', stats.organisations, '?view=organisations'),
    StatCard('Active candidates', stats.activeCandidates),
    StatCard('Hosts', stats.hosts),
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
      ['Name', 'Status', 'Timezone'],
      (data.organisations || []).map((o) => [o.name, o.status, o.timezone]),
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
      ['Name', 'Email', 'Role', 'Organisation', 'Status'],
      (people.users || []).map((u) => [
        u.display_name,
        u.email,
        u.role,
        u.organisations?.name || '—',
        u.status,
      ]),
    ),
  ]);
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
