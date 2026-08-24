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

## Design

Hierarchy is **STATUS → ACTION → INFORMATION**. Neumorphic surfaces, Lucide-ready layout, Clock-Kit brand colours from the logo in `public/assets/logo/`.
