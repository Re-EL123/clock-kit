export const INSTALLED_KEY = 'ck_pwa_installed';

export const INSTALLED_DISPLAY_MODES = [
  'standalone',
  'fullscreen',
  'minimal-ui',
  'window-controls-overlay',
];

function defaultMatch(query) {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function defaultStorage() {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function displayModeInstalled(
  match = defaultMatch,
  nav = typeof navigator !== 'undefined' ? navigator : {},
) {
  if (nav?.standalone === true) return true;
  return INSTALLED_DISPLAY_MODES.some((mode) => {
    try {
      return Boolean(match(`(display-mode: ${mode})`));
    } catch {
      return false;
    }
  });
}

export function rememberedInstalled(storage = defaultStorage()) {
  try {
    return storage?.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markInstalled(storage = defaultStorage()) {
  try {
    storage?.setItem(INSTALLED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearInstalledMemory(storage = defaultStorage()) {
  try {
    storage?.removeItem(INSTALLED_KEY);
  } catch {
    /* ignore */
  }
}

export function isAppInstalled({
  match = defaultMatch,
  nav = typeof navigator !== 'undefined' ? navigator : {},
  storage = defaultStorage(),
} = {}) {
  return displayModeInstalled(match, nav) || rememberedInstalled(storage);
}

export async function relatedAppsInstalled(getApps) {
  const fn = getApps
    || (typeof navigator !== 'undefined' ? navigator.getInstalledRelatedApps?.bind(navigator) : null);
  if (typeof fn !== 'function') return false;
  try {
    const apps = await fn();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}
