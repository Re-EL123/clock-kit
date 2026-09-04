import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { withBase } from '../../config.js';
import { el, formatTime, toast, downloadBase64, downloadText, href } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel, refreshPanel } from '../../runtime.js';
import { StatCard } from '../../components/clock-card.js';
import { ChartCard, weekComboChart, doughnutFromCounts, countBy } from '../../components/charts.js';
import { Modal } from '../../components/modal.js';
import { ConfirmationSheet } from '../../components/confirmation-sheet.js';
import { isEmail, isPassword } from '../../validators.js';
import { nationalitySelect } from '../../nationalities.js';
import { AccountForm } from '../../components/account-form.js';
import { AlertsPanel } from '../../components/alerts-panel.js';
import { SiteForm } from '../../components/site-form.js';
import { formatPublished } from '../../legal-format.js';
import { setView } from '../../router.js';
import {
  GUIDE_AUDIENCE_LABEL,
  GUIDE_KIND_LABEL,
  GuidesLibrary,
  downloadGuide,
} from '../../components/guides-panel.js';
import { HelpPanel } from '../../components/help-panel.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'organisations', label: 'Organisations' },
  { view: 'billing', label: 'Billing' },
  { view: 'users', label: 'Users' },
  { view: 'hosts', label: 'Hosts' },
  { view: 'candidates', label: 'Candidates' },
  { view: 'sites', label: 'Sites' },
  { view: 'assignments', label: 'Assignments' },
  { view: 'security', label: 'Security' },
  { view: 'health', label: 'Health' },
  { view: 'legal', label: 'Legal' },
  { view: 'guides', label: 'Guides' },
  { view: 'help', label: 'Help' },
  { view: 'email', label: 'Email' },
  { view: 'outreach', label: 'Outreach' },
  { view: 'notifications', label: 'Alerts' },
  { view: 'profile', label: 'Account' },
];

const CANDIDATE_REF_HINT = 'Unique code for this person in the organisation (student number, employee number, or placement code). It appears on timesheets and must not be reused.';

const PROSPECT_CATEGORIES = [
  { value: 'staffing', label: 'Staffing / TES' },
  { value: 'learnership', label: 'Learnership' },
  { value: 'ngo', label: 'NGO' },
  { value: 'other', label: 'Other' },
];

const PROSPECT_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'CLOSED', label: 'Closed' },
];

function field(label, input, hint) {
  return el('div', { class: 'field' }, [
    el('span', { text: label }),
    input,
    hint ? el('p', { class: 'field-help', text: hint }) : null,
  ]);
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
    type: 'button',
    class: `btn ${kind}`.trim(),
    style: 'padding:.45rem .75rem;font-size:.8rem',
    onClick,
  }, [label]);
}

function actions(buttons) {
  return el('div', { class: 'btn-row' }, buttons);
}

function tallyFromCandidates(rows) {
  const tally = { active: 0, inactive: 0, total: 0 };
  for (const row of rows || []) {
    tally.total += 1;
    if (row.status === 'active') tally.active += 1;
    else tally.inactive += 1;
  }
  return tally;
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
    let input;
    if (item.options) {
      input = selectInput(item.options, item.value || '');
    } else if (item.type === 'textarea') {
      input = el('textarea', { class: 'input', rows: String(item.rows || 3), placeholder: item.placeholder || '' });
      if (item.value != null) input.value = item.value;
    } else {
      input = textInput(item.placeholder || item.label, item.type || 'text');
      if (item.value != null) input.value = item.value;
    }
    inputs[item.name] = input;
    return field(item.label, input);
  });
  fields.forEach((item) => {
    if (typeof item.onChange === 'function') {
      inputs[item.name].addEventListener('change', () => item.onChange(inputs[item.name], inputs));
    }
  });
  const modal = Modal({
    title,
    onClose: () => modal.remove(),
    children: [
      ...nodes,
      el('div', { class: 'modal-actions' }, [
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
              refreshPanel();
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
  const roleLabels = {
    CANDIDATE: 'Candidates',
    HOST: 'Hosts',
    ORG_OWNER: 'Owners',
    ORG_ADMIN: 'Admins',
    ORG_MANAGER: 'Managers',
    ORG_VIEWER: 'Viewers',
    PLATFORM_ADMIN: 'Platform',
  };
  const roles = stats.roles || {};
  const roleKeys = Object.keys(roleLabels).filter((key) => Number(roles[key]) > 0);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-4' }, [
      StatCard('Organisations', stats.organisations, '?view=organisations'),
      StatCard('Hosts', stats.hosts, '?view=hosts'),
      StatCard('Active candidates', stats.activeCandidates, '?view=candidates'),
      StatCard('Inactive candidates', stats.inactiveCandidates, '?view=candidates'),
    ]),
    el('div', { class: 'grid grid-2 grid-charts' }, [
      ChartCard({
        title: 'People on the platform',
        subtitle: 'Organisations, hosts, and candidate status',
        type: 'doughnut',
        ...doughnutFromCounts({
          Organisations: stats.organisations,
          Hosts: stats.hosts,
          Active: stats.activeCandidates,
          Inactive: stats.inactiveCandidates,
        }),
        colors: ['#21396a', '#f5bf48', '#3b424f', '#ba133a'],
      }),
      ChartCard({
        title: 'Accounts by role',
        subtitle: 'Who can sign in',
        type: 'polarArea',
        labels: roleKeys.map((key) => roleLabels[key]),
        values: roleKeys.map((key) => Number(roles[key] || 0)),
        empty: 'No user accounts yet.',
      }),
    ]),
    weekComboChart(stats.week, { title: 'Platform clock-ins', subtitle: 'Hours and clock-ins across every organisation' }),
  ]);
}

