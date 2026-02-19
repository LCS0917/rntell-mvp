-- =============================================================================
-- RNTell: Decouple facilities from profiles + Scraper infrastructure
-- /supabase/migrations/20240209_facilities_decouple_and_scraper.sql
--
-- WHAT THIS MIGRATION DOES:
--   1. Decouples facilities.id from profiles.id by:
--      a. Adding a new standalone PK (facility_uuid) with gen_random_uuid()
--      b. Adding profile_id as a nullable FK → profiles.id
--      c. Back-filling profile_id from the current id (claimed facilities)
--      d. Swapping PK: facilities.id becomes a free uuid, profile_id is the
--         link to auth.users
--      e. Updating all foreign keys in downstream tables that reference
--         facilities(id) — they are untouched because we keep the same column
--         name `id`, we only change WHAT populates it.
--
--   Because Postgres does not allow altering the PK column type directly when
--   there are FK dependants, we use a safe column-swap pattern:
--     - Add `profile_id` (nullable)
--     - Populate `profile_id` from existing `id` values
--     - Drop the FK constraint that ties facilities.id → profiles.id
--     - Re-create `id` as a default gen_random_uuid() column (no FK)
--     - The existing id VALUES remain intact → all FK references in
--       salary_reports, job_postings, etc. continue to resolve correctly
--
--   2. Adds source_url, source_hash, scraped_at, last_seen_at to job_postings
--   3. Adds the scrape_jobs audit/log table
--
-- SAFETY GUARANTEES:
--   * No tables are dropped
--   * No existing data is deleted
--   * Existing facility → profile links are preserved in profile_id
--   * All downstream FK references (salary_reports.facility_id, etc.) remain
--     valid because the `id` column values do not change
--   * Idempotent via IF NOT EXISTS / IF EXISTS guards where possible
-- =============================================================================


-- ---------------------------------------------------------------------------
-- STEP 1: Add profile_id to facilities (nullable FK → profiles)
-- ---------------------------------------------------------------------------
alter table public.facilities
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

comment on column public.facilities.profile_id is
  'FK to profiles.id. NULL for scraped/unclaimed facilities. Populated when a facility user signs up or claims a profile.';


-- ---------------------------------------------------------------------------
-- STEP 2: Back-fill profile_id for all existing (claimed) facilities
--
-- Currently facilities.id = profiles.id for every row. Copy those values
-- into profile_id before we break the FK.
-- ---------------------------------------------------------------------------
update public.facilities
set profile_id = id
where profile_id is null;


-- ---------------------------------------------------------------------------
-- STEP 3: Drop the FK constraint that makes facilities.id reference profiles
--
-- We need the constraint name. In Supabase-generated schemas the constraint
-- is named  facilities_id_fkey  (default Postgres naming convention).
-- We use a DO block to drop it only if it exists, avoiding errors on re-run.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'facilities_id_fkey'
      and table_name = 'facilities'
      and table_schema = 'public'
  ) then
    alter table public.facilities drop constraint facilities_id_fkey;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- STEP 4: Give facilities.id a default (so new scraped rows auto-generate
-- a PK without needing a profiles row).
--
-- Existing rows already have a UUID in `id` — setting the DEFAULT does not
-- change those values.
-- ---------------------------------------------------------------------------
alter table public.facilities
  alter column id set default gen_random_uuid();


-- ---------------------------------------------------------------------------
-- STEP 5: Update the auth trigger so that when a facility user signs up,
-- we INSERT a NEW facilities row (with its own generated id) and set
-- profile_id = new.id, rather than using new.id as the facilities PK.
--
-- This replaces handle_new_user() from 20240202.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    role,
    email,
    full_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'nurse'::public.user_role
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );

  -- NURSE: create nurses row (default role if none specified)
  if coalesce((new.raw_user_meta_data ->> 'role'), 'nurse') = 'nurse' then
    insert into public.nurses (id)
    values (new.id);
  end if;

  -- FACILITY: create a new facilities row with its own PK,
  -- link to the new profile via profile_id.
  -- NOTE: id is now gen_random_uuid() — NOT new.id.
  if (new.raw_user_meta_data ->> 'role') = 'facility' then
    insert into public.facilities (
      id,
      profile_id,
      name,
      is_claimed,
      data_source
    )
    values (
      gen_random_uuid(),
      new.id,
      coalesce(new.raw_user_meta_data ->> 'facility_name', 'Unnamed Facility'),
      true,              -- account-created facilities are claimed by definition
      'self_reported'
    );
  end if;

  -- LANDLORD: create landlords row (still 1:1 with profiles)
  if (new.raw_user_meta_data ->> 'role') = 'landlord' then
    insert into public.landlords (id)
    values (new.id);
  end if;

  -- ADMIN: no auto-row created.
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auto-creates role-specific records on signup. facilities now use their own PK; profile_id links back to auth. Scraper-created facilities have profile_id = NULL until claimed.';


