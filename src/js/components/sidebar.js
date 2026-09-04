import { el, href, liveText, nowClock } from '../utils/dom.js';
import { Auth } from '../auth.js';
import { withBase } from '../config.js';
import { icon, viewIcon } from '../icons.js';
import { reveal } from '../motion.js';
import { fillPwaSlots } from '../pwa.js';
import { viewLoader } from '../busy.js';

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
  billing: 'Records',
  settings: 'Records',
  security: 'System',
  health: 'System',
  legal: 'System',
  guides: 'System',
  help: 'System',
  email: 'System',
  outreach: 'System',
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

const SIDEBAR_KEY = 'ck_sidebar_collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function setToggleUi(btn, collapsed) {
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  btn.title = collapsed ? 'Expand menu' : 'Collapse menu';
  btn.replaceChildren(icon(collapsed ? 'chevrons-right' : 'chevrons-left', { size: 18 }));
}

function applyCollapsed(root, collapsed) {
  root.classList.toggle('is-sidebar-collapsed', collapsed);
  root.querySelector('.sidebar')?.classList.toggle('is-collapsed', collapsed);
  const btn = root.querySelector('.sidebar-toggle');
  if (btn) setToggleUi(btn, collapsed);
}

function collapseToggle() {
  const btn = el('button', { class: 'sidebar-toggle', type: 'button' });
  setToggleUi(btn, readCollapsed());
  btn.addEventListener('click', () => {
    const root = btn.closest('.shell');
    if (!root) return;
    const next = !root.classList.contains('is-sidebar-collapsed');
    applyCollapsed(root, next);
    writeCollapsed(next);
  });
  return btn;
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
      el('img', { src: withBase('assets/logo/clock-kit-icon.svg'), alt: '' }),
    ]),
    el('span', { class: 'brand-copy' }, [
      el('img', {
        class: 'brand-wordmark',
        src: withBase('assets/logo/clock-kit-text.svg'),
        alt: 'Clock-Kit',
      }),
      el('span', { class: 'brand-role', text: title }),
    ]),
  ]);
}

function accountCard(user, title) {
  const name = user.displayName || user.email || 'Signed in';
  return el('div', { class: 'sidebar-user', title: name }, [
    el('span', { class: 'sidebar-avatar', 'aria-hidden': 'true', text: initials(user) }),
    el('span', { class: 'sidebar-user-meta' }, [
      el('strong', { text: name }),
      el('span', { class: 'muted', text: ROLE_LABEL[user.role] || title }),
    ]),
  ]);
}

function legalLinks() {
  return el('div', { class: 'sidebar-legal' }, [
    el('a', { href: withBase('faq.html') }, ['FAQs']),
    el('a', { href: withBase('support.html') }, ['Support']),
    el('a', { href: withBase('feedback.html') }, ['Feedback']),
    el('a', { href: withBase('terms.html') }, ['Terms']),
    el('a', { href: withBase('privacy.html') }, ['Privacy']),
    el('button', {
      class: 'linkish',
      type: 'button',
      onClick: () => window.dispatchEvent(new Event('ck:tour')),
    }, ['Take a tour']),
  ]);
}

function signOutButton() {
  return el('button', {
    class: 'btn sign-out',
    type: 'button',
    title: 'Sign out',
    'aria-label': 'Sign out',
    onClick: () => Auth.logout(),
  }, [
    icon('log-out', { size: 18 }),
    el('span', { class: 'sign-out-label', text: 'Sign out' }),
  ]);
}

export function Sidebar({ title, items, view, user }) {
  const homeView = items[0]?.view || 'dashboard';
  const collapsed = readCollapsed();
  return el('aside', {
    class: `sidebar${collapsed ? ' is-collapsed' : ''}`,
    'aria-label': 'Clock-Kit',
  }, [
    el('div', { class: 'sidebar-head' }, [
      brandLockup(title, homeView),
      collapseToggle(),
    ]),
    el('nav', { class: 'sidebar-nav', 'aria-label': `${title} navigation` }, navGroups(items, view)),
    el('div', { class: 'sidebar-foot' }, [
      el('div', { class: 'pwa-slot' }),
      accountCard(user, title),
      legalLinks(),
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
    el('div', { class: 'pwa-slot' }),
    accountCard(user, title),
    legalLinks(),
    signOutButton(),
  ]);
  document.body.append(backdrop, sheet);
  fillPwaSlots();
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
    rest.length ? more : null,
  ]);
}

export function shell({ title, items, view, heading, user, content }) {
  const body = el('div', { class: 'page-body' }, [content]);
  const stage = el('div', { class: 'page-stage' }, [body, viewLoader()]);
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
  return el('div', { class: `shell${readCollapsed() ? ' is-sidebar-collapsed' : ''}` }, [
    Sidebar({ title, items, view, user }),
    el('div', { class: 'shell-main' }, [
      el('main', { class: 'main' }, [topbar, stage]),
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
    reveal(body);
  }
}

export { table } from './list-view.js';
