import { el, href } from '../utils/dom.js';
import { Auth } from '../auth.js';

export function Sidebar({ title, items, view }) {
  return el('aside', { class: 'sidebar' }, [
    el('div', { class: 'brand' }, [
      el('img', { src: '/assets/logo/clock-kit-mark.svg', alt: 'Clock-Kit' }),
      el('div', {}, [
        el('strong', { text: 'Clock-Kit' }),
        el('div', { class: 'muted', text: title }),
      ]),
    ]),
    ...items.map((item) =>
      el('a', { class: `nav-link ${item.view === view ? 'active' : ''}`, href: href(item.view) }, [item.label]),
    ),
    el('button', { class: 'btn mt', onClick: () => Auth.logout() }, ['Sign out']),
  ]);
}

export function Topbar({ heading, user }) {
  return el('header', { class: 'topbar' }, [
    el('div', {}, [
      el('h1', { text: heading }),
      el('div', { class: 'muted', text: user.displayName || user.email }),
    ]),
  ]);
}

export function MobileNav(items, view) {
  return el(
    'nav',
    { class: 'mobile-nav', 'aria-label': 'Primary' },
    items.slice(0, 5).map((item) =>
      el('a', { href: href(item.view), class: item.view === view ? 'active' : '' }, [item.label]),
    ),
  );
}

export function shell({ title, items, view, heading, user, content }) {
  return el('div', { class: 'shell' }, [
    Sidebar({ title, items, view }),
    el('div', {}, [
      el('main', { class: 'main' }, [Topbar({ heading, user }), content]),
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
          : [el('tr', {}, [el('td', { colSpan: String(headers.length), class: 'empty', text: 'No records' })])],
      ),
    ]),
  ]);
}
