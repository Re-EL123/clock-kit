import { describe, expect, it } from 'vitest';
import { appPath, buildWebManifest } from '../../src/js/pwa-manifest.js';

describe('buildWebManifest', () => {
  it('launches a real 200 document under the GitHub Pages base', () => {
    const manifest = buildWebManifest('/clock-kit/');
    expect(manifest.id).toBe('/clock-kit/');
    expect(manifest.scope).toBe('/clock-kit/');
    expect(manifest.start_url).toBe('/clock-kit/index.html');
    expect(manifest.icons.every((icon) => icon.src.startsWith('/clock-kit/assets/logo/'))).toBe(true);
    expect(manifest.icons.some((icon) => icon.src.endsWith('.svg'))).toBe(false);
  });

  it('uses a full https start_url when the public app URL is known', () => {
    const manifest = buildWebManifest('/clock-kit/', 'https://re-el123.github.io/clock-kit');
    expect(manifest.start_url).toBe('https://re-el123.github.io/clock-kit/index.html');
    expect(manifest.scope).toBe('https://re-el123.github.io/clock-kit/');
    expect(manifest.icons[0].src).toBe('https://re-el123.github.io/clock-kit/assets/logo/clock-kit-icon-192.png');
  });

  it('uses root-absolute paths when the app is served from /', () => {
    const manifest = buildWebManifest('/');
    expect(manifest.start_url).toBe('/index.html');
    expect(manifest.scope).toBe('/');
    expect(appPath('/', 'login.html')).toBe('/login.html');
  });
});
