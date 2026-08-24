import { el, href, nowClock } from '../utils/dom.js';
import { Auth } from '../auth.js';
import { withBase } from '../config.js';
import { icon, viewIcon } from '../icons.js';
import { reveal } from '../motion.js';

function liveClock() {
  const node = el('div', { class: 'live-clock' }, [
    el('span', { class: 'live-dot', 'aria-hidden': 'true' }),
    icon('clock', { size: 16 }),
    el('span', { class: 'live-clock-time', text: nowClock() }),
  ]);
  const time = node.querySelector('.live-clock-time');
  setInterval(() => {
    time.textContent = nowClock();
  }, 1000);
  return node;
}

export function Sidebar({ title, items, view }) {
  return el('aside', { class: 'sidebar' }, [
    el('div', { class: 'brand' }, [
      el('img', { src: withBase('assets/logo/clock-kit-mark.svg'), alt: 'Clock-Kit' }),
      el('div', {}, [
        el('strong', { text: 'Clock-Kit' }),
        el('div', { class: 'muted', text: title }),
      ]),
    ]),
    ...items.map((item) =>
      el('a', { class: `nav-link ${item.view === view ? 'active' : ''}`, href: href(item.view) }, [
        viewIcon(item.view, { size: 18 }),
        item.label,
      ]),
    ),
    el('button', { class: 'btn mt sign-out', onClick: () => Auth.logout() }, [
      icon('log-out', { size: 18 }),
      'Sign out',
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

export function MobileNav(items, view) {
  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const nav = el('nav', { class: 'mobile-nav', 'aria-label': 'Primary' }, [
    ...primary.map((item) =>
      el('a', { href: href(item.view), class: item.view === view ? 'active' : '' }, [
        viewIcon(item.view, { size: 20 }),
        item.label,
      ]),
    ),
  ]);

  if (rest.length) {
    const more = el('button', { type: 'button', class: rest.some((item) => item.view === view) ? 'active' : '' }, [
      icon('more', { size: 20 }),
      'More',
    ]);
    more.addEventListener('click', () => {
      document.querySelector('.more-sheet')?.remove();
      const sheet = el('div', { class: 'more-sheet card' }, rest.map((item) =>
        el('a', { class: `nav-link ${item.view === view ? 'active' : ''}`, href: href(item.view) }, [
          viewIcon(item.view, { size: 18 }),
          item.label,
        ]),
      ));
      document.body.append(sheet);
      const close = (ev) => {
        if (sheet.contains(ev.target) || more.contains(ev.target)) return;
        sheet.remove();
        document.removeEventListener('click', close);
      };
      setTimeout(() => document.addEventListener('click', close), 0);
    });
    nav.append(more);
  }
  return nav;
}

export function shell({ title, items, view, heading, user, content }) {
  const body = el('div', { class: 'page-body' }, [content]);
  queueMicrotask(() => reveal(body));
  return el('div', { class: 'shell' }, [
    Sidebar({ title, items, view }),
    el('div', {}, [
      el('main', { class: 'main' }, [Topbar({ heading, user }), body]),
      MobileNav(items, view),
    ]),
  ]);
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
