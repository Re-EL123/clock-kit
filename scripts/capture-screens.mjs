#!/usr/bin/env node
// Captures real screenshots of the deployed Clock-Kit web app.
// Run from the repo root so the bare '@playwright/test' specifier resolves:
//   node scripts/capture-screens.mjs
import { chromium } from '@playwright/test';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// Playwright 1.54.2 has no Ubuntu 26.04 build, so `npx playwright install` fails.
// Fall back to any chromium/chrome build already in the ms-playwright cache.
async function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return undefined;
  const dirs = (await readdir(cache)).filter((d) => d.startsWith('chromium')).sort().reverse();
  const rels = [
    ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
    ['chrome-linux', 'chrome'],
  ];
  for (const d of dirs) {
    for (const [sub, bin] of rels) {
      const p = join(cache, d, sub, bin);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const ORIGIN = 'https://www.clock-kit.rf.gd';
const API = 'https://clock-kit-backend.vercel.app/api';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'screens');

const ACCOUNTS = [
  {
    key: 'candidate',
    email: 'thabo@abcstaffing.local',
    password: 'ClockKitCand!23',
    page: '/candidate/',
    views: [
      ['home', 'candidate-home.png'],
      ['attendance', 'candidate-attendance.png'],
      ['leave', 'candidate-leave.png'],
      ['schedule', 'candidate-schedule.png'],
    ],
  },
  {
    key: 'organisation',
    email: 'owner@abcstaffing.local',
    password: 'ClockKitOwner!23',
    page: '/organisation/',
    views: [['home', 'organisation-dashboard.png']],
  },
  {
    key: 'host',
    email: 'host@acmelogistics.local',
    password: 'ClockKitHost!23',
    page: '/host/',
    views: [['home', 'host-dashboard.png']],
  },
  {
    key: 'admin',
    email: 'admin@clock-kit.local',
    password: 'ClockKitAdmin!23',
    page: '/admin/',
    views: [
      ['home', 'admin-dashboard.png'],
      ['organisations', 'admin-organisations.png'],
    ],
  },
];

const mask = (t) => (t ? `${String(t).slice(0, 8)}…(len ${String(t).length})` : 'none');

async function signin(email, password) {
  const res = await fetch(`${API}/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const msg = body?.error?.message ?? res.statusText;
    const err = new Error(`${code}: ${msg}`);
    err.code = code;
    throw err;
  }
  const session = body?.data?.session ?? {};
  return {
    access: session.accessToken,
    refresh: session.refreshToken,
    user: body?.data?.user ?? { email, role: null },
  };
}

// Only ever dismiss the known onboarding / PWA-install overlays.
// Never click a generic .modal-backdrop: those wrap destructive confirm
// dialogs ("Delete"), and clicking their last button fires real actions.
const MODAL_SELECTORS = ['.ck-reminder-modal', '.ck-install-modal'];
const SAFE_LABEL =
  /^(not now|skip|close|got it|continue|dismiss|later|no thanks|maybe later|×|✕)$|data-close/i;

async function dismissModals(page, log) {
  for (const sel of MODAL_SELECTORS) {
    if (!(await page.locator(sel).count())) continue;
    const closed = await page
      .locator(`${sel} button, ${sel} [data-close]`)
      .filter({ hasText: SAFE_LABEL })
      .first()
      .click({ timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (closed) {
      log(`  dismissed modal ${sel}`);
    } else {
      // No safe button: hide the overlay without clicking any control.
      await page
        .evaluate((s) => document.querySelectorAll(s).forEach((el) => el.remove()), sel)
        .catch(() => {});
      log(`  hid modal ${sel} (no safe dismiss button)`);
    }
  }
}

async function waitForContent(page, log) {
  try {
    await page.waitForFunction(
      () => {
        const b = document.body;
        return b && b.innerText && b.innerText.trim().length > 80 && b.querySelectorAll('*').length > 60;
      },
      { timeout: 20000 },
    );
  } catch {
    log('  WARN: content did not settle within 20s');
  }
  await page.waitForTimeout(2500);
}

async function loadApp(page, account, tokens, log) {
  // Seed auth via an init script so it is in place *before* any app script runs.
  // Seeding after a first goto leaves the app to boot unauthenticated, which
  // surfaces as spurious AUTH_REQUIRED / FORBIDDEN errors.
  await page.addInitScript(
    ({ a, r, u }) => {
      try {
        localStorage.setItem('ck_access_token', a);
        localStorage.setItem('ck_refresh_token', r);
        localStorage.setItem('ck_user', u || '{}');
      } catch {
        /* storage unavailable */
      }
    },
    { a: tokens.access, r: tokens.refresh, u: JSON.stringify(tokens.user) },
  );
  await page.goto(`${ORIGIN}${account.page}`, { waitUntil: 'networkidle' });
  await waitForContent(page, log);
  log(`  url=${page.url()} title="${await page.title()}"`);
}

async function shoot(page, path, log) {
  const full = join(OUT_DIR, path);
  await page.screenshot({ path: full });
  log(`  saved ${path}`);
  return full;
}

async function captureRole(page, account, tokens, log) {
  await loadApp(page, account, tokens, log);

  const onLogin = /login\.html/i.test(page.url());
  if (onLogin) {
    log('  BOUNCED to login.html — token auth did not stick');
    await shoot(page, `${account.key}-login-bounce.png`, log);
    return { ok: false, reason: 'redirected to login' };
  }

  await dismissModals(page, log);

  const written = [];
  for (const [view, file] of account.views) {
    if (view !== 'home') {
      // Views are query-param routed: /admin/?view=organisations
      await page.goto(`${ORIGIN}${account.page}?view=${view}`, { waitUntil: 'networkidle' });
      await waitForContent(page, log);
      const h1 = await page.locator('.topbar h1').first().textContent().catch(() => null);
      log(`  view=${view} heading="${(h1 || '').trim()}"`);
    }
    await dismissModals(page, log);
    written.push(await shoot(page, file, log));
  }
  return { ok: true, written };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const executablePath = await resolveChromium();
  console.log(`chromium: ${executablePath ?? '(playwright default)'}`);
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const results = [];

  for (const account of ACCOUNTS) {
    const log = (m) => console.log(m);
    log(`\n=== ${account.key} <${account.email}>`);
    let tokens;
    try {
      tokens = await signin(account.email, account.password);
      log(`  login ok role=${tokens.user?.role} access=${mask(tokens.access)}`);
    } catch (e) {
      log(`  LOGIN FAILED ${e.code}`);
      results.push({ key: account.key, login: e.code, shots: [] });
      continue;
    }

    const page = await context.newPage();
    page.on('pageerror', (e) => log(`  pageerror: ${e.message.split('\n')[0]}`));
    try {
      const r = await captureRole(page, account, tokens, log);
      results.push({ key: account.key, login: 'ok', shots: r.written ?? [], reason: r.reason });
    } catch (e) {
      log(`  CAPTURE ERROR ${e.message.split('\n')[0]}`);
      results.push({ key: account.key, login: 'ok', shots: [], reason: e.message.split('\n')[0] });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n===== SUMMARY =====');
  for (const r of results) {
    console.log(`${r.key}: login=${r.login} shots=${r.shots.length}${r.reason ? ` reason=${r.reason}` : ''}`);
    r.shots.forEach((s) => console.log(`   - ${s}`));
  }
}

main().catch((e) => {
  console.error('fatal', e);
  process.exit(1);
});