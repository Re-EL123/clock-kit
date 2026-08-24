export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnon: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  base: import.meta.env.BASE_URL || '/',
};

export function withBase(path = '') {
  return `${config.base}${String(path).replace(/^\//, '')}`;
}

export const TOKEN_KEY = 'ck_access_token';
export const REFRESH_KEY = 'ck_refresh_token';
export const USER_KEY = 'ck_user';
