/**
 * Clock-Kit outreach.
 *
 * Preview (no mail sent):
 *   node send.js
 *
 * Send for real (needs scripts/outreach/.env):
 *   cp .env.example .env
 *   npm install
 *   node send.js --send
 *
 * Gmail: create an App Password, not your normal password.
 * Pause 3s between sends so providers do not treat this as a blast.
 */
import { createRequire } from 'node:module';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const send = process.argv.includes('--send');
const delayMs = 3000;

function loadEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function fill(template, row) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => row[key] ?? '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const template = `Subject: Attendance for people you place at host sites — Clock-Kit

Hello {{name}},

{{why}} Clock-Kit is built for that: candidates clock in at the host, you see attendance, leave, and timesheets in one place. Hosts and learners do not pay; the organisation does.

I work nearby ({{area}}) and can show a 15-minute walkthrough. If this is not relevant, reply stop and I will not write again.

Akani
Clock-Kit
https://re-el123.github.io/clock-kit/login.html
`;

loadEnv();
const contacts = JSON.parse(readFileSync(join(root, 'contacts.json'), 'utf8'));
const unique = [];
const seen = new Set();
for (const row of contacts) {
  const email = String(row.email || '').trim().toLowerCase();
  if (!email || seen.has(email)) continue;
  seen.add(email);
  unique.push({ ...row, email });
}

console.log(`${unique.length} unique addresses. Mode: ${send ? 'SEND' : 'preview only'}.\n`);

if (send) {
  const missing = ['OUTREACH_FROM', 'OUTREACH_SMTP_HOST', 'OUTREACH_SMTP_USER', 'OUTREACH_SMTP_PASS']
    .filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

let transporter;
if (send) {
  const require = createRequire(import.meta.url);
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    console.error('Run npm install inside scripts/outreach first.');
    process.exit(1);
  }
  transporter = nodemailer.createTransport({
    host: process.env.OUTREACH_SMTP_HOST,
    port: Number(process.env.OUTREACH_SMTP_PORT || 587),
    secure: Number(process.env.OUTREACH_SMTP_PORT) === 465,
    auth: {
      user: process.env.OUTREACH_SMTP_USER,
      pass: process.env.OUTREACH_SMTP_PASS,
    },
  });
}

const logPath = join(root, 'sent.jsonl');

for (const [index, row] of unique.entries()) {
  const raw = fill(template, row).trim();
  const [subjectLine, ...bodyLines] = raw.split('\n');
  const subject = subjectLine.replace(/^Subject:\s*/i, '');
  const text = bodyLines.join('\n').replace(/^\n/, '');
  console.log(`--- ${index + 1}/${unique.length} ${row.name} <${row.email}>`);
  console.log(`Subject: ${subject}\n${text}\n`);

  if (!send) continue;

  try {
    const info = await transporter.sendMail({
      from: process.env.OUTREACH_FROM,
      to: row.email,
      replyTo: process.env.OUTREACH_REPLY_TO || process.env.OUTREACH_FROM,
      subject,
      text,
    });
    const record = {
      at: new Date().toISOString(),
      email: row.email,
      name: row.name,
      id: info.messageId,
      ok: true,
    };
    appendFileSync(logPath, `${JSON.stringify(record)}\n`);
    console.log(`Sent (${info.messageId})\n`);
  } catch (err) {
    const record = {
      at: new Date().toISOString(),
      email: row.email,
      name: row.name,
      ok: false,
      error: err.message,
    };
    appendFileSync(logPath, `${JSON.stringify(record)}\n`);
    console.error(`Failed: ${err.message}\n`);
  }

  if (index < unique.length - 1) await sleep(delayMs);
}

if (!send) {
  console.log('Nothing was sent. To send: copy .env.example to .env, npm install, then node send.js --send');
}
