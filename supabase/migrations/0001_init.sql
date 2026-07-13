-- Date Night Concierge — initial schema
-- Phase 1 wires up `requests` only. The rest are created now so the admin
-- queue, confirmation composer, and metrics view can build on them later
-- without a second migration.

-- ---------------------------------------------------------------------------
-- requests: the public intake queue
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text not null,
  email          text,
  vibe           text,
  budget_range   text,
  preferred_night text,
  party_notes    text,
  -- Explicit opt-in to be texted, captured at submission time (TCPA hygiene).
  sms_consent    boolean not null default false,
  sms_consent_at timestamptz,
  status         text not null default 'new',
  created_at     timestamptz not null default now()
);

create index if not exists requests_status_created_idx
  on public.requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- packages: the curated date library the admin matches against
-- ---------------------------------------------------------------------------
create table if not exists public.packages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  venues      text,
  est_total   numeric(10,2),
  vibe_tags   text[],
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- bookings: a fulfilled request tied to a package
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid references public.requests(id) on delete set null,
  package_id     uuid references public.packages(id) on delete set null,
  date_of        date,
  venues_final   text,
  est_check      numeric(10,2),
  shoulder_night boolean not null default false,
  confirmed_at   timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- partners: venue relationships (trade vs paid) for the ZPM vs partner split
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id          uuid primary key default gen_random_uuid(),
  venue_name  text not null,
  contact     text,
  deal_type   text check (deal_type in ('trade', 'paid')),
  monthly_fee numeric(10,2),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Everything is server-side only for now: the intake API route uses the
-- service role key (which bypasses RLS), and there is no public/anon access.
-- Enabling RLS with no policies denies all anon/authenticated access by
-- default, which is exactly what we want until the admin dashboard lands.
-- ---------------------------------------------------------------------------
alter table public.requests enable row level security;
alter table public.packages enable row level security;
alter table public.bookings enable row level security;
alter table public.partners enable row level security;
