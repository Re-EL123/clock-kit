import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, formatTime, toast, downloadBase64, href } from '../../utils/dom.js';
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
  { view: 'notifications', label: 'Alerts' },
  { view: 'profile', label: 'Account' },
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
  return el('div', { class: 'btn-row' }, buttons);
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
      StatCard('Active candidates', stats.activeCandidates),
      StatCard('Hosts', stats.hosts, '?view=hosts'),
      StatCard('Clocked in today', stats.clockedInToday),
    ]),
    el('div', { class: 'grid grid-2 grid-charts' }, [
      ChartCard({
        title: 'People on the platform',
        subtitle: 'Active organisations, hosts, and candidates',
        type: 'doughnut',
        ...doughnutFromCounts({
          Organisations: stats.organisations,
          Hosts: stats.hosts,
          Candidates: stats.activeCandidates,
          'Clocked in': stats.clockedInToday,
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
      ['Name', 'Plan', 'Status', 'Timezone', 'Actions'],
      (data.organisations || []).map((o) => [
        o.name,
        o.billing_type === 'NGO' ? 'NGO' : 'Private',
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
  const candRef = textInput('Reference');
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
      field('Reference', candRef),
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
  return table(
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
  );
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
      ['Organisation', 'Plan', 'Rate', 'Active', 'Subtotal', 'VAT', 'Total', 'Admin can see', 'Actions'],
      quotes.map((row) => [
        row.organisation.name,
        row.organisation.billing_type === 'NGO' ? 'NGO' : 'Private',
        `${row.quote.unitLabel} / floor ${row.quote.floorLabel}`,
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
      el('p', { class: 'muted', text: 'Every invoice. Change payment status with the dropdown. Viewed shows whether the organisation owner or admin opened the bill.' }),
    ]),
    table(
      ['Invoice', 'Organisation', 'Period', 'Total', 'Status', 'Viewed', 'Actions'],
      invoices.map((invoice) => [
        invoice.invoice_number,
        invoice.organisations?.name || '',
        `${invoice.period_start} – ${invoice.period_end}`,
        randLabel(invoice.total_cents),
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
    billing,
    notifications: AlertsPanel,
    profile: profileView,
  },
});
