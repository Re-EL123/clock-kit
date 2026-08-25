import { api } from '../api.js';
import { el, formatTime, toast } from '../utils/dom.js';
import { table } from './sidebar.js';
import { enablePushNotifications, installIconName, installLabel, promptInstall, pushStatus } from '../pwa.js';
import { icon } from '../icons.js';

function refresh() {
  window.dispatchEvent(new Event('ck:refresh'));
}

export async function AlertsPanel() {
  const [data, status] = await Promise.all([
    api('notifications', 'list', { body: {} }),
    pushStatus(),
  ]);
  const unread = (data.notifications || []).filter((n) => !n.read_at).length;

  return el('div', { class: 'grid' }, [
    el('div', { class: 'card', style: 'padding:1rem' }, [
      el('h2', { text: 'Background alerts' }),
      el('p', { class: 'muted', text: status.hint }),
      el('div', { class: 'btn-row' }, [
        status.canInstall
          ? el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: async () => {
              await promptInstall();
              refresh();
            },
          }, [icon(installIconName(), { size: 16 }), installLabel()])
          : null,
        status.canEnable
          ? el('button', {
            class: status.canInstall ? 'btn' : 'btn btn-primary',
            type: 'button',
            onClick: async () => {
              await enablePushNotifications();
              refresh();
            },
          }, ['Enable background alerts'])
          : null,
        unread
          ? el('button', {
            class: 'btn',
            type: 'button',
            onClick: async () => {
              try {
                await api('notifications', 'mark-all-read', { body: {} });
                toast('Alerts marked as read');
                refresh();
              } catch (err) {
                toast(err.message, 'err');
              }
            },
          }, ['Mark all read'])
          : null,
      ]),
    ]),
    table(
      ['When', 'Title', 'Message'],
      (data.notifications || []).map((n) => [formatTime(n.created_at), n.title, n.body]),
    ),
  ]);
}
