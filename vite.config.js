import { defineConfig } from 'vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWebManifest } from './src/js/pwa-manifest.js';

const root = dirname(fileURLToPath(import.meta.url));
const pagesBase = process.env.GITHUB_PAGES === 'true'
  ? `/${(process.env.GITHUB_REPOSITORY || 'Re-EL123/clock-kit').split('/')[1]}/`
  : '/';

function collectLaunchUrls(dist) {
  const htmlPath = join(dist, 'login.html');
  if (!existsSync(htmlPath)) return [];
  const html = readFileSync(htmlPath, 'utf8');
  const found = new Set();
  const re = /\b(?:src|href)="([^"]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    const url = match[1];
    if (!url || url.startsWith('data:') || url.startsWith('http')) continue;
    if (/\.(js|css)$/.test(url)) found.add(url);
  }
  return [...found];
}

function clockKitManifestPlugin(base) {
  const body = () => `${JSON.stringify(buildWebManifest(base, process.env.VITE_APP_URL || ''), null, 2)}\n`;
  const manifestPath = `${base}manifest.webmanifest`.replace(/\/{2,}/g, '/');
  return {
    name: 'clock-kit-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== manifestPath && url !== '/manifest.webmanifest') {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.end(body());
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: body(),
      });
    },
    writeBundle() {
      const dist = resolve(root, 'dist');
      const swPath = join(dist, 'service-worker.js');
      if (!existsSync(swPath)) return;
      const extras = collectLaunchUrls(dist);
      const sw = readFileSync(swPath, 'utf8');
      writeFileSync(
        swPath,
        sw.replace('const PRECACHE = []; // __CK_PRECACHE__', `const PRECACHE = ${JSON.stringify(extras)};`),
      );
    },
  };
}

export default defineConfig({
  root,
  base: pagesBase,
  publicDir: 'public',
  plugins: [clockKitManifestPlugin(pagesBase)],
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
        faq: resolve(root, 'faq.html'),
        support: resolve(root, 'support.html'),
        feedback: resolve(root, 'feedback.html'),
      },
    },
  },
});