async function organisations() {
  const [data, rateData] = await Promise.all([
    api('admin', 'list-organisations', { body: {} }),
    api('admin', 'billing-plans', { body: {} }).catch(() => ({ plans: {} })),
  ]);
  const plans = rateData.plans || {};
  const name = textInput('Organisation name');
  const ownerName = textInput('Owner name');
  const ownerEmail = textInput('Owner email', 'email');
  const ownerPassword = textInput('Owner password', 'password');
  const ownerConfirm = textInput('Confirm password', 'password');
  const billingType = selectInput(
    [
      { value: 'PRIVATE', label: planOptionLabel('PRIVATE', plans) },
      { value: 'NGO', label: planOptionLabel('NGO', plans) },
    ],
    'PRIVATE',
  );
  const unitRate = textInput('Unit rate in rand');
  const floorRate = textInput('Monthly floor in rand');
  function fillCreateRates() {
    const plan = plans[billingType.value] || plans.PRIVATE;
    if (!plan) return;
    unitRate.value = randInputValue(plan.unitCents);
    floorRate.value = randInputValue(plan.floorCents);
  }
  fillCreateRates();
  billingType.addEventListener('change', fillCreateRates);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create organisation account' }),
      el('p', { class: 'muted', text: 'Creates the organisation and an owner login. The owner signs in with this email and password.' }),
      field('Name', name),
      field('Owner name', ownerName),
      field('Owner email', ownerEmail),
      field('Owner password', ownerPassword),
      field('Confirm password', ownerConfirm),
      field('Billing plan', billingType),
      field('Rate per active candidate (R)', unitRate),
      field('Monthly floor (R)', floorRate),
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
                billingType: billingType.value,
                billingUnitCents: centsFromRand(unitRate.value, 'Unit rate'),
                billingFloorCents: centsFromRand(floorRate.value, 'Monthly floor'),
              },
            });
            toast('Organisation account created. The owner can sign in now.');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create organisation']),
    ]),
    table(
      ['Name', 'Plan', 'Active', 'Inactive', 'Status', 'Timezone', 'Actions'],
      (data.organisations || []).map((o) => [
        o.name,
        o.billing_type === 'NGO' ? 'NGO' : 'Private',
        String(o.candidate_active ?? 0),
        String(o.candidate_inactive ?? 0),
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
                {
                  name: 'billingType',
                  label: 'Billing plan',
                  value: o.billing_type || 'PRIVATE',
                  options: [
                    { value: 'NGO', label: planOptionLabel('NGO', plans) },
                    { value: 'PRIVATE', label: planOptionLabel('PRIVATE', plans) },
                  ],
                  onChange: (_input, inputs) => {
                    const plan = plans[inputs.billingType.value];
                    if (!plan) return;
                    inputs.billingUnitRate.value = randInputValue(plan.unitCents);
                    inputs.billingFloorRate.value = randInputValue(plan.floorCents);
                  },
                },
                {
                  name: 'billingUnitRate',
                  label: 'Rate per active candidate (R)',
                  value: randInputValue(o.billing_unit_cents),
                },
                {
                  name: 'billingFloorRate',
                  label: 'Monthly floor (R)',
                  value: randInputValue(o.billing_floor_cents),
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
                    billingType: values.billingType,
                    billingUnitCents: centsFromRand(values.billingUnitRate, 'Unit rate'),
                    billingFloorCents: centsFromRand(values.billingFloorRate, 'Monthly floor'),
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
              refreshPanel();
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
              refreshPanel();
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
  const candRef = textInput('e.g. CK-1001');
  candRef.title = CANDIDATE_REF_HINT;
  const candFirst = textInput('First name');
  const candLast = textInput('Last name');
  const candIdNumber = textInput('ID or passport number');
  const candSponsor = textInput('Sponsor name');
  const candNationality = nationalitySelect(el);
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
            refreshPanel();
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
      field('Reference', candRef, CANDIDATE_REF_HINT),
      field('First name', candFirst),
      field('Last name', candLast),
      field('ID / passport number', candIdNumber),
      field('Sponsor', candSponsor),
      field('Nationality', candNationality),
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
            if (!candIdNumber.value.trim()) throw new Error('ID or passport number is required');
            if (!candSponsor.value.trim()) throw new Error('Sponsor name is required');
            if (!candNationality.value) throw new Error('Nationality is required');
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
                idNumber: candIdNumber.value.trim(),
                sponsorName: candSponsor.value.trim(),
                nationality: candNationality.value,
                email: candEmail.value.trim(),
                password: candPassword.value,
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
            refreshPanel();
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
              refreshPanel();
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
              refreshPanel();
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
  const hostsList = data.hosts || [];
  const boxes = hostsList.map((h) => {
    const box = el('input', {
      type: 'checkbox',
      'data-host-id': h.id,
    });
    box.checked = Boolean(h.show_sponsor);
    return el('label', { class: 'check-row' }, [
      box,
      el('span', { text: `${h.name} · ${h.organisations?.name || 'Organisation'}` }),
    ]);
  });
  const list = el('div', { class: 'check-list' }, boxes);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Show sponsor to hosts' }),
      el('p', {
        class: 'muted',
        text: 'Sponsor stays on organisation and platform records. Hosts cannot edit it. Tick a workplace to show the name on that host’s candidate and attendance lists.',
      }),
      hostsList.length ? list : el('p', { class: 'muted', text: 'Create a host first.' }),
      hostsList.length
        ? el('button', {
          class: 'btn btn-primary',
          type: 'button',
          onClick: async () => {
            try {
              const hostIds = [...list.querySelectorAll('input[type="checkbox"]:checked')].map((box) => box.dataset.hostId);
              await api('admin', 'set-sponsor-visibility', { body: { hostIds } });
              toast('Sponsor visibility updated');
              refreshPanel();
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, ['Save visibility'])
        : null,
    ]),
    table(
      ['Host', 'Organisation', 'Sites', 'Sponsor', 'Status'],
      hostsList.map((h) => [
        h.name,
        h.organisations?.name || '—',
        String(h.sites?.length || 0),
        h.show_sponsor ? 'Visible' : 'Hidden',
        h.status,
      ]),
    ),
  ]);
}

async function candidatesView() {
  const [data, people] = await Promise.all([
    api('admin', 'list-candidates', { body: {} }),
    api('admin', 'users', { body: { role: 'ORG_MANAGER' } }),
  ]);
  const managers = (people.users || []).filter((u) => u.status !== 'suspended');
  const roster = data.roster || tallyFromCandidates(data.candidates);
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-4' }, [
      StatCard('Candidates', roster.total ?? 0),
      StatCard('Active', roster.active ?? 0),
      StatCard('Inactive', roster.inactive ?? 0),
    ]),
    table(
      ['Name', 'Reference', 'ID / passport', 'Sponsor', 'Nationality', 'Organisation', 'Manager', 'Status'],
      (data.candidates || []).map((c) => {
      const orgManagers = managers.filter((m) => m.organisation_id === c.organisation_id);
      const sel = el('select', { class: 'input' }, [
        el('option', { value: '', text: 'Unassigned' }),
        ...orgManagers.map((m) => el('option', { value: m.id, text: m.display_name })),
      ]);
      sel.value = c.manager_user_id || c.manager?.id || '';
      return [
        `${c.first_name} ${c.last_name}`,
        c.candidate_reference,
        c.id_number || '—',
        c.sponsor_name || '—',
        c.nationality || '—',
        c.organisations?.name || '—',
        el('div', { class: 'btn-row' }, [
          sel,
          smBtn('Save', async () => {
            try {
              await api('admin', 'assign-manager', {
                body: { candidateId: c.id, managerUserId: sel.value || null },
              });
              toast('Manager updated');
              refreshPanel();
            } catch (e) {
              toast(e.message, 'err');
            }
          }),
        ]),
        c.status,
      ];
    }),
    ),
  ]);
}

