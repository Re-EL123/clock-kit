import { config, TOKEN_KEY, REFRESH_KEY, USER_KEY } from './config.js';

function headers(extra = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function api(fn, action, { method = 'POST', body, idempotent, idempotencyKey } = {}) {
  const url = `${config.apiUrl}/${fn}?action=${encodeURIComponent(action)}`;
  const extra = {};
  if (idempotent) extra['Idempotency-Key'] = idempotencyKey || crypto.randomUUID();

  const res = await fetch(url, {
    method,
    headers: headers(extra),
    body: method === 'GET' ? undefined : JSON.stringify({ action, ...(body || {}) }),
    signal: AbortSignal.timeout(20000),
  });

  const json = await res.json().catch(() => ({ ok: false, error: { message: 'Invalid response' } }));
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('/kiosk/')) {
      location.href = '/login.html';
    }
  }
  if (!json.ok) {
    const err = new Error(json.error?.message || 'Request failed');
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export function saveSession(session, user) {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}
