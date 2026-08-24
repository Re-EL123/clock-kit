# Clock-Kit

Premium workforce clocking PWA (vanilla HTML/CSS/JS, Vite MPA). Backend lives in `~/clock-kit-backend`.

## Panels

- `/login.html` — sign in
- `/candidate/` — clock, breaks, leave
- `/organisation/` — exception dashboard, people, hosts, approvals
- `/host/` — assigned workforce
- `/admin/` — platform owner
- `/kiosk/` — site kiosk (PIN / QR)

## Setup

```bash
cp .env.example .env
# set VITE_API_URL to the backend, plus the Supabase anon key for realtime
npm install
npm run dev
```

The browser never receives `SUPABASE_SERVICE_ROLE_KEY`.

## GitHub Pages

Live site: https://re-el123.github.io/clock-kit/

The Pages build talks to `https://clock-kit-backend.vercel.app/api`. Override with repository variables if needed (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Local `npm run dev` still defaults to `http://localhost:3000/api` unless you set `.env`.

## Design

Hierarchy is **STATUS → ACTION → INFORMATION**. Neumorphic surfaces, Lucide-ready layout, Clock-Kit brand colours from the logo in `public/assets/logo/`.
