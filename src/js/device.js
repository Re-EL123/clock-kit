const BROWSER_LABELS = {
  chrome: 'Chrome',
  'chrome-ios': 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  'firefox-ios': 'Firefox',
  safari: 'Safari',
  opera: 'Opera',
  'opera-mini': 'Opera Mini',
  samsung: 'Samsung Internet',
  huawei: 'Huawei Browser',
  other: 'this browser',
};

const OS_LABELS = {
  ios: 'iPhone or iPad',
  android: 'Android',
  huawei: 'Huawei',
  harmony: 'HarmonyOS',
  windows: 'Windows',
  macos: 'Mac',
  linux: 'Linux',
  chromeos: 'Chromebook',
  other: 'this device',
};

function brandsText(userAgentData) {
  return (userAgentData?.brands || userAgentData?.uaFullVersionList || [])
    .map((item) => item.brand || '')
    .join(' ');
}

export function detectDevice({
  ua,
  platform,
  maxTouchPoints,
  userAgentData,
} = {}) {
  const agent = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const plat = platform ?? (typeof navigator !== 'undefined' ? navigator.platform : '');
  const touch = maxTouchPoints ?? (typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0);
  const uaData = userAgentData ?? (typeof navigator !== 'undefined' ? navigator.userAgentData : null);
  const brands = brandsText(uaData);
  const uaPlatform = String(uaData?.platform || '');

  const ipadOs = plat === 'MacIntel' && Number(touch) > 1;
  const ios = /iPhone|iPad|iPod/i.test(agent) || ipadOs || /iOS/i.test(uaPlatform);
  const android = /Android/i.test(agent) || /Android/i.test(uaPlatform);
  const huaweiHint = /HUAWEI|Huawei|HONOR|HarmonyOS|HuaweiBrowser|OpenHarmony/i.test(agent);
  const windows = /Windows NT|Win64|Windows/i.test(agent) || /Windows/i.test(uaPlatform);
  const chromeos = /CrOS/i.test(agent) || /Chrome OS/i.test(uaPlatform);
  const mac = (/Macintosh|Mac OS X/i.test(agent) || /macOS/i.test(uaPlatform)) && !ios && !ipadOs;
  const linux = (/Linux/i.test(agent) || /Linux/i.test(uaPlatform)) && !android && !chromeos && !huaweiHint;

  let os = 'other';
  if (ios) os = 'ios';
  else if (/HarmonyOS|OpenHarmony/i.test(agent) && !android) os = 'harmony';
  else if (android && huaweiHint) os = 'huawei';
  else if (android) os = 'android';
  else if (windows) os = 'windows';
  else if (mac) os = 'macos';
  else if (chromeos) os = 'chromeos';
  else if (linux) os = 'linux';

  let browser = 'other';
  if (/Opera Mini/i.test(agent) || /OPX\//i.test(agent) || /OperaMini/i.test(brands)) browser = 'opera-mini';
  else if (/EdgiOS/i.test(agent)) browser = 'edge';
  else if (/FxiOS/i.test(agent)) browser = 'firefox-ios';
  else if (/CriOS/i.test(agent)) browser = 'chrome-ios';
  else if (/OPiOS/i.test(agent) || /OPT\//i.test(agent)) browser = 'opera';
  else if (/EdgA\/|Edg\//i.test(agent) || /Microsoft Edge/i.test(brands)) browser = 'edge';
  else if (/OPR\//i.test(agent) || /Opera/i.test(brands)) browser = 'opera';
  else if (/SamsungBrowser/i.test(agent) || /Samsung Internet/i.test(brands)) browser = 'samsung';
  else if (/HuaweiBrowser/i.test(agent) || /Huawei Browser/i.test(brands)) browser = 'huawei';
  else if (/Firefox\//i.test(agent) && !/Seamonkey/i.test(agent)) browser = 'firefox';
  else if (/Chrome\//i.test(agent) || /Chromium/i.test(agent) || /Google Chrome/i.test(brands)) browser = 'chrome';
  else if (/Safari/i.test(agent) && !/Chrome|Chromium|Android/i.test(agent)) browser = 'safari';

  const mobile = os === 'ios' || os === 'android' || os === 'huawei' || os === 'harmony';
  const operaMini = browser === 'opera-mini';
  const chromium = ['chrome', 'edge', 'opera', 'samsung', 'huawei'].includes(browser);
  const ipad = /iPad/i.test(agent) || ipadOs;
  const kind = formFactor({ os, agent, ipad, android });
  const osLabel = OS_LABELS[os] || OS_LABELS.other;
  const browserLabel = BROWSER_LABELS[browser] || BROWSER_LABELS.other;
  const hardwareLabel = hardwareName({ os, kind });

  return {
    os,
    browser,
    kind,
    osLabel,
    browserLabel,
    hardwareLabel,
    ios,
    android: os === 'android' || os === 'huawei',
    mobile,
    desktop: !mobile,
    operaMini,
    chromium,
    get deviceLabel() {
      return `${this.osLabel} · ${this.browserLabel}`;
    },
  };
}

function formFactor({ os, agent, ipad, android }) {
  if (os === 'ios') return ipad ? 'tablet' : 'phone';
  if (os === 'android' || os === 'huawei' || os === 'harmony') {
    if (/Tablet|\bPad\b/i.test(agent) || (android && !/Mobile/i.test(agent))) return 'tablet';
    return 'phone';
  }
  return 'computer';
}

function hardwareName({ os, kind }) {
  if (os === 'ios') return kind === 'tablet' ? 'iPad' : 'iPhone';
  if (os === 'android') return kind === 'tablet' ? 'Android tablet' : 'Android phone';
  if (os === 'huawei') return kind === 'tablet' ? 'Huawei tablet' : 'Huawei phone';
  if (os === 'harmony') return kind === 'tablet' ? 'HarmonyOS tablet' : 'HarmonyOS phone';
  if (os === 'windows') return 'Windows computer';
  if (os === 'macos') return 'Mac';
  if (os === 'linux') return 'Linux computer';
  if (os === 'chromeos') return 'Chromebook';
  return 'device';
}

export function alertsEnabledHint(device) {
  const env = device || detectDevice();
  return `Background alerts are on for this ${env.hardwareLabel} in ${env.browserLabel}. You will get them even when Clock-Kit is closed.`;
}

function lastAlertStep() {
  return 'Open Clock-Kit from the icon, then go to Alerts and tap Enable background alerts.';
}

function allowNotificationsStep() {
  return 'Tap Allow when the browser asks Clock-Kit to send notifications.';
}

export function shouldAskNotificationPermission(device, { standalone = false, permission = 'default' } = {}) {
  if (!device || device.operaMini) return false;
  if (device.ios && !standalone) return false;
  return permission === 'default';
}

export function installGuide(device, { hasNativePrompt = false } = {}) {
  const env = device || detectDevice();
  const { os, browser, osLabel, browserLabel, operaMini, mobile } = env;
  const detected = `${osLabel} · ${browserLabel}`;

  if (operaMini) {
    const onIos = os === 'ios';
    return {
      title: 'Open in another browser',
      label: 'How to install',
      icon: 'smartphone',
      detected,
      summary: 'Opera Mini cannot install Clock-Kit or keep background alerts.',
      steps: onIos
        ? [
          'Copy this page’s address.',
          'Open it in Safari — not Opera Mini, Chrome, Firefox, or Edge.',
          'In Safari, tap Share → Add to Home Screen → Add.',
        ]
        : [
          'Copy this page’s address.',
          'Open it in Chrome, Edge, Firefox, Samsung Internet, Huawei Browser, or the full Opera browser.',
          'Use Install app or Add to Home Screen in that browser.',
        ],
      note: onIos
        ? 'On iPhone and iPad, only Safari’s Home Screen app can receive Clock-Kit background alerts.'
        : 'Opera Mini uses a compressed proxy and does not support installing web apps.',
      canNativePrompt: false,
    };
  }

  if (os === 'ios') {
    const safari = browser === 'safari';
    return {
      title: 'Add to Home Screen',
      label: 'Add to Home Screen',
      icon: 'share',
      detected,
      summary: safari
        ? 'On iPhone and iPad, Safari can add Clock-Kit to the Home Screen so alerts work when the app is closed.'
        : `Install from Safari for background alerts. ${browserLabel} on iOS cannot reliably deliver them.`,
      steps: safari
        ? [
          'Tap Share (the square with the arrow up).',
          'Scroll and tap Add to Home Screen, then Add.',
          lastAlertStep(),
        ]
        : [
          'Tap the Share / more menu and copy the link, or open it in Safari.',
          'In Safari, tap Share → Add to Home Screen → Add.',
          lastAlertStep(),
        ],
      note: safari ? '' : 'Use Safari, then open Clock-Kit from the Home Screen icon — not from Chrome, Firefox, Edge, or Opera.',
      canNativePrompt: false,
    };
  }

  if (os === 'huawei' || os === 'harmony' || browser === 'huawei') {
    return {
      title: 'Add to Home Screen',
      label: 'Add to Home Screen',
      icon: 'smartphone',
      detected,
      summary: 'On Huawei and HarmonyOS, add Clock-Kit from the browser menu.',
      steps: hasNativePrompt
        ? ['Confirm Install in the browser popup.', allowNotificationsStep()]
        : [
          'Tap the menu (⋮) in Huawei Browser, Chrome, or Firefox.',
          'Choose Add to home screen, Add to phone, or Install app.',
          allowNotificationsStep(),
        ],
      note: 'If you do not see install, open this page in Huawei Browser, Chrome, or Firefox — not Opera Mini.',
      canNativePrompt: hasNativePrompt,
    };
  }

  if (os === 'android') {
    const menuByBrowser = {
      chrome: 'Tap Chrome’s menu (⋮), then Install app or Add to Home screen.',
      edge: 'Tap Edge’s menu (⋯), then Add to phone or Install.',
      firefox: 'Tap Firefox’s menu (⋮), then Install or Add to Home screen.',
      opera: 'Tap Opera’s menu, then Home screen → Add to home.',
      samsung: 'Tap Samsung Internet’s menu, then Add page to → Home screen.',
      other: 'Open the browser menu and choose Install app or Add to Home screen.',
    };
    return {
      title: 'Add to Home Screen',
      label: hasNativePrompt ? 'Install app' : 'Add to Home Screen',
      icon: 'smartphone',
      detected,
      summary: `On Android with ${browserLabel}, install Clock-Kit so it stays on your Home Screen.`,
      steps: hasNativePrompt
        ? ['Confirm Install in the browser popup.', allowNotificationsStep()]
        : [menuByBrowser[browser] || menuByBrowser.other, allowNotificationsStep()],
      note: '',
      canNativePrompt: hasNativePrompt,
    };
  }

  if (os === 'macos' && browser === 'safari') {
    return {
      title: 'Add to Dock',
      label: 'Add to Dock',
      icon: 'share',
      detected,
      summary: 'On Mac with Safari, add Clock-Kit to the Dock as an app.',
      steps: [
        'In Safari, open File → Add to Dock (or Share → Add to Dock).',
        'Open Clock-Kit from the Dock and tap Allow when it asks to send notifications.',
      ],
      note: 'macOS Sonoma or later is required for Add to Dock.',
      canNativePrompt: false,
    };
  }

  if (browser === 'firefox' && (os === 'windows' || os === 'linux' || os === 'macos')) {
    return {
      title: 'Install Clock-Kit',
      label: 'How to install',
      icon: 'plus',
      detected,
      summary: `On ${osLabel} with Firefox, install from the menu if you see it.`,
      steps: [
        'Open the Firefox menu (☰).',
        'Choose Install site as an app if it appears.',
        'If it does not, open this page in Chrome or Edge and use Install Clock-Kit there for a full app window.',
        allowNotificationsStep(),
      ],
      note: 'Chrome and Edge install most reliably on computers.',
      canNativePrompt: hasNativePrompt,
    };
  }

  const chromiumDesktop = ['windows', 'linux', 'macos', 'chromeos'].includes(os);
  if (chromiumDesktop) {
    const where = os === 'chromeos' ? 'the Chromebook shelf' : os === 'macos' ? 'the Dock or Applications' : 'the taskbar or Start menu';
    return {
      title: 'Install Clock-Kit',
      label: hasNativePrompt ? 'Install app' : 'Install Clock-Kit',
      icon: 'plus',
      detected,
      summary: `On ${osLabel} with ${browserLabel}, install Clock-Kit as an app.`,
      steps: hasNativePrompt
        ? [`Confirm Install in the browser popup. Clock-Kit will appear in ${where}.`, allowNotificationsStep()]
        : [
          `Look for the install icon in the ${browserLabel} address bar, or open the browser menu → Install Clock-Kit / Install app.`,
          `Open the installed app from ${where}.`,
          allowNotificationsStep(),
        ],
      note: '',
      canNativePrompt: hasNativePrompt,
    };
  }

  return {
    title: 'Install Clock-Kit',
    label: hasNativePrompt ? 'Install app' : 'Install Clock-Kit',
    icon: mobile ? 'smartphone' : 'plus',
    detected,
    summary: `Install Clock-Kit on ${detected} so alerts still arrive when the app is closed.`,
    steps: hasNativePrompt
      ? ['Confirm Install in the browser popup.', allowNotificationsStep()]
      : [
        'Open the browser menu and choose Install app or Add to Home Screen.',
        allowNotificationsStep(),
      ],
    note: '',
    canNativePrompt: hasNativePrompt,
  };
}
