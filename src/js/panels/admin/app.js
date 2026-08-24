import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, viewParam, formatTime, toast } from '../../utils/dom.js';
import { shell, table } from '../../components/sidebar.js';
import { StatCard } from '../../components/clock-card.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'organisations', label: 'Organisations' },
  { view: 'users', label: 'Users' },
  { view: 'security', label: 'Security' },
  { view: 'health', label: 'Health' },
];

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
  const name = el('input', { class: 'input', placeholder: 'Organisation name' });
  const ownerEmail = el('input', { class: 'input', type: 'email', placeholder: 'Owner email' });
  const ownerName = el('input', { class: 'input', placeholder: 'Owner name' });
  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Create organisation' }),
      el('div', { class: 'field' }, [el('span', { text: 'Name' }), name]),
      el('div', { class: 'field' }, [el('span', { text: 'Owner name' }), ownerName]),
      el('div', { class: 'field' }, [el('span', { text: 'Owner email' }), ownerEmail]),
      el('button', {
        class: 'btn btn-primary',
        onClick: async () => {
          try {
            const created = await api('admin', 'create-organisation', {
              body: { name: name.value, ownerEmail: ownerEmail.value, ownerName: ownerName.value },
            });
            toast(`Created. Owner password: ${created.temporaryPassword}`);
            location.reload();
          } catch (e) {
            toast(e.message, 'err');
          }
        },
      }, ['Create']),
    ]),
    table(
      ['Name', 'Status', 'Timezone'],
      (data.organisations || []).map((o) => [
        o.name,
        o.status,
        o.timezone,
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
  users: organisations,
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
