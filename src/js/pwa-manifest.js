export function appBase(base = '/') {
  const value = String(base || '/');
  return value.endsWith('/') ? value : `${value}/`;
}

export function appPath(base, path = '') {
  return `${appBase(base)}${String(path).replace(/^\//, '')}`;
}

function originRoot(appUrl) {
  return String(appUrl || '').replace(/\/$/, '');
}

export function buildWebManifest(base = '/', appUrl = '') {
  const root = appBase(base);
  const site = originRoot(appUrl);
  const abs = (path) => (site ? `${site}/${String(path).replace(/^\//, '')}` : appPath(root, path));
  const icon = (file, sizes, purpose = 'any') => ({
    src: abs(`assets/logo/${file}`),
    sizes,
    type: 'image/png',
    purpose,
  });
  return {
    id: root,
    name: 'Clock-Kit',
    short_name: 'Clock-Kit',
    lang: 'en',
    description: 'Clock in. Work on. Succeed together.',
    display: 'standalone',
    start_url: abs('index.html'),
    scope: site ? `${site}/` : root,
    prefer_related_applications: false,
    background_color: '#E2DDD8',
    theme_color: '#21396A',
    categories: ['business', 'productivity'],
    icons: [
      icon('clock-kit-icon-192.png', '192x192'),
      icon('clock-kit-icon-512.png', '512x512'),
      icon('clock-kit-icon-512.png', '512x512', 'maskable'),
      icon('clock-kit-icon-180.png', '180x180'),
    ],
  };
}