async function sites() {
  const data = await api('admin', 'sites', { body: {} });
  function openEdit(site) {
    const node = Modal({
      title: 'Update site',
      wide: true,
      onClose: () => node.remove(),
      children: [
        SiteForm({
          hosts: [{ id: site.host_id, name: site.hosts?.name || 'Host' }],
          site,
          submitLabel: 'Save changes',
          onSubmit: async (body) => {
            await api('admin', 'update-site', {
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
  return table(
    ['Site', 'Address', 'Host', 'Organisation', 'Geofence', 'Status', 'Edit'],
    (data.sites || []).map((s) => [
      s.name,
      s.address || '—',
      s.hosts?.name || '—',
      s.organisations?.name || '—',
      s.geofence_mode,
      s.status,
      el('button', { class: 'btn', type: 'button', onClick: () => openEdit(s) }, ['Edit']),
    ]),
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
  const events = data.events || [];
  const byAction = countBy(events, (row) => row.action || row.entity_type || 'Event');
  return el('div', { class: 'grid' }, [
    ChartCard({
      title: 'Recent security events',
      subtitle: 'What has been happening on the platform',
      type: 'doughnut',
      ...doughnutFromCounts(byAction),
      empty: 'No security events yet.',
    }),
    table(
      ['When', 'Action', 'Entity'],
      events.map((e) => [formatTime(e.created_at), e.action, e.entity_type]),
    ),
  ]);
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

async function legal() {
  const data = await api('admin', 'legal', { body: {} });
  function historyList(kind) {
    const rows = (data.history || []).filter((row) => row.kind === kind).slice(0, 6);
    if (!rows.length) return null;
    return el('ul', { class: 'muted legal-history' }, rows.map((row) =>
      el('li', { text: `Version ${row.version}${row.publishedAt ? ` · ${formatPublished(row.publishedAt)}` : ''}` }),
    ));
  }
  function editor(kind, doc) {
    const title = el('input', { class: 'input' });
    title.value = doc?.title || (kind === 'PRIVACY' ? 'Privacy Policy' : 'Terms and Conditions');
    const body = el('textarea', { class: 'input legal-editor' });
    body.value = doc?.body || '';
    const err = el('div', { class: 'form-error' });
    return el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: kind === 'PRIVACY' ? 'Privacy Policy' : 'Terms and Conditions' }),
      el('p', {
        class: 'muted',
        text: `Current version ${doc?.version || 1}. Publishing a new version asks every user to read and accept it again. Use ## headings for sections.`,
      }),
      field('Title', title),
      field('Document', body),
      err,
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        onClick: () => {
          const sheet = ConfirmationSheet({
            message: 'Publishing a new version will ask every signed-in user to accept it before they can continue.',
            confirmLabel: 'Publish',
            onCancel: () => sheet.remove(),
            onConfirm: async () => {
              sheet.remove();
              err.textContent = '';
              try {
                await api('admin', 'publish-legal', {
                  body: { kind, title: title.value.trim(), body: body.value },
                });
                toast('Published. Users will be asked to accept the new version.');
                refreshPanel();
              } catch (e) {
                err.textContent = e.message;
                toast(e.message, 'err');
              }
            },
          });
          document.body.append(sheet);
        },
      }, ['Publish new version']),
      historyList(kind),
    ]);
  }
  return el('div', { class: 'grid' }, [
    editor('TERMS', data.terms),
    editor('PRIVACY', data.privacy),
  ]);
}

const GUIDE_AUDIENCES = ['ORG_OWNER', 'ORG_ADMIN', 'ORG_MANAGER', 'ORG_VIEWER', 'HOST'];

function selectedGuide() {
  const params = new URLSearchParams(location.search);
  const kind = params.get('kind') === 'MANUAL' ? 'MANUAL' : 'SOP';
  const audience = GUIDE_AUDIENCES.includes(params.get('audience')) ? params.get('audience') : 'ORG_OWNER';
  return { kind, audience };
}

async function guides() {
  const data = await api('admin', 'guides', { body: {} });
  const selected = selectedGuide();
  const current = (data.documents || []).find((doc) => doc.kind === selected.kind && doc.audience === selected.audience)
    || data.documents?.[0];
  const title = el('input', { class: 'input' });
  title.value = current?.title || GUIDE_KIND_LABEL[selected.kind];
  const body = el('textarea', { class: 'input legal-editor' });
  body.value = current?.body || '';
  const err = el('div', { class: 'form-error' });
  const kindInput = selectInput(
    [
      { value: 'SOP', label: 'Standard operating procedure' },
      { value: 'MANUAL', label: 'Training manual' },
    ],
    selected.kind,
  );
  const audienceInput = selectInput(
    GUIDE_AUDIENCES.map((value) => ({ value, label: GUIDE_AUDIENCE_LABEL[value] })),
    selected.audience,
  );
  function pick() {
    setView('guides', { kind: kindInput.value, audience: audienceInput.value });
    refreshPanel();
  }
  kindInput.addEventListener('change', pick);
  audienceInput.addEventListener('change', pick);
  const history = (data.history || [])
    .filter((row) => row.kind === selected.kind && row.audience === selected.audience)
    .slice(0, 6);

  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Role-specific PDFs' }),
      el('p', {
        class: 'muted',
        text: 'Each organisation role and each host gets a branded standard operating procedure and a training manual. Publishing a new version updates the PDF everyone downloads.',
      }),
      field('Document', kindInput),
      field('Role', audienceInput),
      field('Title', title),
      field('Document text', body),
      el('p', { class: 'muted', text: 'Use ## headings for sections. The PDF cover, contents, and Clock-Kit branding are built from this text.' }),
      err,
      actions([
        el('button', {
          class: 'btn btn-primary',
          type: 'button',
          onClick: () => {
            const sheet = ConfirmationSheet({
              message: `Publish a new ${GUIDE_KIND_LABEL[selected.kind].toLowerCase()} for ${GUIDE_AUDIENCE_LABEL[selected.audience]}?`,
              confirmLabel: 'Publish',
              onCancel: () => sheet.remove(),
              onConfirm: async () => {
                sheet.remove();
                err.textContent = '';
                try {
                  await api('admin', 'publish-guide', {
                    body: {
                      kind: selected.kind,
                      audience: selected.audience,
                      title: title.value.trim(),
                      body: body.value,
                    },
                  });
                  toast('Published. The branded PDF now uses this text.');
                  refreshPanel();
                } catch (e) {
                  err.textContent = e.message;
                  toast(e.message, 'err');
                }
              },
            });
            document.body.append(sheet);
          },
        }, ['Publish new version']),
        smBtn('Download PDF', async () => {
          try {
            await downloadGuide('admin', selected.kind, selected.audience);
          } catch (e) {
            toast(e.message, 'err');
          }
        }),
      ]),
      history.length
        ? el('ul', { class: 'muted legal-history' }, history.map((row) =>
          el('li', { text: `Version ${row.version}${row.publishedAt ? ` · ${formatPublished(row.publishedAt)}` : ''}` }),
        ))
        : null,
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'All role PDFs' }),
      el('p', { class: 'muted', text: 'Owners and admins can download organisation and host PDFs. Managers, viewers, and hosts only receive their own role.' }),
    ]),
    GuidesLibrary({ documents: data.documents, fn: 'admin' }),
  ]);
}

