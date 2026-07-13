# Date Night Concierge

Form in, text back. A couple tells us the vibe and the budget; we plan the
whole night by hand and text them the itinerary. No app, no accounts.

**Stack:** Next.js 14 (App Router) · Supabase · Tailwind CSS

## Phase 1 — intake

The smallest thing that proves demand:

- **Public intake form** at `/` — 5 fields max, mobile-first, ~20-second submit,
  with a required SMS-consent checkbox (opt-in is stored with a timestamp).
- **`requests` table** in Supabase, written server-side.
- **Instant notification** to your phone (Telegram and/or email) on every
  submission, so you can fulfill manually.

## Phase 2 — concierge queue

The private dashboard you actually work the requests from:

- **Password-gated admin** at `/admin`. Sign in at `/login` with a single
  shared `ADMIN_PASSWORD`; the session is a signed, HTTP-only cookie (HMAC of
  `AUTH_SECRET`), so there are no accounts to manage.
- **Live request queue** — every active submission newest-first, with a
  tap-to-call phone link, the vibe/budget/night at a glance, and a "time ago"
  stamp. Archived requests drop off the list.
- **One-tap status** — move a request through `new → contacted → confirmed →
  done` (or `archived`) with optimistic updates; changes persist via an
  authenticated `PATCH /api/admin/requests/[id]`.

## Phase 3 — confirmation composer

Closing the loop: draft the itinerary and text it back to the couple.

- **"Text back" composer** on every request card — fill in the date, venues,
  and estimated check, and it drafts a warm, ready-to-send message (which you
  can freely edit).
- **One tap to confirm** — records a `bookings` row, texts the couple via
  Twilio, and flips the request to `confirmed` (via authenticated
  `POST /api/admin/requests/[id]/confirm`).
- **No Twilio? No problem.** If SMS isn't configured the booking is still
  saved and confirmed, and the composer tells you to hit **Copy text** and send
  it from your own phone. Texts only go to couples who opted in at intake.

## Phase 4 — metrics

A read-only dashboard at `/admin/metrics` (linked from the queue header):

- **Stat tiles** — total requests, confirmed, conversion rate
  (`confirmed + done ÷ total`), bookings, and booked revenue with an average
  check.
- **Requests over the last 14 days** — a simple bar chart, zeros back-filled.
- **Breakdowns** — most-requested vibes, budgets, and preferred nights.

All computed from `requests` + `bookings` by the pure `lib/metrics.ts`
(`computeMetrics`), so the page just renders the numbers.

That completes the planned build: **intake → queue → text back → metrics**.
The `packages` and `partners` tables ship in the migration for future use.

## Interactive demo

A self-contained, no-backend prototype of the whole app lives at
`public/demo.html` (served at **`/demo.html`**, linked from the bottom of the
intake page). It runs entirely in the browser on seeded data — submit the
form and watch the request flow into the concierge queue and the metrics —
so you can show the full loop without configuring Supabase or Twilio.

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

Create a project at [supabase.com](https://supabase.com), then run the
migration in `supabase/migrations/0001_init.sql` (paste it into the SQL editor,
or use the Supabase CLI). It creates all four tables and enables RLS.

### 3. Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (required).
- `ADMIN_PASSWORD` and `AUTH_SECRET` (required to sign in at `/admin`).
  Generate a secret with `openssl rand -hex 32`.
- At least one notification channel so you get pinged:
  - **Telegram:** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
    (create a bot via [@BotFather](https://t.me/BotFather)).
  - **Email:** `RESEND_API_KEY` + `NOTIFY_EMAIL_TO` + `NOTIFY_EMAIL_FROM`
    (via [Resend](https://resend.com)). Point `NOTIFY_EMAIL_TO` at your
    carrier's email-to-SMS gateway to land it as a text.

If neither channel is configured, requests still save — you just won't get
pinged.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the intake form, or
[/admin](http://localhost:3000/admin) for the concierge queue.

## Security notes

- The service role key is used **only** server-side in `app/api/requests/route.ts`.
  It is never sent to the browser.
- RLS is enabled on every table with no anon policies, so the tables are
  locked down to everything except the service role. The admin dashboard
  reads and writes through server components / route handlers using that same
  server-only key — the browser never touches Supabase directly.
- The admin session cookie is `httpOnly`, `sameSite=lax`, and `secure` in
  production. The password is compared in constant time.

## Deploy

Deploys cleanly to Vercel. Set the same environment variables in the Vercel
project settings.
