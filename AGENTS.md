# AGENTS.md — clock-kit

Vanilla HTML/CSS/JS PWA for Clock-Kit. No React/Vue/Angular.

Sibling backend: `~/clock-kit-backend`.

## Hard constraint: max 12 serverless functions

The backend is on Vercel Hobby (**max 12** serverless functions). Every file in
`clock-kit-backend/api/*.js` is one function.

- Do **not** ask for a new backend file per CRUD operation
- New API surface must be folded into an existing function as `?action=`
- Never exceed 12 functions. Clock-Kit ships 10 (`auth`, `admin`, `organisation`,
  `clock`, `attendance`, `leave`, `schedule`, `host`, `notifications`, `system`)

API calls look like `/api/clock?action=clock-in`, not `/api/clock-in`.

## Frontend rules

- Native ES modules + Vite MPA
- Design hierarchy: **STATUS → ACTION → INFORMATION**
- Lucide icons only
- Server time is authoritative; client clocks are display-only
- Offline queue must show **PENDING SYNC** until the server confirms
- Never put `SUPABASE_SERVICE_ROLE_KEY` in this repo
- Filters belong in the URL so managers can bookmark views
