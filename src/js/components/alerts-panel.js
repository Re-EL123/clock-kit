import { api } from '../api.js';
import { formatTime } from '../utils/dom.js';
import { table } from './sidebar.js';

export async function AlertsPanel() {
  const data = await api('notifications', 'list', { body: {} });
  return table(
    ['When', 'Title', 'Message'],
    (data.notifications || []).map((n) => [formatTime(n.created_at), n.title, n.body]),
  );
}
