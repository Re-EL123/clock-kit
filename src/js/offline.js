const KEY = 'ck_offline_queue';

export function queueClock(action, body) {
  const items = JSON.parse(localStorage.getItem(KEY) || '[]');
  items.push({
    id: crypto.randomUUID(),
    action,
    body,
    idempotencyKey: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  });
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function pendingCount() {
  return JSON.parse(localStorage.getItem(KEY) || '[]').length;
}

export function listQueue() {
  return JSON.parse(localStorage.getItem(KEY) || '[]');
}

export function clearItem(id) {
  const items = listQueue().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export async function flushQueue(apiFn) {
  const items = listQueue();
  for (const item of items) {
    try {
      await apiFn('clock', item.action, {
        body: item.body,
        idempotent: true,
        idempotencyKey: item.idempotencyKey,
      });
      clearItem(item.id);
    } catch (err) {
      if (err.status >= 400 && err.status < 500 && err.status !== 429) {
        clearItem(item.id);
      } else {
        break;
      }
    }
  }
}