function currentBillingMonth() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit' })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}`;
}

function monthToPeriod(ym) {
  const [year, month] = String(ym || '').split('-').map(Number);
  if (!year || !month) return monthToPeriod(currentBillingMonth());
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (value) => String(value).padStart(2, '0');
  return {
    periodStart: `${year}-${pad(month)}-01`,
    periodEnd: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function randLabel(cents) {
  return `R${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function randInputValue(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

function centsFromRand(value, label) {
  const cleaned = String(value || '').trim().replace(/^[Rr]/, '').replace(/\s/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a rand amount`);
  return Math.round(n * 100);
}

function planOptionLabel(type, plans) {
  const plan = plans?.[type];
  const name = type === 'NGO' ? 'NGO' : 'Private';
  if (!plan) return name;
  return `${name} — ${plan.unitLabel} per candidate, floor ${plan.floorLabel}`;
}

const INVOICE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'VOID', label: 'Void' },
];

function invoiceStatusLabel(status) {
  return INVOICE_STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function viewedLabel(invoice) {
  if (!invoice.org_viewed_at) return 'Not viewed';
  const who = invoice.org_viewed_by_name || invoice.org_viewed_by_role || 'organisation';
  return `Viewed ${formatTime(invoice.org_viewed_at)} · ${who}`;
}

async function downloadInvoicePdf(fn, invoiceId) {
  const data = await api(fn, 'billing-invoice-pdf', { body: { invoiceId } });
  downloadBase64(data.filename || 'invoice.pdf', data.pdfBase64);
  toast('Invoice downloaded');
}

async function billing() {
  const month = new URLSearchParams(location.search).get('month') || currentBillingMonth();
  const period = monthToPeriod(month);
  const [overview, journal] = await Promise.all([
    api('admin', 'billing-overview', { body: period }),
    api('admin', 'billing-list', { body: {} }),
  ]);
  const quotes = overview.organisations || [];
  const invoices = journal.invoices || [];
  const plans = overview.plans || {};
  const payee = overview.payee || {};
  const ngo = plans.NGO || {};
  const priv = plans.PRIVATE || {};
  const dueCents = quotes.reduce((sum, row) => sum + Number(row.quote?.totalCents || 0), 0);
  const unpaidCount = invoices.filter((invoice) => invoice.status === 'UNPAID' || invoice.status === 'OVERDUE').length;
  const unviewedCount = invoices.filter((invoice) => !invoice.org_viewed && invoice.status !== 'VOID').length;

  const monthInput = el('input', {
    class: 'input',
    type: 'month',
    value: month,
    onChange: () => {
      history.replaceState({ view: 'billing' }, '', href('billing', { month: monthInput.value }));
      refreshPanel();
    },
  });
  const ngoUnit = textInput('NGO unit rate');
  const ngoFloor = textInput('NGO floor');
  const privateUnit = textInput('Private unit rate');
  const privateFloor = textInput('Private floor');
  ngoUnit.value = randInputValue(ngo.unitCents ?? 1500);
  ngoFloor.value = randInputValue(ngo.floorCents ?? 15000);
  privateUnit.value = randInputValue(priv.unitCents ?? 4500);
  privateFloor.value = randInputValue(priv.floorCents ?? 45000);
  const sellerName = textInput('Legal / trading name');
  sellerName.value = payee.sellerName || 'Clock-Kit';
  const sellerVat = textInput('VAT number');
  sellerVat.value = payee.sellerVat || '';
  const sellerAddress = textInput('Address');
  sellerAddress.value = payee.sellerAddress || '';
  const bankName = textInput('Bank');
  bankName.value = payee.bankName || '';
  const accountName = textInput('Account name');
  accountName.value = payee.accountName || '';
  const accountNumber = textInput('Account number');
  accountNumber.value = payee.accountNumber || '';
  const branchCode = textInput('Branch code');
  branchCode.value = payee.branchCode || '';
  const accountType = textInput('Account type');
  accountType.value = payee.accountType || '';
  const swiftCode = textInput('SWIFT');
  swiftCode.value = payee.swiftCode || '';
  const paymentInstructions = textInput('Payment notes');
  paymentInstructions.value = payee.paymentInstructions || '';

  function editBilling(row) {
    const org = row.organisation;
    openForm({
      title: `Billing — ${org.name}`,
      fields: [
        {
          name: 'billingType',
          label: 'Plan',
          value: org.billing_type || 'PRIVATE',
          options: [
            { value: 'NGO', label: planOptionLabel('NGO', plans) },
            { value: 'PRIVATE', label: planOptionLabel('PRIVATE', plans) },
          ],
          onChange: (_input, inputs) => {
            const plan = plans[inputs.billingType.value];
            if (!plan) return;
            inputs.billingUnitRate.value = randInputValue(plan.unitCents);
            inputs.billingFloorRate.value = randInputValue(plan.floorCents);
          },
        },
        {
          name: 'billingUnitRate',
          label: 'Rate per active candidate (R)',
          value: randInputValue(org.billing_unit_cents ?? row.quote?.unitCents),
        },
        {
          name: 'billingFloorRate',
          label: 'Monthly floor (R)',
          value: randInputValue(org.billing_floor_cents ?? row.quote?.floorCents),
        },
        {
          name: 'billingVisibleToOrg',
          label: 'Organisation admin can see this bill',
          value: org.billing_visible_to_org ? 'true' : 'false',
          options: [
            { value: 'false', label: 'Hidden from organisation admin' },
            { value: 'true', label: 'Visible to organisation admin' },
          ],
        },
        { name: 'npoNumber', label: 'NPO / PBO number', value: org.npo_number || '' },
        { name: 'vatNumber', label: 'VAT number', value: org.vat_number || '' },
        { name: 'billingEmail', label: 'Billing email', type: 'email', value: org.billing_email || '' },
        { name: 'billingAddress', label: 'Billing address', value: org.billing_address || '' },
      ],
      onSubmit: async (values) => {
        await api('admin', 'billing-set-settings', {
          body: {
            organisationId: org.id,
            billingType: values.billingType,
            billingVisibleToOrg: values.billingVisibleToOrg === 'true',
            billingUnitCents: centsFromRand(values.billingUnitRate, 'Unit rate'),
            billingFloorCents: centsFromRand(values.billingFloorRate, 'Monthly floor'),
            npoNumber: values.npoNumber.trim() || null,
            vatNumber: values.vatNumber.trim() || null,
            billingEmail: values.billingEmail.trim() || null,
            billingAddress: values.billingAddress.trim() || null,
          },
        });
        toast('Billing settings saved');
      },
    });
  }

  async function issueOne(row) {
    const ok = await confirmAction(
      `Issue a tax invoice for ${row.organisation.name} covering ${overview.period.label}?`,
      { confirmLabel: 'Issue invoice' },
    );
    if (!ok) return;
    try {
      const data = await api('admin', 'billing-issue', {
        body: { organisationId: row.organisation.id, ...period },
        idempotent: true,
      });
      toast(data.replayed ? `Already issued as ${data.invoice.invoice_number}` : `Issued ${data.invoice.invoice_number}`);
      refreshPanel();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-4' }, [
      StatCard('Due this month', randLabel(dueCents)),
      StatCard('Unpaid', unpaidCount),
      StatCard('Not viewed', unviewedCount),
      StatCard('Invoices on file', invoices.length),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Account payments should be made to' }),
      el('p', {
        class: 'muted',
        text: 'This bank account and the invoice payment reference appear on every tax invoice PDF.',
      }),
      field('Legal / trading name', sellerName),
      field('VAT number', sellerVat),
      field('Address', sellerAddress),
      field('Bank', bankName),
      field('Account name', accountName),
      field('Account number', accountNumber),
      field('Branch code', branchCode),
      field('Account type', accountType),
      field('SWIFT / BIC', swiftCode),
      field('Payment notes', paymentInstructions),
      smBtn('Save payee account', async () => {
        try {
          await api('admin', 'billing-set-payee', {
            body: {
              sellerName: sellerName.value.trim() || 'Clock-Kit',
              sellerVat: sellerVat.value.trim() || null,
              sellerAddress: sellerAddress.value.trim() || null,
              bankName: bankName.value.trim() || null,
              accountName: accountName.value.trim() || null,
              accountNumber: accountNumber.value.trim() || null,
              branchCode: branchCode.value.trim() || null,
              accountType: accountType.value.trim() || null,
              swiftCode: swiftCode.value.trim() || null,
              paymentInstructions: paymentInstructions.value.trim() || null,
            },
          });
          toast('Payee account saved');
          refreshPanel();
        } catch (e) {
          toast(e.message, 'err');
        }
      }, 'btn-primary'),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Default plan rates' }),
      el('p', {
        class: 'muted',
        text: 'These amounts apply when you create an organisation or switch its plan. You can still set a different rate on each organisation. VAT stays 15%. Floor is not charged when no candidates were active.',
      }),
      field('NGO rate per active candidate (R)', ngoUnit),
      field('NGO monthly floor (R)', ngoFloor),
      field('Private rate per active candidate (R)', privateUnit),
      field('Private monthly floor (R)', privateFloor),
      smBtn('Save default rates', async () => {
        try {
          await api('admin', 'billing-set-plans', {
            body: {
              ngoUnitCents: centsFromRand(ngoUnit.value, 'NGO unit rate'),
              ngoFloorCents: centsFromRand(ngoFloor.value, 'NGO floor'),
              privateUnitCents: centsFromRand(privateUnit.value, 'Private unit rate'),
              privateFloorCents: centsFromRand(privateFloor.value, 'Private floor'),
            },
          });
          toast('Default rates saved');
          refreshPanel();
        } catch (e) {
          toast(e.message, 'err');
        }
      }, 'btn-primary'),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Subscription billing' }),
      el('p', {
        class: 'muted',
        text: 'The organisation owner always sees this bill. You choose whether the organisation admin sees it too. Change plan type and rates on each organisation with Settings.',
      }),
      field('Month', monthInput),
      actions([
        smBtn('Download Excel journal', async () => {
          try {
            const data = await api('admin', 'billing-journal', { body: {} });
            downloadBase64(data.filename, data.excelBase64, data.mime || 'application/vnd.ms-excel');
            toast('Journal downloaded');
          } catch (e) {
            toast(e.message, 'err');
          }
        }),
        smBtn('Issue all due invoices', async () => {
          const due = quotes.filter((row) => Number(row.quote?.totalCents) > 0);
          const ok = await confirmAction(
            `Issue invoices for ${due.length} organisation(s) for ${overview.period.label}? Already issued periods are reused.`,
            { confirmLabel: 'Issue invoices' },
          );
          if (!ok) return;
          try {
            for (const row of due) {
              await api('admin', 'billing-issue', {
                body: { organisationId: row.organisation.id, ...period },
                idempotent: true,
              });
            }
            toast('Invoices issued');
            refreshPanel();
          } catch (e) {
            toast(e.message, 'err');
          }
        }, 'btn-primary'),
      ]),
    ]),
    table(
      ['Organisation', 'Plan', 'Rate', 'Active', 'Inactive', 'Billed', 'Subtotal', 'VAT', 'Total', 'Admin can see', 'Actions'],
      quotes.map((row) => [
        row.organisation.name,
        row.organisation.billing_type === 'NGO' ? 'NGO' : 'Private',
        `${row.quote.unitLabel} / floor ${row.quote.floorLabel}`,
        String(row.roster?.active ?? 0),
        String(row.roster?.inactive ?? 0),
        String(row.activeCandidates),
        row.quote.subtotalLabel,
        row.quote.vatLabel,
        row.quote.floorApplied ? `${row.quote.totalLabel} (floor)` : row.quote.totalLabel,
        row.organisation.billing_visible_to_org ? 'Yes' : 'No',
        actions([
          smBtn('Settings', () => editBilling(row)),
          smBtn(row.organisation.billing_visible_to_org ? 'Hide from admin' : 'Show to admin', async () => {
            try {
              await api('admin', 'billing-set-settings', {
                body: {
                  organisationId: row.organisation.id,
                  billingVisibleToOrg: !row.organisation.billing_visible_to_org,
                },
              });
              toast(row.organisation.billing_visible_to_org
                ? 'Bill hidden from the organisation admin'
                : 'Organisation admin can now see this bill');
              refreshPanel();
            } catch (e) {
              toast(e.message, 'err');
            }
          }),
          smBtn('Issue invoice', () => issueOne(row)),
        ]),
      ]),
    ),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Invoice journal' }),
      el('p', { class: 'muted', text: 'Every invoice. Change payment status with the dropdown. Reference is what the organisation must use when paying. Viewed shows whether the organisation owner or admin opened the bill.' }),
    ]),
    table(
      ['Invoice', 'Organisation', 'Period', 'Total', 'Reference', 'Status', 'Viewed', 'Actions'],
      invoices.map((invoice) => [
        invoice.invoice_number,
        invoice.organisations?.name || '',
        `${invoice.period_start} – ${invoice.period_end}`,
        randLabel(invoice.total_cents),
        invoice.payment_reference || invoice.invoice_number,
        (() => {
          const node = selectInput(INVOICE_STATUS_OPTIONS, invoice.status);
          node.addEventListener('change', async () => {
            const next = node.value;
            if (next === invoice.status) return;
            if (next === 'VOID') {
              const ok = await confirmAction(
                `Void ${invoice.invoice_number}? You can issue a replacement for that period.`,
                { danger: true, confirmLabel: 'Void' },
              );
              if (!ok) {
                node.value = invoice.status;
                return;
              }
            }
            if (next === 'PAID') {
              node.value = invoice.status;
              openForm({
                title: `Record payment · ${invoice.invoice_number}`,
                submitLabel: 'Mark as paid',
                fields: [
                  {
                    name: 'receivedReference',
                    label: 'Bank / statement reference',
                    value: invoice.received_reference || invoice.payment_reference || invoice.invoice_number,
                  },
                ],
                onSubmit: async (values) => {
                  await api('admin', 'billing-set-status', {
                    body: {
                      invoiceId: invoice.id,
                      status: 'PAID',
                      receivedReference: values.receivedReference.trim() || null,
                    },
                  });
                  toast(`${invoice.invoice_number} is paid`);
                },
              });
              return;
            }
            try {
              await api('admin', 'billing-set-status', { body: { invoiceId: invoice.id, status: next } });
              toast(`${invoice.invoice_number} is ${invoiceStatusLabel(next).toLowerCase()}`);
              refreshPanel();
            } catch (e) {
              node.value = invoice.status;
              toast(e.message, 'err');
            }
          });
          return node;
        })(),
        viewedLabel(invoice),
        actions([
          smBtn('Reference', () => {
            openForm({
              title: `Payment reference · ${invoice.invoice_number}`,
              fields: [
                {
                  name: 'paymentReference',
                  label: 'Payment reference',
                  value: invoice.payment_reference || invoice.invoice_number,
                },
              ],
              onSubmit: async (values) => {
                await api('admin', 'billing-set-status', {
                  body: {
                    invoiceId: invoice.id,
                    status: invoice.status,
                    paymentReference: values.paymentReference.trim(),
                  },
                });
                toast('Payment reference saved');
              },
            });
          }),
          smBtn('PDF', async () => {
            try {
              await downloadInvoicePdf('admin', invoice.id);
            } catch (e) {
              toast(e.message, 'err');
            }
          }),
        ]),
      ]),
    ),
  ]);
}

