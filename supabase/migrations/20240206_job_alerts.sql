-- =============================================================================
-- RNTell: Job alerts table for email capture (logged-out users)
-- =============================================================================

create table if not exists public.job_alerts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now()
);

-- Allow anonymous inserts (public email capture form)
alter table public.job_alerts enable row level security;

create policy "Anyone can subscribe to job alerts"
  on public.job_alerts for insert
  to anon, authenticated
  with check (true);

-- Add travel_reimbursement to job_postings if missing
alter table public.job_postings
  add column if not exists travel_reimbursement numeric(10,2) default 0;
