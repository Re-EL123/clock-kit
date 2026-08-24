import { el, viewParam } from './utils/dom.js';
import { shell, replaceShellContent, closeMoreSheet } from './components/sidebar.js';
import { armSounds } from './sound.js';
import { startPwa } from './pwa.js';
import { PanelLoader, beginPaint, endPaint } from './busy.js';

export function refreshPanel() {
  window.dispatchEvent(new Event('ck:refresh'));
}

function samePanel(url) {
  return url.origin === location.origin && url.pathname === location.pathname;
}

export async function bootPanel({ title, items, user, views, defaultView }) {
  armSounds();
  const root = document.getElementById('app');
  root.replaceChildren(PanelLoader('Loading your workspace'));
  let current = viewParam(defaultView);
  let tree;

  async function paint(view = current) {
    current = view || viewParam(defaultView);
    const heading = items.find((item) => item.view === current)?.label || title;
    beginPaint();
    try {
      let content;
      try {
        content = await (views[current] || views[defaultView])();
      } catch (err) {
        content = el('p', { class: 'form-error', text: err.message });
      }
      if (!tree) {
        tree = shell({ title, items, view: current, heading, user, content });
        root.replaceChildren(tree);
      } else {
        replaceShellContent(tree, { view: current, heading, content, items });
      }
      closeMoreSheet();
    } finally {
      endPaint();
    }
  }

  document.addEventListener('click', (ev) => {
    const link = ev.target.closest('a[href]');
    if (!link || link.target === '_blank' || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    let url;
    try {
      url = new URL(link.getAttribute('href'), location.href);
    } catch {
      return;
    }
    if (!samePanel(url)) return;
    const view = url.searchParams.get('view') || defaultView;
    ev.preventDefault();
    const next = `${url.pathname}${url.search}`;
    if (`${location.pathname}${location.search}` !== next) {
      history.pushState({ view }, '', next);
    }
    paint(view);
  });

  window.addEventListener('popstate', () => paint(viewParam(defaultView)));
  window.addEventListener('ck:refresh', () => paint(current));
  window.addEventListener('online', () => paint(current));
  await paint(current);
  startPwa();
}
