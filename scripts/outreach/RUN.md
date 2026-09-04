# Run Clock-Kit outreach

This folder emails the Alberton, Sandton, and Randburg contacts. Nothing is sent until you use `--send`.

## 1. Preview (safe)

From this folder:

```bash
cd /home/akani/clock-kit/scripts/outreach
node send.js
```

You should see 17 unique addresses and the full message for each. No mail leaves your machine.

## 2. Fill in your mailbox

```bash
cd /home/akani/clock-kit/scripts/outreach
cp .env.example .env
```

Edit `.env`:

| Variable | What to put |
| --- | --- |
| `OUTREACH_FROM` | How it appears, e.g. `Clock-Kit <you@gmail.com>` |
| `OUTREACH_REPLY_TO` | Where replies go |
| `OUTREACH_SMTP_HOST` | `smtp.gmail.com` for Gmail |
| `OUTREACH_SMTP_PORT` | `587` |
| `OUTREACH_SMTP_USER` | Your Gmail address |
| `OUTREACH_SMTP_PASS` | A Gmail **App Password**, not your normal password |

Gmail App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (2-step verification must be on).

Do not use the Clock-Kit API / Resend key for this.

## 3. Install and send

```bash
cd /home/akani/clock-kit/scripts/outreach
npm install
node send.js --send
```

The script waits 3 seconds between each message. Results are appended to `sent.jsonl` (gitignored). Duplicate emails (same inbox twice) are sent only once.

## 4. Edit who gets mail or the wording

- Contacts: `contacts.json`
- Message: the `template` string in `send.js` (`{{name}}`, `{{why}}`, `{{area}}`)

Preview again with `node send.js` after you change either file.

## If send fails

- `Missing OUTREACH_…` — `.env` is missing or incomplete
- `Run npm install inside scripts/outreach first` — run `npm install` in this folder
- Gmail 535 / authentication — App Password is wrong, or 2-step verification is off
- Honour **stop** replies and do not write to that address again
