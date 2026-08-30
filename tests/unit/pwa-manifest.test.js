import { describe, expect, it } from 'vitest';
import { appPath, buildWebManifest, isLaunchPath } from '../../src/js/pwa-manifest.js';

describe('buildWebManifest', () => {
  it('uses origin-absolute start_url and scope under the GitHub Pages base', () => {
    const manifest = buildWebManifest('/clock-kit/');
    expect(manifest.id).toBe('/clock-kit/');
    expect(manifest.scope).toBe('/clock-kit/');
    expect(manifest.start_url).toBe('/clock-kit/login.html');
    expect(manifest.icons.every((icon) => icon.src.startsWith('/clock-kit/assets/logo/'))).toBe(true);
    expect(manifest.icons.some((icon) => icon.src.endsWith('.svg'))).toBe(false);
  });

  it('uses root-absolute paths when the app is served from /', () => {
    const manifest = buildWebManifest('/');
    expect(manifest.start_url).toBe('/login.html');
    expect(manifest.scope).toBe('/');
    expect(appPath('/', 'login.html')).toBe('/login.html');
  });
});

describe('isLaunchPath', () => {
  it('treats the GitHub Pages directory and index as the launcher', () => {
    expect(isLaunchPath('/clock-kit/', '/clock-kit/')).toBe(true);
    expect(isLaunchPath('/clock-kit', '/clock-kit/')).toBe(true);
    expect(isLaunchPath('/clock-kit/index.html', '/clock-kit/')).toBe(true);
    expect(isLaunchPath('/clock-kit/login.html', '/clock-kit/')).toBe(false);
    expect(isLaunchPath('/login.html', '/clock-kit/')).toBe(false);
  });
});
