import { api, currentUser, saveSession } from './api.js';
import { TOKEN_KEY, USER_KEY, withBase } from './config.js';
import { unsubscribePush } from './pwa.js';

const ROLE_HOME = {
  PLATFORM_ADMIN: withBase('admin/'),
  ORG_OWNER: withBase('organisation/'),
  ORG_ADMIN: withBase('organisation/'),
  ORG_MANAGER: withBase('organisation/'),
  ORG_VIEWER: withBase('organisation/'),
  HOST: withBase('host/'),
  CANDIDATE: withBase('candidate/'),
};

export const Auth = {
  user: currentUser,

  home(role) {
    return ROLE_HOME[role] || withBase('login.html');
  },

  async login(email, password) {
    const data = await api('auth', 'login', { body: { email, password } });
    saveSession(data.session, data.user);
    return data.user;
  },

  async logout() {
    try {
      await unsubscribePush();
    } catch {
      /* ignore */
    }
    try {
      await api('auth', 'logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    location.href = withBase('login.html');
  },

  requireRole(...roles) {
    const user = currentUser();
    if (!user || !localStorage.getItem(TOKEN_KEY)) {
      location.href = withBase('login.html');
      throw new Error('AUTH_REQUIRED');
    }
    if (roles.length && !roles.includes(user.role)) {
      location.href = this.home(user.role);
      throw new Error('FORBIDDEN');
    }
    return user;
  },

  requireGuest() {
    const user = currentUser();
    if (user && localStorage.getItem(TOKEN_KEY)) {
      location.href = this.home(user.role);
    }
  },
};
