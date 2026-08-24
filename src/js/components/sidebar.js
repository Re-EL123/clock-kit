import { el, href, liveText, nowClock } from '../utils/dom.js';
import { Auth } from '../auth.js';
import { withBase } from '../config.js';
import { icon, viewIcon } from '../icons.js';
import { reveal } from '../motion.js';

const SECTION_FOR = {
  dashboard: 'Overview',
  home: 'Overview',
  organisations: 'Directory',
  users: 'Directory',
  hosts: 'Directory',
  candidates: 'Directory',
  sites: 'Directory',
  assignments: 'Directory',
  schedules: 'Time',
  schedule: 'Time',
  attendance: 'Time',
  leave: 'Time',
  approvals: 'Time',
  reports: 'Records',
  audit: 'Records',
  settings: 'Records',
  security: 'System',
  health: 'System',
  notifications: 'Account',
  alerts: 'Account',
  profile: 'Account',
};

const ROLE_LABEL = {
  PLATFORM_ADMIN: 'Platform admin',
  ORG_OWNER: 'Owner',
  ORG_ADMIN: 'Admin',
  ORG_MANAGER: 'Manager',
  ORG_VIEWER: 'Viewer',
  HOST: 'Host',
  CANDIDATE: 'Candidate',
};

function liveClock() {
  const node = el('div', { class: 'live-clock' }, [
    el('span', { class: 'live-dot', 'aria-hidden': 'true' }),
    icon('clock', { size: 16 }),
    el('span', { class: 'live-clock-time', text: nowClock() }),
  ]);
  const time = node.querySelector('.live-clock-time');
  liveText(node, () => {
    time.textContent = nowClock();
  }, 1000);
  return node;
}