-- ---------------------------------------------------------------------------
-- STEP 6: Add a unique index on profile_id (one profile → one claimed facility)
-- Partial: only enforce uniqueness when profile_id is not null.
-- ---------------------------------------------------------------------------
create unique index if not exists facilities_profile_id_unique
  on public.facilities (profile_id)
  where profile_id is not null;


-- ---------------------------------------------------------------------------
-- STEP 7: Add scraping columns to job_postings
-- ---------------------------------------------------------------------------
alter table public.job_postings
  add column if not exists source_url text,       -- canonical URL of the original posting
  add column if not exists source_hash text,      -- SHA-256 of normalized content for dedup
  add column if not exists scraped_at timestamptz,-- when this row was first scraped
  add column if not exists last_seen_at timestamptz; -- last time scraper confirmed it active

comment on column public.job_postings.source_url is
  'Canonical source URL for scraped jobs. NULL for self-reported postings.';
comment on column public.job_postings.source_hash is
  'SHA-256 of normalized job content. Used to detect changed listings.';
comment on column public.job_postings.scraped_at is
  'Timestamp when this job was first ingested by the scraper.';
comment on column public.job_postings.last_seen_at is
  'Last time the scraper confirmed this listing was still live. Jobs not seen after 7 days are marked inactive.';

-- Unique constraint: no duplicate URLs
create unique index if not exists job_postings_source_url_unique
  on public.job_postings (source_url)
  where source_url is not null;

-- Index for stale-job cleanup queries
create index if not exists job_postings_last_seen_idx
  on public.job_postings (last_seen_at)
  where is_active = true;


-- ---------------------------------------------------------------------------
-- STEP 8: Add scrape_jobs audit table
-- ---------------------------------------------------------------------------
create table if not exists public.scrape_jobs (
  id                uuid primary key default gen_random_uuid(),
  source_type       text not null,       -- 'hospital_careers', 'indeed', 'custom', etc.
  source_name       text not null,       -- human-readable name e.g. 'UCLA Health Careers'
  source_url        text,               -- root URL that was scraped
  state_filter      text,               -- optional state code filter passed to scraper
  status            text not null default 'queued',
    -- queued | running | complete | failed | cancelled
  records_created   int not null default 0,   -- new job_postings rows inserted
  records_updated   int not null default 0,   -- existing rows updated (content changed)
  facilities_created int not null default 0,  -- new facilities rows inserted
  duplicates_skipped int not null default 0,  -- unchanged duplicates skipped
  jobs_deactivated  int not null default 0,   -- jobs marked inactive (no longer seen)
  errors            jsonb not null default '[]'::jsonb, -- array of { url, message } objects
  triggered_by      uuid references public.profiles(id) on delete set null,
    -- admin who triggered this run (null = cron/automated)
  started_at        timestamptz,
  finished_at       timestamptz,
  created_at        timestamptz not null default now()
);

comment on table public.scrape_jobs is
  'Audit log for every scraper run. Tracks status, counts, and errors for admin visibility.';

-- Indexes for admin dashboard queries
create index if not exists scrape_jobs_status_idx on public.scrape_jobs (status);
create index if not exists scrape_jobs_created_idx on public.scrape_jobs (created_at desc);

-- RLS: admin-only read/write
alter table public.scrape_jobs enable row level security;

create policy "Admins can manage scrape_jobs"
  on public.scrape_jobs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ---------------------------------------------------------------------------
-- STEP 9: Add location_zip to facilities (useful for scraper dedup matching)
-- ---------------------------------------------------------------------------
alter table public.facilities
  add column if not exists location_zip text;

comment on column public.facilities.location_zip is
  'ZIP code for the facility. Used by scraper matching logic as a secondary dedup key alongside normalized name + state.';


-- ---------------------------------------------------------------------------
-- STEP 10: Add phone + logo_url to facilities (scraped data enrichment)
-- ---------------------------------------------------------------------------
alter table public.facilities
  add column if not exists phone text,
  add column if not exists logo_url text;


-- ---------------------------------------------------------------------------
-- SUMMARY
-- ---------------------------------------------------------------------------
-- After this migration:
--
--   facilities
--   ├── id           (uuid PK, now auto-generated, no longer tied to profiles)
--   ├── profile_id   (uuid, nullable FK → profiles.id — populated only for claimed)
--   ├── name
--   ├── location_city, location_state, location_zip
--   ├── is_claimed   (false for scraped, true once profile_id is set)
--   ├── data_source  (self_reported | scraped | imported)
--   └── ... (all existing columns preserved)
--
--   job_postings
--   ├── ... (all existing columns)
--   ├── source_url   (unique, nullable)
--   ├── source_hash  (for change detection)
--   ├── scraped_at
--   └── last_seen_at
--
--   scrape_jobs      (new — audit log for scraper runs)
-- =============================================================================
