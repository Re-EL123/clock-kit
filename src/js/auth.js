import { api, currentUser, saveSession } from './api.js';
import { TOKEN_KEY, USER_KEY } from './config.js';

const ROLE_HOME = {
  PLATFORM_ADMIN: '/admin/',
  ORG_OWNER: '/organisation/',
  ORG_ADMIN: '/organisation/',
  ORG_MANAGER: '/organisation/',
  ORG_VIEWER: '/organisation/',
  HOST: '/host/',
  CANDIDATE: '/candidate/',
};

export const Auth = {
  user: currentUser,

  home(role) {
    return ROLE_HOME[role] || '/login.html';
  },

  async login(email, password) {
    const data = await api('auth', 'login', { body: { email, password } });
    saveSession(data.session, data.user);
    return data.user;
  },

  async logout() {
    try {
      await api('auth', 'logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    location.href = '/login.html';
  },

  requireRole(...roles) {
    const user = currentUser();
    if (!user || !localStorage.getItem(TOKEN_KEY)) {
      location.href = '/login.html';
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