const MAIL_AUDIENCE_OPTIONS = [
  { value: 'custom', label: 'Custom addresses' },
  { value: 'org_owners', label: 'Organisation owners' },
  { value: 'org_staff', label: 'Organisation staff' },
  { value: 'hosts', label: 'Hosts' },
  { value: 'candidates', label: 'Candidates' },
  { value: 'organisation', label: 'Everyone in one organisation' },
  { value: 'all_users', label: 'All logins with an email' },
];

function mailComposeBody({ audience, organisationId, emails, subject, body }) {
  return {
    audience,
    organisationId: audience === 'organisation' ? organisationId : undefined,
    emails: emails || undefined,
    subject,
    body,
  };
}

async function emailView() {
  const [settingsData, orgData, outboxData] = await Promise.all([
    api('admin', 'mail-settings', { body: {} }),
    api('admin', 'list-organisations', { body: {} }),
    api('admin', 'mail-outbox', { body: {} }),
  ]);
  const settings = settingsData.settings || {};
  const organisations = orgData.organisations || [];
  const outbox = outboxData.outbox || [];

  const fromName = textInput('Clock-Kit');
  fromName.value = settings.fromName || 'Clock-Kit';
  const fromEmail = textInput('hello@your-domain.com', 'email');
  fromEmail.value = settings.fromEmail || '';
  const replyTo = textInput('Optional reply-to', 'email');
  replyTo.value = settings.replyTo || '';
  const provider = selectInput(
    [
      { value: 'resend', label: 'Resend' },
      { value: 'smtp', label: 'SMTP' },
    ],
    settings.provider || 'resend',
  );
  const host = textInput('smtp.example.com');
  host.value = settings.host || '';
  const port = textInput('587', 'number');
  port.value = String(settings.port || 587);
  const username = textInput('SMTP username');
  username.value = settings.username || '';
  const password = textInput('', 'password');
  const secure = el('input', { type: 'checkbox' });
  secure.checked = Boolean(settings.secure);
  const secretHint = el('p', { class: 'field-help' });
  const settingsIntro = el('p', { class: 'muted' });
  const settingsErr = el('div', { class: 'form-error' });
  const smtpBlock = el('div', {}, [
    field('SMTP host', host),
    field('Port', port, '587 with STARTTLS, or 465 with implicit TLS.'),
    field('Username', username, 'Often the same as the from address. Leave blank if the host does not need a username.'),
    el('label', { class: 'check-row' }, [
      secure,
      el('span', { text: 'Use implicit TLS (port 465)' }),
    ]),
  ]);

  function paintProvider() {
    const resend = provider.value !== 'smtp';
    smtpBlock.hidden = resend;
    password.placeholder = resend
      ? (settings.passwordSet || settings.envKeySet ? 'Leave blank to keep the current key' : 're_...')
      : (settings.passwordSet ? 'Leave blank to keep the current password' : 'SMTP password');
    secretHint.textContent = resend
      ? settings.envKeySet && !settings.passwordSet
        ? 'RESEND_API_KEY is already set on the server. Paste a key here only if you want to override it. The from address must use a domain verified in Resend.'
        : 'From the Resend API keys page. The from address must use a domain you verified at resend.com/domains. The key is stored encrypted and is never shown again.'
      : settings.passwordSet
        ? 'Leave blank to keep the password already saved.'
        : 'Required the first time you save.';
    settingsIntro.textContent = settings.configured
      ? (resend
        ? 'Resend is ready. The API key is stored encrypted and is never shown again.'
        : 'SMTP is saved. The password is stored encrypted and is never shown again.')
      : (resend
        ? 'Use Resend for platform mail. Verify your sending domain, then paste an API key (or set RESEND_API_KEY on Vercel).'
        : 'Use your own SMTP host. The password is stored encrypted and is never shown again.');
  }
  provider.addEventListener('change', paintProvider);
  paintProvider();

  const audience = selectInput(MAIL_AUDIENCE_OPTIONS, 'custom');
  const orgSelect = el('select', { class: 'input' }, orgOptions(organisations));
  const orgField = field('Organisation', orgSelect);
  orgField.hidden = true;
  const extraEmails = el('textarea', {
    class: 'input',
    rows: '3',
    placeholder: 'one@org.com, two@org.com',
  });
  const subject = textInput('Subject');
  const body = el('textarea', { class: 'input legal-editor', placeholder: 'Plain text only' });
  body.style.minHeight = '160px';
  const preview = el('p', {
    class: 'muted',
    text: settings.configured
      ? 'Choose an audience, then preview before you send.'
      : 'Save email settings before you send mail.',
  });
  const composeErr = el('div', { class: 'form-error' });

  function composePayload() {
    return mailComposeBody({
      audience: audience.value,
      organisationId: orgSelect.value,
      emails: extraEmails.value.trim(),
      subject: subject.value.trim(),
      body: body.value.trim(),
    });
  }

  audience.addEventListener('change', () => {
    orgField.hidden = audience.value !== 'organisation';
  });

  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Email settings' }),
      settingsIntro,
      field('Provider', provider),
      field('From name', fromName),
      field('From email', fromEmail, 'Must use a domain verified in Resend when Resend is selected.'),
      field('Reply-to', replyTo, 'Optional. Leave blank to use the from address.'),
      smtpBlock,
      field('API key / password', password),
      secretHint,
      settingsErr,
      actions([
        smBtn('Save settings', async () => {
          settingsErr.textContent = '';
          try {
            await api('admin', 'save-mail-settings', {
              body: {
                provider: provider.value,
                fromName: fromName.value.trim(),
                fromEmail: fromEmail.value.trim(),
                replyTo: replyTo.value.trim(),
                host: host.value.trim(),
                port: Number(port.value) || undefined,
                secure: secure.checked,
                username: username.value.trim(),
                password: password.value,
              },
            });
            toast('Email settings saved.');
            password.value = '';
            refreshPanel();
          } catch (e) {
            settingsErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }, 'btn-primary'),
        smBtn('Send test to me', async () => {
          settingsErr.textContent = '';
          try {
            await api('admin', 'send-mail', {
              body: {
                test: true,
                subject: 'Clock-Kit test',
                body: 'This is a test message from the Clock-Kit platform admin panel.',
                to: user.email,
              },
            });
            toast('Test email sent.');
            refreshPanel();
          } catch (e) {
            settingsErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }),
      ]),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Compose' }),
      el('p', {
        class: 'muted',
        text: `Bulk mail goes out in batches of ${settings.batchSize || 100} so the server stays within its time limit. Extra addresses are always added to the audience.`,
      }),
      field('Audience', audience),
      orgField,
      field('Extra addresses', extraEmails, 'Required for custom addresses. Comma, space, or new line between emails.'),
      field('Subject', subject),
      field('Message', body),
      preview,
      composeErr,
      actions([
        smBtn('Preview recipients', async () => {
          composeErr.textContent = '';
          try {
            const payload = composePayload();
            const data = await api('admin', 'mail-recipients', { body: payload });
            const sample = (data.sample || []).map((row) => row.email).join(', ');
            preview.textContent = data.total
              ? `${data.total} recipient${data.total === 1 ? '' : 's'}${sample ? `. First: ${sample}` : '.'}`
              : 'No recipients match that audience.';
          } catch (e) {
            composeErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }),
        smBtn('Send', async () => {
          composeErr.textContent = '';
          const payload = composePayload();
          if (!payload.subject || !payload.body) {
            composeErr.textContent = 'Enter a subject and a message.';
            return;
          }
          try {
            const data = await api('admin', 'mail-recipients', { body: payload });
            if (!data.total) {
              composeErr.textContent = 'No recipients match that audience.';
              return;
            }
            const ok = await confirmAction(
              `Send “${payload.subject}” to ${data.total} address${data.total === 1 ? '' : 'es'}?`,
              { confirmLabel: 'Send' },
            );
            if (!ok) return;
            let offset = 0;
            let sent = 0;
            let failed = 0;
            while (offset < 2000) {
              preview.textContent = `Sending… ${sent + failed} of ${data.total}`;
              const result = await api('admin', 'send-bulk-mail', { body: { ...payload, offset } });
              sent += result.sent;
              failed += result.failed;
              if (!result.remaining) break;
              offset = result.offset + result.limit;
            }
            toast(failed ? `Sent ${sent}. ${failed} failed.` : `Sent ${sent} email${sent === 1 ? '' : 's'}.`);
            refreshPanel();
          } catch (e) {
            composeErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }, 'btn-primary'),
      ]),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Sent' }),
      table(
        ['When', 'Audience', 'Subject', 'Sent'],
        outbox.map((row) => [
          formatTime(row.createdAt),
          row.audience,
          row.subject,
          `${row.sentCount}/${row.recipientCount}${row.failedCount ? ` · ${row.failedCount} failed` : ''}`,
        ]),
      ),
    ]),
  ]);
}

