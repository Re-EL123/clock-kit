import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
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
      },
    },
  },
});
