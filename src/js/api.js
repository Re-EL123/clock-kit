import { config, TOKEN_KEY, REFRESH_KEY, USER_KEY, withBase } from './config.js';
import { beginRequest, endRequest } from './busy.js';

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

  beginRequest();
  try {
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
      if (
      !location.pathname.includes('/login.html')
      && !location.pathname.includes('/kiosk')
      && !location.pathname.includes('terms.html')
      && !location.pathname.includes('privacy.html')
      && !location.pathname.includes('faq.html')
      && !location.pathname.includes('support.html')
      && !location.pathname.includes('feedback.html')
    ) {
        location.href = withBase('login.html');
      }
    }
    if (!json.ok) {
      const detail = json.error?.details?.[0];
      const path = Array.isArray(detail?.path) ? detail.path.filter(Boolean).join('.') : '';
      const err = new Error(
        path && detail?.message
          ? `${path}: ${detail.message}`
          : json.error?.message || 'Request failed',
      );
      err.code = json.error?.code;
      err.status = res.status;
      throw err;
    }
    return json.data;
  } finally {
    endRequest();
  }
}

export function saveSession(session, user) {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function persistUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}