function prospectFields(row = {}) {
  return [
    { name: 'name', label: 'Name', value: row.name || '' },
    {
      name: 'category',
      label: 'Category',
      value: row.category || 'staffing',
      options: PROSPECT_CATEGORIES,
    },
    { name: 'area', label: 'Area', value: row.area || 'Sandton' },
    { name: 'address', label: 'Address', type: 'textarea', rows: 2, value: row.address || '' },
    { name: 'email', label: 'Email', type: 'email', value: row.email || '' },
    { name: 'phone', label: 'Phone', value: row.phone || '' },
    { name: 'whatsapp', label: 'WhatsApp', value: row.whatsapp || '' },
    { name: 'website', label: 'Website', value: row.website || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, value: row.notes || '' },
    {
      name: 'status',
      label: 'Status',
      value: row.status || 'NEW',
      options: PROSPECT_STATUSES,
    },
  ];
}

function saveProspectBody(values, id) {
  return {
    ...(id ? { id } : {}),
    name: values.name.trim(),
    category: values.category,
    area: values.area.trim(),
    address: values.address.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    whatsapp: values.whatsapp.trim(),
    website: values.website.trim(),
    notes: values.notes.trim(),
    status: values.status,
  };
}

async function readImportFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (!buf.length) throw new Error('The file is empty');
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    throw new Error('Save the spreadsheet as CSV. Clock-Kit cannot read Excel .xlsx files.');
  }
  if (buf[0] === 0xd0 && buf[1] === 0xcf) {
    throw new Error('This Excel file is binary. Save it as CSV and import that instead.');
  }
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
  return new TextDecoder('utf-8').decode(buf);
}

