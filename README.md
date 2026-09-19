# B&B System — Boards & Build

Stock/inventory management, order dashboard, and WhatsApp automation for
Boards & Build, a timber and hardware merchant.

Built with Next.js 14 (App Router), Prisma, and SQLite for local dev
(swap to Postgres/MySQL for production by changing the `provider` in
`prisma/schema.prisma`).

## What's included

- **Login / Register / Forgot password** — capped at 5 admin seats
  (Member IDs 001–005). Passwords are hashed with bcrypt, sessions are
  signed JWTs in an httpOnly cookie, and "Keep me logged in" extends the
  cookie from 8 hours to 30 days.
- **Dashboard** — pending orders, orders yet to answer, today's tasks,
  and Last Day / Last Week / Last Month summaries. Every metric is
  clickable and expands into the underlying records.
- **Inventory** — Boards and Hardware tabs with the categories from the
  brief, tag-number/name search (case-insensitive), manual add, and CSV
  bulk import.
- **Employee Summary** — a new page: daily attendance (present/absent)
  and boards cut/edged per employee, with running totals for the day.
  One row per employee per day, saved independently so you can update
  it as the day goes. Each row has a **Delete** button — this is a soft
  delete (the employee is marked inactive and drops off this list), so
  their past attendance/boards history is kept intact for reporting
  rather than being wiped out.
- **Automation** — Phase 1 SLA monitor (flags WhatsApp messages
  unanswered for 5+ minutes and raises a dashboard notification) is
  wired up and running. Phase 2 now has its **fundamentals** built:
  a placeholder reader pulls sizes and edging out of free text, saves
  them as a cutlist request, generates the CSV for the Cutlist software,
  and puts the request in a queue where a human admin has to confirm or
  reject it before it's treated as final. The real transcription/NLU
  (South African languages, slang, carpentry terms) is intentionally
  left for when you have the full spec — see "Notes on what's stubbed"
  below for exactly what to swap out.
- **Background image** — the whole app uses a shared photo background
  (`app/shop-bg.jpg`) behind a translucent paper-colored wash, so pages
  keep their readability. See "Adding your background image" below.

## Getting started

```bash
npm install
cp .env.example .env        # then edit SESSION_SECRET to a long random value
npx prisma migrate dev --name init
npm run seed                # creates the Sahil Malek / 005 admin account
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

> **Already had this project running before?** The schema grew (Employee
> Summary + cutlist tables). Pull these files in, then run
> `npx prisma migrate dev --name add_employees_and_cutlist` again before
> `npm run dev` — Prisma will create the new tables without touching
> your existing data.

**First login:**
- Username: `sahil.malek`
- Password: `MalekAdmin1978@`

Change this password after first login (there's no in-app "change
password" screen yet — use the Forgot Password flow, which logs a reset
link to the server console since no email provider is wired up).

## Adding your background image

`app/layout.js` imports a background photo like this:

```js
import shopBg from "./shop-bg.jpg";
```

Put your image file at `app/shop-bg.jpg` (same folder as `layout.js`).
If your file isn't a `.jpg` — say it's `shop-bg.png` or `shop-bg.webp` —
just change that one import line to match the real extension. Without
this file present, `npm run dev` / `npm run build` will fail with a
"module not found" error, since Next.js needs the image at build time
to optimize it.

The background sits behind a translucent paper-colored wash (defined
inline in `app/layout.js`) so text stays readable over the photo — the
opacity is currently `0.55` (more photo visible than text-wash); turn
it down toward `0.3`–`0.4` for even more of the photo to show through,
or back up toward `0.9` if text legibility ever becomes a problem.

## Notes on what's stubbed vs. real

- **WhatsApp Business API**: `POST /api/automation/inbound` is a stub
  webhook receiver — point your WhatsApp Business webhook at it and it
  writes each message into `WhatsAppMessage`, so the SLA monitor and
  dashboard pick it up automatically. It does not yet verify Meta's
  `X-Hub-Signature-256` header, which you should add before going live.
- **SLA monitor**: `/api/automation/sla-check` is safe to call
  repeatedly and only escalates a message once. The Automation page
  polls it client-side every 30s for the demo; in production, call it
  from a real cron job or queue worker instead so it runs even with no
  browser tab open.
- **Phase 2 AI — cutlist generation**: the fundamentals are built and
  working end-to-end (data model, CSV export, human confirmation queue,
  a "Test a cutlist request" form on the Automation page). The reader in
  `lib/cutlist.js` (`parseCutlistText`) is sharper than a first pass —
  it splits a message into segments (by comma/semicolon/newline/"and")
  and reads quantity, size, edging, and material **per item** rather
  than applying one edging phrase to every size in the message; it also
  rejects implausible dimensions (outside 10–6000mm) so stray numbers
  like phone numbers don't get misread as a board size. It still does
  **not** do voice transcription or South African language/slang
  understanding — confidence is deliberately capped low so every result
  still lands in the confirmation queue regardless of how clean the
  input looked. When you're ready with the real spec, replace
  `parseCutlistText()` and `buildCutlistCsv()` in `lib/cutlist.js` — the
  API routes, database schema, and Automation-page UI around them don't
  need to change. The edging combinations are defined in
  `EDGING_OPTIONS` in the same file.
- **CSV import** expects headers matching the `InventoryItem` fields:
  `tagNumber,name,category,quantity,unit,price,supplier,notes` (the
  `database` field defaults to whichever tab — Boards or Hardware — you
  import into, or you can include a `database` column to mix both in one
  file).

## Project structure

```
app/
  shop-bg.jpg                                           — your background photo (add this)
  login/ register/ forgot-password/ reset-password/     — auth pages
  dashboard/ inventory/ automation/ employee-summary/    — main app pages
  api/auth/...                                           — auth routes
  api/inventory/                                         — search + CRUD
  api/dashboard/metrics/                                 — dashboard counters
  api/automation/...                                     — WhatsApp queue, SLA check, cutlist
  api/employees/...                                      — employees + daily work logs
lib/
  db.js          — Prisma client singleton
  auth.js        — password hashing, session cookies
  categories.js  — Boards/Hardware categories
  cutlist.js     — edging matrix, placeholder parser, CSV export (Phase 2 fundamentals)
components/
  Nav.js         — sidebar navigation
prisma/
  schema.prisma  — data models
  seed.js        — creates the master admin + sample data
middleware.js    — route protection (redirects signed-out users to /login)
```
