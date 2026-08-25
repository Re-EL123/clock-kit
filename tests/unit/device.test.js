import { describe, expect, it } from 'vitest';
import { alertsEnabledHint, detectDevice, installGuide, shouldAskNotificationPermission } from '../../src/js/device.js';

describe('detectDevice', () => {
  it('detects iPhone Safari', () => {
    const d = detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    expect(d.os).toBe('ios');
    expect(d.browser).toBe('safari');
    expect(d.ios).toBe(true);
  });

  it('detects iPhone Chrome, Firefox, and iPadOS desktop UA', () => {
    expect(detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    }).browser).toBe('chrome-ios');
    expect(detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1',
    }).browser).toBe('firefox-ios');
    expect(detectDevice({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 }).os).toBe('ios');
  });

  it('detects Android Chrome, Firefox, Edge, and Opera', () => {
    expect(detectDevice({ ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' })).toMatchObject({ os: 'android', browser: 'chrome' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0' })).toMatchObject({ os: 'android', browser: 'firefox' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.2210.141' }).browser).toBe('edge');
    expect(detectDevice({ ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 OPR/76.2.4027.73374' }).browser).toBe('opera');
  });

  it('detects Opera Mini, Huawei Browser, Windows Edge, and Linux Firefox', () => {
    expect(detectDevice({ ua: 'Opera/9.80 (Android; Opera Mini/7.6.35766/35.5706; U; en) Presto/2.8.119 Version/11.10' })).toMatchObject({ browser: 'opera-mini', operaMini: true });
    expect(detectDevice({ ua: 'Mozilla/5.0 (Linux; Android 10; LIO-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Mobile Safari/537.36 HuaweiBrowser/13.0.3.302' })).toMatchObject({ os: 'huawei', browser: 'huawei' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' })).toMatchObject({ os: 'windows', browser: 'edge' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0' })).toMatchObject({ os: 'linux', browser: 'firefox' });
  });

  it('detects Chromebook, HarmonyOS, Samsung Internet, and iOS Opera Mini', () => {
    expect(detectDevice({ ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' })).toMatchObject({ os: 'chromeos', browser: 'chrome' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (Phone; OpenHarmony 4.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 HuaweiBrowser/13.0.0.0' })).toMatchObject({ os: 'harmony', browser: 'huawei' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36' })).toMatchObject({ os: 'android', browser: 'samsung' });
    expect(detectDevice({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 OPX/2.1.0' })).toMatchObject({ os: 'ios', browser: 'opera-mini' });
  });
});

describe('installGuide', () => {
  it('tells Opera Mini to switch browsers', () => {
    const guide = installGuide(detectDevice({ ua: 'Opera/9.80 (Android; Opera Mini/64.0.2254/191.304; U; en) Presto/2.12.423 Version/12.16' }));
    expect(guide.title).toMatch(/another browser/i);
    expect(guide.steps.join(' ')).toMatch(/Chrome/);
  });

  it('uses Safari Home Screen steps on iOS and Edge install on Windows', () => {
    const ios = installGuide(detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    }));
    expect(ios.label).toBe('Add to Home Screen');
    expect(ios.steps[0]).toMatch(/Share/);
    const chromeIos = installGuide(detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    }));
    expect(chromeIos.note).toMatch(/Safari/);
    const win = installGuide(detectDevice({
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    }), { hasNativePrompt: true });
    expect(win.label).toBe('Install app');
    expect(win.detected).toBe('Windows · Edge');
  });

  it('matches Android Firefox, Huawei, and Linux Firefox menus', () => {
    const androidFf = installGuide(detectDevice({
      ua: 'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
    }));
    expect(androidFf.detected).toBe('Android · Firefox');
    expect(androidFf.steps[0]).toMatch(/Firefox/);
    const huawei = installGuide(detectDevice({
      ua: 'Mozilla/5.0 (Linux; Android 10; LIO-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Mobile Safari/537.36 HuaweiBrowser/13.0.3.302',
    }));
    expect(huawei.detected).toBe('Huawei · Huawei Browser');
    expect(huawei.steps.join(' ')).toMatch(/Huawei Browser|home screen/i);
    const linux = installGuide(detectDevice({
      ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    }));
    expect(linux.detected).toBe('Linux · Firefox');
    expect(linux.steps.join(' ')).toMatch(/Install site as an app|Chrome or Edge/);
  });
});

describe('alertsEnabledHint', () => {
  it('names the OS, device type, and browser', () => {
    expect(alertsEnabledHint(detectDevice({
      ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    }))).toBe('Background alerts are on for this Linux computer in Firefox. You will get them even when Clock-Kit is closed.');
    expect(alertsEnabledHint(detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    }))).toMatch(/this iPhone in Safari/);
    expect(alertsEnabledHint(detectDevice({
      ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    }))).toMatch(/this iPad in Safari/);
    expect(alertsEnabledHint(detectDevice({
      ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    }))).toMatch(/this Android phone in Chrome/);
    expect(alertsEnabledHint(detectDevice({
      ua: 'Mozilla/5.0 (Linux; Android 12; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }))).toMatch(/this Android tablet in Chrome/);
    expect(alertsEnabledHint(detectDevice({
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    }))).toMatch(/this Windows computer in Edge/);
  });
});

describe('shouldAskNotificationPermission', () => {
  it('asks on Android Chrome and Windows Edge, not on iOS Safari or Opera Mini', () => {
    const androidChrome = detectDevice({
      ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const windowsEdge = detectDevice({
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    });
    const iosSafari = detectDevice({
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const operaMini = detectDevice({
      ua: 'Opera/9.80 (Android; Opera Mini/64.0.2254/191.304; U; en) Presto/2.12.423 Version/12.16',
    });
    expect(shouldAskNotificationPermission(androidChrome, { permission: 'default' })).toBe(true);
    expect(shouldAskNotificationPermission(windowsEdge, { permission: 'default' })).toBe(true);
    expect(shouldAskNotificationPermission(iosSafari, { standalone: false, permission: 'default' })).toBe(false);
    expect(shouldAskNotificationPermission(iosSafari, { standalone: true, permission: 'default' })).toBe(true);
    expect(shouldAskNotificationPermission(operaMini, { permission: 'default' })).toBe(false);
    expect(shouldAskNotificationPermission(androidChrome, { permission: 'granted' })).toBe(false);
  });
});