async function outreachView() {
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const statusFilter = params.get('status') || '';
  let prospects = [];
  let loadError = '';
  try {
    const data = await api('admin', 'prospects', {
      body: {
        ...(q ? { q } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
    });
    prospects = data.prospects || [];
  } catch (err) {
    loadError = err.message;
  }
  const search = textInput('Search name, email, or phone');
  search.value = q;
  const statusSel = selectInput([{ value: '', label: 'All statuses' }, ...PROSPECT_STATUSES], statusFilter);
  const importErr = el('div', { class: 'form-error', text: loadError });
  const picker = el('input', {
    class: 'input',
    type: 'file',
    accept: '.csv,.xls,.xlsx,text/csv,text/xml,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  async function importText(text, filename) {
    importErr.textContent = '';
    const result = await api('admin', 'import-prospects', { body: { text, filename } });
    toast(`Imported ${result.imported} organisation${result.imported === 1 ? '' : 's'}.`);
    refreshPanel();
  }

  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    try {
      await importText(await readImportFile(file), file.name);
    } catch (e) {
      importErr.textContent = e.message;
      toast(e.message, 'err');
    }
  });

  function applyFilters() {
    setView('outreach', {
      ...(search.value.trim() ? { q: search.value.trim() } : {}),
      ...(statusSel.value ? { status: statusSel.value } : {}),
    });
    refreshPanel();
  }
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyFilters();
    }
  });
  statusSel.addEventListener('change', applyFilters);

  return el('div', { class: 'stack' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Outreach' }),
      el('p', {
        class: 'muted',
        text: 'Import a CSV, or load the Sandton list. If Excel saved a .xlsx, use Save As → CSV first.',
      }),
      field('CSV or Excel file', picker),
      importErr,
      actions([
        smBtn('Import Sandton list', async () => {
          try {
            const res = await fetch(withBase('outreach/sandton-targets.csv'));
            if (!res.ok) throw new Error('Could not load the Sandton list from this app.');
            await importText(await res.text(), 'sandton-targets.csv');
          } catch (e) {
            importErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }, 'btn-primary'),
        smBtn('Add organisation', () => {
          openForm({
            title: 'Add organisation',
            submitLabel: 'Save',
            fields: prospectFields(),
            onSubmit: async (values) => {
              await api('admin', 'save-prospect', { body: saveProspectBody(values) });
              toast('Organisation saved.');
            },
          });
        }),
        smBtn('Download CSV', async () => {
          try {
            const file = await api('admin', 'export-prospects', { body: { format: 'csv' } });
            downloadText(file.filename || 'clock-kit-prospects.csv', file.csv, file.mime || 'text/csv');
          } catch (e) {
            importErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }),
        smBtn('Download Excel', async () => {
          try {
            const file = await api('admin', 'export-prospects', { body: { format: 'xls' } });
            downloadBase64(file.filename || 'clock-kit-prospects.xls', file.excelBase64, file.mime || 'application/vnd.ms-excel');
          } catch (e) {
            importErr.textContent = e.message;
            toast(e.message, 'err');
          }
        }),
      ]),
    ]),
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Organisations' }),
      el('p', { class: 'muted', text: `${prospects.length} saved.` }),
      field('Search', search),
      field('Status', statusSel),
      smBtn('Apply filters', applyFilters),
      table(
        ['Name', 'Category', 'Area', 'Email', 'Phone', 'WhatsApp', 'Status', 'Actions'],
        prospects.map((row) => [
          row.name,
          row.category || '—',
          row.area || '—',
          row.email || '—',
          row.phone || '—',
          row.whatsapp || '—',
          row.status,
          actions([
            smBtn('Edit', () => {
              openForm({
                title: `Edit ${row.name}`,
                fields: prospectFields(row),
                onSubmit: async (values) => {
                  await api('admin', 'save-prospect', { body: saveProspectBody(values, row.id) });
                  toast('Organisation saved.');
                },
              });
            }),
            smBtn('Delete', async () => {
              const ok = await confirmAction(`Delete ${row.name} from outreach?`, {
                danger: true,
                confirmLabel: 'Delete',
              });
              if (!ok) return;
              try {
                await api('admin', 'delete-prospect', { body: { id: row.id } });
                toast('Deleted.');
                refreshPanel();
              } catch (e) {
                toast(e.message, 'err');
              }
            }),
          ]),
        ]),
      ),
    ]),
  ]);
}

async function profileView() {
  return AccountForm({ user, showIdentity: false });
}

const user = Auth.requireRole('PLATFORM_ADMIN');
await bootPanel({
  title: 'Platform',
  items: NAV,
  user,
  defaultView: 'dashboard',
  views: {
    dashboard,
    organisations,
    users,
    hosts,
    candidates: candidatesView,
    sites,
    assignments,
    security,
    health,
    legal,
    guides,
    help: () => HelpPanel({ fn: 'admin', editable: true, user }),
    email: emailView,
    outreach: outreachView,
    billing,
    notifications: AlertsPanel,
    profile: profileView,
  },
});
