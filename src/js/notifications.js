import { api } from './api.js';

export async function unreadNotifications() {
  return api('notifications', 'list', { body: { unread: true } });
}
