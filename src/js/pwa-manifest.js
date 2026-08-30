export function appBase(base = '/') {
  const value = String(base || '/');
  return value.endsWith('/') ? value : `${value}/`;
}

export function appPath(base, path = '') {
  return `${appBase(base)}${String(path).replace(/^\//, '')}`;
}

export function buildWebManifest(base = '/') {
  const root = appBase(base);
  const icon = (file, sizes, purpose = 'any') => ({
    src: appPath(root, `assets/logo/${file}`),
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
    display_override: ['standalone', 'minimal-ui', 'browser'],
    start_url: appPath(root, 'login.html'),
    scope: root,
    handle_links: 'preferred',
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

export function isLaunchPath(pathname, base = '/') {
  const root = appBase(base);
  const trimmed = root.replace(/\/$/, '') || '/';
  return pathname === root || pathname === trimmed || pathname === `${root}index.html`;
}
