import { describe, expect, it } from 'vitest';
import {
  INSTALLED_KEY,
  clearInstalledMemory,
  displayModeInstalled,
  isAppInstalled,
  markInstalled,
  relatedAppsInstalled,
  rememberedInstalled,
} from '../../src/js/pwa-display.js';

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
  };
}

describe('displayModeInstalled', () => {
  it('treats iOS navigator.standalone as installed', () => {
    expect(displayModeInstalled(() => false, { standalone: true })).toBe(true);
  });

  it('treats standalone, fullscreen, and minimal-ui as installed', () => {
    expect(displayModeInstalled((q) => q === '(display-mode: standalone)')).toBe(true);
    expect(displayModeInstalled((q) => q === '(display-mode: fullscreen)')).toBe(true);
    expect(displayModeInstalled((q) => q === '(display-mode: minimal-ui)')).toBe(true);
    expect(displayModeInstalled((q) => q === '(display-mode: window-controls-overlay)')).toBe(true);
  });

  it('does not treat browser display-mode as installed', () => {
    expect(displayModeInstalled((q) => q === '(display-mode: browser)', { standalone: false })).toBe(false);
  });
});

describe('remembered install', () => {
  it('persists and clears the installed flag', () => {
    const storage = memoryStorage();
    expect(rememberedInstalled(storage)).toBe(false);
    markInstalled(storage);
    expect(storage.getItem(INSTALLED_KEY)).toBe('1');
    expect(rememberedInstalled(storage)).toBe(true);
    clearInstalledMemory(storage);
    expect(rememberedInstalled(storage)).toBe(false);
  });

  it('hides the install prompt after appinstalled even in browser display-mode', () => {
    const storage = memoryStorage({ [INSTALLED_KEY]: '1' });
    expect(isAppInstalled({
      match: (q) => q === '(display-mode: browser)',
      nav: { standalone: false },
      storage,
    })).toBe(true);
  });
});

describe('relatedAppsInstalled', () => {
  it('returns true when the browser reports this web app is installed', async () => {
    expect(await relatedAppsInstalled(async () => [{ id: 'clock-kit', platform: 'webapp' }])).toBe(true);
    expect(await relatedAppsInstalled(async () => [])).toBe(false);
    expect(await relatedAppsInstalled(null)).toBe(false);
  });
});
