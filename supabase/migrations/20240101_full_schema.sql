-- =============================================================================
-- RNTell MVP: Full Database Schema
-- /supabase/migrations/20240101_full_schema.sql
--
-- Direct-to-facility marketplace for travel nurses.
-- Transparency engine + social matching + Stripe Connect payments.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "moddatetime" with schema extensions;

-- ---------------------------------------------------------------------------
-- 2. ENUMS
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('nurse', 'facility', 'admin');

create type public.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'expired',
  'rejected'
);

create type public.shift_type as enum (
  'day',
  'night',
  'rotating',
  'prn',
  'travel',
  'per_diem'
);

create type public.social_preference as enum (
  'ghost',
  'friendly',
  'community'
);

-- ---------------------------------------------------------------------------
-- 3. CORE TABLES
-- ---------------------------------------------------------------------------

-- 3a. profiles  (1:1 with auth.users)
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  role          public.user_role not null default 'nurse',
  email         text not null,
  full_name     text,
  avatar_url    text,
  stripe_customer_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Core user profile, 1:1 with auth.users. Shared by nurses, facilities, and admins.';

-- 3b. nurses
create table public.nurses (
  id                  uuid primary key references public.profiles on delete cascade,
  specialty           text,                         -- e.g. ICU, Med/Surg, L&D, ER
  years_experience    smallint default 0,
  license_state       text,                         -- primary license state
  license_compact     boolean not null default false,-- compact (multi-state) license
  license_verified    boolean not null default false,
  verification_status public.verification_status not null default 'unverified',
  stripe_account_id   text,                         -- Stripe Connect payout account
  travel_preferences  jsonb default '{}'::jsonb,    -- { "preferred_states": [], "housing": "stipend"|"provided", "start_available": "2024-03-01" }
  social_style        public.social_preference default 'friendly',
  has_pets            boolean not null default false,
  bio                 text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.nurses is
  'Nurse-specific profile data. Linked 1:1 to profiles where role = nurse.';

-- 3c. facilities
create table public.facilities (
  id                        uuid primary key references public.profiles on delete cascade,
  name                      text not null,
  location_city             text,
  location_state            text,
  type                      text,                   -- e.g. Hospital, SNF, Clinic, Rehab
  bed_count                 smallint,
  is_verified               boolean not null default false,
  verification_status       public.verification_status not null default 'unverified',
  stripe_subscription_status text default 'inactive',-- Stripe Connect subscription state
  stripe_account_id         text,                   -- Stripe Connect account for paying nurses
  website                   text,
  description               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.facilities is
  'Facility profile data. Linked 1:1 to profiles where role = facility.';

-- ---------------------------------------------------------------------------
-- 4. TRANSPARENCY ENGINE ("Glassdoor for Nurses")
-- ---------------------------------------------------------------------------

-- 4a. salary_reports
create table public.salary_reports (
  id                    uuid primary key default gen_random_uuid(),
  facility_id           uuid not null references public.facilities on delete cascade,
  nurse_id              uuid references public.nurses on delete set null,
  specialty             text,
  shift_type            public.shift_type,
  hourly_rate           numeric(8,2),
  stipend_housing       numeric(8,2),               -- weekly housing stipend
  stipend_meals         numeric(8,2),               -- weekly M&IE stipend
  travel_reimbursement  numeric(8,2),
  overtime_rate         numeric(8,2),
  contract_length_weeks smallint,
  agency_gap_detected   boolean not null default false, -- true if pay gap vs. GSA rates
  gsa_rate_comparison   numeric(5,2),               -- % difference from GSA rates
  is_verified           boolean not null default false,
  reported_at           timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

comment on table public.salary_reports is
  'Nurse-submitted salary/stipend reports. Powers the transparency engine and GSA rate comparison.';

-- 4b. negotiation_levers
create table public.negotiation_levers (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references public.facilities on delete cascade,
  lever_type      text not null,                    -- e.g. 'OT Multiplier', 'Callback Rate', 'Weekend Diff', 'Charge Nurse Diff'
  description     text,
  lever_value     text,                             -- e.g. '1.5x after 36hrs', '$5/hr weekend diff'
  verified_count  int not null default 0,           -- # of nurses who confirmed this lever
  source          text,                             -- 'nurse_report', 'contract_scan', 'public_data'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.negotiation_levers is
  'Crowdsourced negotiation data points per facility. Helps nurses know what to ask for.';

-- 4c. facility_reviews
create table public.facility_reviews (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references public.facilities on delete cascade,
  nurse_id        uuid references public.nurses on delete set null,
  rating_overall  smallint not null check (rating_overall between 1 and 5),
  rating_pay      smallint check (rating_pay between 1 and 5),
  rating_safety   smallint check (rating_safety between 1 and 5),
  rating_staffing smallint check (rating_staffing between 1 and 5),
  rating_culture  smallint check (rating_culture between 1 and 5),
  review_title    text,
  review_body     text,
  would_return    boolean,
  is_verified     boolean not null default false,    -- verified = worked there
  created_at      timestamptz not null default now()
);

comment on table public.facility_reviews is
  'Nurse reviews of facilities across pay, safety, staffing, and culture dimensions.';

-- ---------------------------------------------------------------------------
-- 5. MARKETPLACE & SOCIAL
-- ---------------------------------------------------------------------------

-- 5a. job_postings
create table public.job_postings (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities on delete cascade,
  title             text not null,                  -- e.g. 'ICU Travel RN - 13 Week Contract'
  specialty         text not null,                  -- e.g. ICU, Med/Surg, ER, L&D, NICU
  shift_type        public.shift_type default 'day',
  pay_rate_hourly   numeric(8,2),
  pay_package_total numeric(10,2),                  -- total weekly package (rate + stipends)
  stipend_housing   numeric(8,2),
  stipend_meals     numeric(8,2),
  contract_weeks    smallint,
  start_date        date,
  requirements      jsonb default '[]'::jsonb,      -- ["BLS","ACLS","2yr ICU exp"]
  description       text,
  is_active         boolean not null default true,
  slots_available   smallint default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.job_postings is
  'Direct facility job postings. No agency middleman.';

-- 5b. applications
create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.job_postings on delete cascade,
  nurse_id    uuid not null references public.nurses on delete cascade,
  status      text not null default 'submitted'
              check (status in ('submitted','reviewing','interview','offered','accepted','rejected','withdrawn')),
  cover_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (job_id, nurse_id)                         -- one application per nurse per job
);

comment on table public.applications is
  'Nurse applications to facility job postings.';

-- 5c. rn_matches (social / roommate matching)
create table public.rn_matches (
  id                  uuid primary key default gen_random_uuid(),
  nurse_a_id          uuid not null references public.nurses on delete cascade,
  nurse_b_id          uuid not null references public.nurses on delete cascade,
  compatibility_score numeric(5,2),                 -- 0-100 score
  match_reasons       jsonb default '[]'::jsonb,    -- ["same_specialty","same_city","social_style"]
  status              text not null default 'suggested'
                      check (status in ('suggested','liked','matched','dismissed')),
  created_at          timestamptz not null default now(),
  check (nurse_a_id <> nurse_b_id)                  -- can't match with yourself
);

comment on table public.rn_matches is
  'Travel nurse social matching. Find roommates, travel buddies, and local connections.';

-- ---------------------------------------------------------------------------
-- 6. INDEXES
-- ---------------------------------------------------------------------------
create index idx_profiles_role          on public.profiles (role);
create index idx_nurses_specialty       on public.nurses (specialty);
create index idx_nurses_license_state   on public.nurses (license_state);
create index idx_facilities_state       on public.facilities (location_state);
create index idx_facilities_verified    on public.facilities (is_verified) where is_verified = true;
create index idx_salary_reports_facility on public.salary_reports (facility_id);
create index idx_salary_reports_specialty on public.salary_reports (specialty);
create index idx_negotiation_levers_facility on public.negotiation_levers (facility_id);
create index idx_facility_reviews_facility on public.facility_reviews (facility_id);
create index idx_job_postings_active    on public.job_postings (is_active, specialty) where is_active = true;
create index idx_job_postings_facility  on public.job_postings (facility_id);
create index idx_applications_job       on public.applications (job_id);
create index idx_applications_nurse     on public.applications (nurse_id);
create index idx_rn_matches_nurse_a     on public.rn_matches (nurse_a_id);
create index idx_rn_matches_nurse_b     on public.rn_matches (nurse_b_id);

-- ---------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGERS (moddatetime)
-- ---------------------------------------------------------------------------
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

create trigger handle_nurses_updated_at
  before update on public.nurses
  for each row execute function extensions.moddatetime(updated_at);

create trigger handle_facilities_updated_at
  before update on public.facilities
  for each row execute function extensions.moddatetime(updated_at);

create trigger handle_negotiation_levers_updated_at
  before update on public.negotiation_levers
  for each row execute function extensions.moddatetime(updated_at);

create trigger handle_job_postings_updated_at
  before update on public.job_postings
  for each row execute function extensions.moddatetime(updated_at);

create trigger handle_applications_updated_at
  before update on public.applications
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- Enable RLS on ALL tables
alter table public.profiles          enable row level security;
alter table public.nurses            enable row level security;
alter table public.facilities        enable row level security;
alter table public.salary_reports    enable row level security;
alter table public.negotiation_levers enable row level security;
alter table public.facility_reviews  enable row level security;
alter table public.job_postings      enable row level security;
alter table public.applications      enable row level security;
alter table public.rn_matches        enable row level security;

-- ---- PROFILES ----
-- Users can read any profile (for marketplace discovery)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profiles are created by the auth trigger, not directly
create policy "Profiles are created via auth trigger"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---- NURSES ----
create policy "Nurse profiles are viewable by everyone"
  on public.nurses for select
  using (true);

create policy "Nurses can update own record"
  on public.nurses for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Nurses can insert own record"
  on public.nurses for insert
  with check (auth.uid() = id);

-- ---- FACILITIES ----
create policy "Facility profiles are viewable by everyone"
  on public.facilities for select
  using (true);

create policy "Facilities can update own record"
  on public.facilities for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Facilities can insert own record"
  on public.facilities for insert
  with check (auth.uid() = id);

-- ---- SALARY REPORTS (public read - transparency engine) ----
create policy "Salary reports are viewable by everyone"
  on public.salary_reports for select
  using (true);

create policy "Authenticated users can submit salary reports"
  on public.salary_reports for insert
  with check (auth.uid() is not null);

create policy "Users can update own salary reports"
  on public.salary_reports for update
  using (auth.uid() = nurse_id)
  with check (auth.uid() = nurse_id);

-- ---- NEGOTIATION LEVERS (public read - transparency engine) ----
create policy "Negotiation levers are viewable by everyone"
  on public.negotiation_levers for select
  using (true);

create policy "Authenticated users can submit levers"
  on public.negotiation_levers for insert
  with check (auth.uid() is not null);

-- ---- FACILITY REVIEWS (public read - transparency engine) ----
create policy "Facility reviews are viewable by everyone"
  on public.facility_reviews for select
  using (true);

create policy "Authenticated users can submit reviews"
  on public.facility_reviews for insert
  with check (auth.uid() is not null);

create policy "Users can update own reviews"
  on public.facility_reviews for update
  using (auth.uid() = nurse_id)
  with check (auth.uid() = nurse_id);

-- ---- JOB POSTINGS (public read - marketplace) ----
create policy "Active job postings are viewable by everyone"
  on public.job_postings for select
  using (true);

create policy "Facilities can create job postings"
  on public.job_postings for insert
  with check (
    auth.uid() = facility_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'facility'
    )
  );

create policy "Facilities can update own postings"
  on public.job_postings for update
  using (auth.uid() = facility_id)
  with check (auth.uid() = facility_id);

create policy "Facilities can delete own postings"
  on public.job_postings for delete
  using (auth.uid() = facility_id);

-- ---- APPLICATIONS ----
create policy "Nurses can view own applications"
  on public.applications for select
  using (auth.uid() = nurse_id);

create policy "Facilities can view applications to their jobs"
  on public.applications for select
  using (
    exists (
      select 1 from public.job_postings
      where id = job_id and facility_id = auth.uid()
    )
  );

create policy "Nurses can submit applications"
  on public.applications for insert
  with check (
    auth.uid() = nurse_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'nurse'
    )
  );

create policy "Nurses can update own applications"
  on public.applications for update
  using (auth.uid() = nurse_id)
  with check (auth.uid() = nurse_id);

create policy "Facilities can update application status"
  on public.applications for update
  using (
    exists (
      select 1 from public.job_postings
      where id = job_id and facility_id = auth.uid()
    )
  );

-- ---- RN MATCHES ----
create policy "Nurses can view own matches"
  on public.rn_matches for select
  using (auth.uid() = nurse_a_id or auth.uid() = nurse_b_id);

create policy "System can insert matches"
  on public.rn_matches for insert
  with check (auth.uid() = nurse_a_id);

create policy "Nurses can update own match status"
  on public.rn_matches for update
  using (auth.uid() = nurse_a_id or auth.uid() = nurse_b_id);