function initials(user) {
  const source = String(user?.displayName || user?.email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function grouped(items) {
  const groups = [];
  for (const item of items) {
    const name = item.section || SECTION_FOR[item.view] || '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }
  const named = new Set(groups.map((group) => group.name).filter(Boolean));
  return { groups, showHeadings: named.size > 1 };
}

function navLink(item, view) {
  const active = item.view === view;
  return el('a', {
    class: `nav-link${active ? ' active' : ''}`,
    href: href(item.view),
    dataset: { view: item.view },
    'aria-current': active ? 'page' : null,
  }, [
    el('span', { class: 'nav-ico', 'aria-hidden': 'true' }, [viewIcon(item.view, { size: 18 })]),
    el('span', { class: 'nav-label', text: item.label }),
  ]);
}

function navGroups(items, view) {
  if (!items.length) return [];
  const { groups, showHeadings } = grouped(items);
  return groups.map((group) =>
    el('div', { class: 'nav-section' }, [
      showHeadings && group.name ? el('p', { class: 'nav-section-label', text: group.name }) : null,
      ...group.items.map((item) => navLink(item, view)),
    ]),
  );
}

function brandLockup(title, homeView) {
  return el('a', { class: 'brand', href: href(homeView), 'aria-label': 'Clock-Kit home' }, [
    el('span', { class: 'brand-mark' }, [
      el('img', { src: withBase('assets/logo/clock-kit-mark.svg'), alt: '' }),
    ]),
    el('span', { class: 'brand-copy' }, [
      el('strong', { class: 'brand-wordmark' }, [
        el('span', { class: 'ck-navy', text: 'Clock' }),
        el('span', { class: 'ck-red', text: '-Kit' }),
      ]),
      el('span', { class: 'brand-role', text: title }),
    ]),
  ]);
}

function accountCard(user, title) {
  return el('div', { class: 'sidebar-user' }, [
    el('span', { class: 'sidebar-avatar', 'aria-hidden': 'true', text: initials(user) }),
    el('span', { class: 'sidebar-user-meta' }, [
      el('strong', { text: user.displayName || user.email || 'Signed in' }),
      el('span', { class: 'muted', text: ROLE_LABEL[user.role] || title }),
    ]),
  ]);
}

function signOutButton() {
  return el('button', { class: 'btn sign-out', type: 'button', onClick: () => Auth.logout() }, [
    icon('log-out', { size: 18 }),
    'Sign out',
  ]);
}

export function Sidebar({ title, items, view, user }) {
  const homeView = items[0]?.view || 'dashboard';
  return el('aside', { class: 'sidebar', 'aria-label': 'Clock-Kit' }, [
    brandLockup(title, homeView),
    el('nav', { class: 'sidebar-nav', 'aria-label': `${title} navigation` }, navGroups(items, view)),
    el('div', { class: 'sidebar-foot' }, [
      el('div', { class: 'pwa-slot' }),
      accountCard(user, title),
      signOutButton(),
    ]),
  ]);
}

export function Topbar({ heading, user }) {
  return el('header', { class: 'topbar' }, [
    el('div', {}, [
      el('h1', { text: heading }),
      el('div', { class: 'topbar-user muted' }, [
        icon('user', { size: 16 }),
        user.displayName || user.email,
      ]),
    ]),
    liveClock(),
  ]);
}

export function closeMoreSheet() {
  document.querySelector('.more-sheet-backdrop')?.remove();
  document.querySelector('.more-sheet')?.remove();
  document.querySelector('.mobile-nav .more-btn')?.setAttribute('aria-expanded', 'false');
}

function closeMore() {
  closeMoreSheet();
}

function openMoreSheet({ rest, view, user, title, more }) {
  closeMore();
  more.setAttribute('aria-expanded', 'true');
  const backdrop = el('div', { class: 'more-sheet-backdrop', onClick: closeMore });
  const sheet = el('div', {
    class: 'more-sheet card',
    role: 'dialog',
    'aria-label': 'More',
  }, [
    ...navGroups(rest, view),
    accountCard(user, title),
    signOutButton(),
  ]);
  document.body.append(backdrop, sheet);
  const onKey = (ev) => {
    if (ev.key !== 'Escape') return;
    closeMore();
    document.removeEventListener('keydown', onKey);
  };
  document.addEventListener('keydown', onKey);
}

export function MobileNav(items, view, user, title) {
  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const moreActive = rest.some((item) => item.view === view);
  const more = el('button', {
    type: 'button',
    class: `more-btn${moreActive ? ' active' : ''}`,
    'aria-expanded': 'false',
    'aria-haspopup': 'dialog',
  }, [
    icon('more', { size: 20 }),
    'More',
  ]);
  more.addEventListener('click', () => {
    if (document.querySelector('.more-sheet')) closeMore();
    else openMoreSheet({ rest, view, user, title, more });
  });

  return el('nav', { class: 'mobile-nav', 'aria-label': 'Primary' }, [
    ...primary.map((item) =>
      el('a', {
        href: href(item.view),
        class: item.view === view ? 'active' : '',
        dataset: { view: item.view },
      }, [
        viewIcon(item.view, { size: 20 }),
        item.label,
      ]),
    ),
    more,
  ]);
}

export function shell({ title, items, view, heading, user, content }) {
  const body = el('div', { class: 'page-body' }, [content]);
  const headingEl = el('h1', { text: heading });
  queueMicrotask(() => reveal(body));
  const topbar = el('header', { class: 'topbar' }, [
    el('div', {}, [
      headingEl,
      el('div', { class: 'topbar-user muted' }, [
        icon('user', { size: 16 }),
        user.displayName || user.email,
      ]),
    ]),
    liveClock(),
  ]);
  return el('div', { class: 'shell' }, [
    Sidebar({ title, items, view, user }),
    el('div', { class: 'shell-main' }, [
      el('main', { class: 'main' }, [topbar, body]),
      MobileNav(items, view, user, title),
    ]),
  ]);
}

export function replaceShellContent(root, { view, heading, content, items = [] }) {
  root.querySelectorAll('[data-view]').forEach((node) => {
    const on = node.dataset.view === view;
    node.classList.toggle('active', on);
    if (on) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  const rest = items.slice(4);
  const more = root.querySelector('.mobile-nav .more-btn');
  if (more) more.classList.toggle('active', rest.some((item) => item.view === view));
  const headingEl = root.querySelector('.topbar h1');
  if (headingEl) headingEl.textContent = heading;
  const body = root.querySelector('.page-body');
  if (body) {
    body.replaceChildren(content);
    body.classList.remove('is-refreshing');
    reveal(body);
  }
}

export function table(headers, rows) {
  return el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [el('tr', {}, headers.map((h) => el('th', { text: h })))]),
      el(
        'tbody',
        {},
        rows.length
          ? rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, [c]))))
          : [el('tr', {}, [el('td', { colSpan: String(headers.length) }, [EmptyHint()])])],
      ),
    ]),
  ]);
}

function EmptyHint() {
  return el('div', { class: 'empty' }, [icon('clipboard', { size: 28 }), 'No records']);
}
