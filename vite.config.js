import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pagesBase = process.env.GITHUB_PAGES === 'true'
  ? `/${(process.env.GITHUB_REPOSITORY || 'Re-EL123/clock-kit').split('/')[1]}/`
  : '/';

export default defineConfig({
  root,
  base: pagesBase,
  publicDir: 'public',
  server: { port: 5173 },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        login: resolve(root, 'login.html'),
        offline: resolve(root, 'offline.html'),
        admin: resolve(root, 'admin/index.html'),
        organisation: resolve(root, 'organisation/index.html'),
        host: resolve(root, 'host/index.html'),
        candidate: resolve(root, 'candidate/index.html'),
        kiosk: resolve(root, 'kiosk/index.html'),
        terms: resolve(root, 'terms.html'),
        privacy: resolve(root, 'privacy.html'),
      },
    },
  },
});
