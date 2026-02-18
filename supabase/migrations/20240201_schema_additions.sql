-- =============================================================================
-- RNTell: Schema Additions
-- /supabase/migrations/20240201_schema_additions.sql
--
-- Adds: landlord role, landlord profiles, housing/rental schema,
-- contract analysis table (public tool, anonymous-safe),
-- credential vault (The Passport), vetting pipeline (RaaS),
-- confirmed contracts table (fee tracking), and facility premium/claim fields.
--
-- Public intelligence (no auth): job listings, facility profiles (factual only if unclaimed),
--   rental listings (factual only if unclaimed), salary data, contract analysis tool
-- Account-gated (freemium): facility reviews, negotiation levers, smart matching,
--   The Passport, applications, rental agreements
-- Claimed vs. unclaimed: suppression of photos/descriptions/marketing is UI layer only.
--   All data stored regardless of claim status.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. EXTEND ENUMS
-- ---------------------------------------------------------------------------

-- Add landlord to user_role
alter type public.user_role add value if not exists 'landlord';

-- Vetting pipeline stages for Recruiting-as-a-Service
create type public.vetting_stage as enum (
  'discovery_email',
  'video_interview',
  'ai_scoring',
  'rejected',
  'verified_for_hire'
);

-- Document types for The Passport (credential vault)
create type public.document_type as enum (
  'rn_license',
  'compact_license',
  'bls',
  'acls',
  'pals',
  'nrp',
  'tncc',
  'contract',
  'offer_letter',
  'tax_document',
  'identity',
  'other'
);

-- Rental agreement statuses
create type public.rental_status as enum (
  'pending',
  'active',
  'cancelled_pre_stay',
  'cancelled_mid_stay',
  'completed',
  'restarted'
);

-- Cancellation window types — drives rolling rental penalty logic
create type public.cancellation_window as enum (
  'early_notice',    -- 8+ days before move-in: 100% refund
  'pre_stay',        -- 1–7 days before move-in: 1 week rent penalty
  'mid_stay'         -- after move-in: 14-day rent penalty
);


-- ---------------------------------------------------------------------------
-- 2. NEW COLUMNS ON EXISTING TABLES
-- ---------------------------------------------------------------------------

-- Facilities: premium subscription flag (gates RaaS features in employer dashboard)
alter table public.facilities
  add column if not exists is_premium_subscriber boolean not null default false;

-- Facilities: claim flow support (pre-populated from external/scraped data)
-- is_claimed = false → show factual fields only in UI (name, location, type, bed count, specialties)
-- is_claimed = true  → show everything including description, photos, marketing content
alter table public.facilities
  add column if not exists is_claimed boolean not null default false,
  add column if not exists data_source text not null default 'self_reported';
  -- data_source values: 'self_reported', 'scraped', 'imported'

-- Facilities: employer's custom vetting questions for RaaS pipeline
alter table public.facilities
  add column if not exists vetting_logic jsonb default '{}'::jsonb;
  -- Shape: { "hard_requirements": ["2+ yrs ICU", "ACLS"], "custom_questions": ["Are you compact licensed?"] }

-- rn_matches: update comment to reflect full scope
comment on table public.rn_matches is
  'Nurse-to-nurse matching. Covers social connections, travel buddies, and roommate matching. When logged in with saved contract data, matches are ranked by location, dates, and social preferences. Account required.';

-- facility_reviews: update comment to reflect account-gated status
comment on table public.facility_reviews is
  'Nurse-submitted reviews of facilities. Written and read by logged-in nurses only. Account required to view. Generated on the platform — not pulled from external sources.';

-- negotiation_levers: update comment to reflect account-gated status
comment on table public.negotiation_levers is
  'Platform-generated negotiation data per facility (OT multipliers, callback rates, weekend differentials, charge nurse differentials). Core freemium feature. Account required to view.';


-- ---------------------------------------------------------------------------
-- 3. CONTRACT ANALYSES TABLE
-- ---------------------------------------------------------------------------
-- Public tool — no account required to analyze a contract.
-- Input: nurse uploads a PDF OR manually enters contract details
--   (hourly rate, housing stipend, meal stipend, travel reimbursement,
--    contract length, start date, facility name, location, specialty).
-- Output: estimated bill rate, market margin gap, GSA rate comparison.
-- nurse_id is nullable: anonymous analyses are stored without an account.
-- session_id links anonymous analyses to a browser session so they can be
-- claimed when the nurse creates an account.
-- Saved analyses power smart matching across the entire platform.

create table public.contract_analyses (
  id                    uuid primary key default gen_random_uuid(),
  nurse_id              uuid references public.nurses on delete set null,
  -- nullable: anonymous analyses exist without an account
  session_id            text,
  -- browser session ID used to claim this analysis when nurse signs up
  facility_name         text,
  facility_state        text,
  specialty             text,
  shift_type            public.shift_type,
  contract_weeks        smallint,
  start_date            date,
  hourly_rate           numeric(8,2),
  stipend_housing       numeric(8,2),                -- weekly housing stipend
  stipend_meals         numeric(8,2),                -- weekly meal & incidental stipend
  travel_reimbursement  numeric(8,2),
  bill_rate_estimated   numeric(8,2),                -- estimated bill rate from AI analysis
  market_margin_pct     numeric(5,2),                -- % gap between nurse pay and GSA benchmark
  market_margin_dollars numeric(10,2),               -- dollar gap surfaced to the nurse
  gsa_rate_used         numeric(8,2),                -- the GSA rate used for this comparison
  margin_risk_detected  boolean not null default false,
  -- true if nurse pay is significantly below market
  input_method          text default 'manual',
  -- 'manual' = nurse typed in details, 'pdf_upload' = nurse uploaded a PDF
  raw_contract_text     text,
  -- parsed text from a PDF upload (null if input_method = 'manual')
  storage_path          text,
  -- Supabase storage path for uploaded PDF (null if input_method = 'manual')
  analysis_result       jsonb default '{}'::jsonb,
  -- full structured AI analysis output
  is_claimed            boolean not null default false,
  -- set to true when a nurse account is linked to this anonymous analysis
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.contract_analyses is
  'Public contract analysis tool — Starting Point 2 (I Have an Offer). No account required. Input via PDF upload or manual data entry. Anonymous-safe: nurse_id nullable. Claimed on account creation. Powers smart matching when saved.';

create trigger handle_contract_analyses_updated_at
  before update on public.contract_analyses
  for each row execute function extensions.moddatetime(updated_at);

create index idx_contract_analyses_nurse   on public.contract_analyses (nurse_id) where nurse_id is not null;
create index idx_contract_analyses_session on public.contract_analyses (session_id) where session_id is not null;
create index idx_contract_analyses_state   on public.contract_analyses (facility_state);


-- ---------------------------------------------------------------------------
-- 4. LANDLORDS TABLE
-- ---------------------------------------------------------------------------
-- Built now (not later) because rental listings, rental agreements, and
-- housing smart matching connect directly to nurse profiles (contract dates,
-- location, preferences) and Stripe Connect (3.1% Bank Shield fee, payout logic).
-- The auth trigger must also create a landlords row on signup.
-- Building now avoids a painful retrofit later.

create table public.landlords (
  id                          uuid primary key references public.profiles on delete cascade,
  business_name               text,
  -- optional: used for property management companies
  contact_phone               text,
  is_verified                 boolean not null default false,
  verification_status         public.verification_status not null default 'unverified',
  stripe_account_id           text,
  -- Stripe Connect account for receiving rent payouts
  stripe_subscription_status  text default 'inactive',
  is_premium_subscriber       boolean not null default false,
  preferred_nurse_specialties jsonb default '[]'::jsonb,
  -- landlord can indicate which nurse specialties they prefer, e.g. ["ICU","ER"]
  accepts_pets                boolean not null default false,
  notes                       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.landlords is
  'Landlord profile data. Linked 1:1 to profiles where role = landlord. Supports rolling rental marketplace.';

create trigger handle_landlords_updated_at
  before update on public.landlords
  for each row execute function extensions.moddatetime(updated_at);


-- ---------------------------------------------------------------------------
-- 5. RENTAL LISTINGS TABLE
-- ---------------------------------------------------------------------------
-- All listings are publicly browsable — no account required.
-- Unclaimed listings (is_claimed = false): show factual data only.
--   Suppress in UI: photos, description, amenities.
--   All fields are stored in the database regardless of claim status.
--   Suppression happens at the API/UI layer, not by withholding from the database.
-- Claimed listings (is_claimed = true): show everything.
-- When logged in with saved contract data: listings are ranked by proximity
-- to contract facility location and date overlap (smart match layer).

create table public.rental_listings (
  id                 uuid primary key default gen_random_uuid(),
  landlord_id        uuid not null references public.landlords on delete cascade,
  -- factual fields (always shown, claimed or not)
  address_street     text,
  address_city       text not null,
  address_state      text not null,
  address_zip        text,
  unit_number        text,
  property_type      text,
  -- 'house', 'apartment', 'room', 'condo'
  is_shared          boolean not null default false,
  -- true = shared home with multiple rooms available to different nurses
  total_rooms        smallint default 1,
  available_rooms    smallint default 1,
  rent_per_room      numeric(10,2) not null,
  -- monthly rent per room
  deposit_amount     numeric(10,2),
  furnished          boolean not null default false,
  utilities_included boolean not null default false,
  pets_allowed       boolean not null default false,
  min_stay_weeks     smallint default 13,
  -- minimum stay in weeks; 13 is a standard travel contract length
  max_stay_weeks     smallint,
  available_from     date,
  -- marketing fields (suppressed in UI when is_claimed = false)
  description        text,
  amenities          jsonb default '[]'::jsonb,
  -- e.g. ["WiFi", "Washer/Dryer", "Parking", "Pool"]
  photos             jsonb default '[]'::jsonb,
  -- Supabase storage bucket paths for listing photos
  -- claim and data source fields
  is_active          boolean not null default true,
  is_claimed         boolean not null default false,
  data_source        text not null default 'self_reported',
  -- 'self_reported', 'scraped', 'imported'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.rental_listings is
  'Rental listings. Always publicly browsable. Unclaimed: show factual fields only (suppress photos, description, amenities in UI). Claimed: show everything. Smart ranking by contract location/dates when logged in.';

create trigger handle_rental_listings_updated_at
  before update on public.rental_listings
  for each row execute function extensions.moddatetime(updated_at);

create index idx_rental_listings_landlord on public.rental_listings (landlord_id);
create index idx_rental_listings_state    on public.rental_listings (address_state);
create index idx_rental_listings_active   on public.rental_listings (is_active, address_state) where is_active = true;
create index idx_rental_listings_claimed  on public.rental_listings (is_claimed);


-- ---------------------------------------------------------------------------
-- 6. RENTAL AGREEMENTS TABLE
-- ---------------------------------------------------------------------------
-- Implements the Rolling Rental payment and cancellation logic:
-- • 3.1% Bank Shield fee (pass-through, non-refundable, paid by nurse)
-- • 3% platform profit toggle (charged to landlord separately)
-- • Early notice (8+ days before move-in): 100% rent refund
-- • Pre-stay penalty (1–7 days before move-in): 1 week rent held
-- • Mid-stay penalty (after move-in): 14 days rent held
-- • Rolling Restart: penalty waived if a replacement tenant is found within the penalty window
-- • Split payments: each nurse has a 1:1 agreement with the landlord.
--   Shared homes are never treated as a joint lease.
--   If one nurse cancels, the restart logic only applies to their room.

create table public.rental_agreements (
  id                        uuid primary key default gen_random_uuid(),
  listing_id                uuid not null references public.rental_listings on delete restrict,
  nurse_id                  uuid not null references public.nurses on delete restrict,
  landlord_id               uuid not null references public.landlords on delete restrict,
  room_identifier           text,
  -- e.g. "Room A" — used for shared properties to identify which room this agreement covers
  rent_amount               numeric(10,2) not null,
  -- monthly rent for this specific room
  bank_shield_fee           numeric(10,2),
  -- 3.1% of rent, non-refundable, paid by nurse. Covers bank processing fees.
  platform_fee_pct          numeric(5,2) default 3.00,
  -- platform profit toggle charged to landlord (default 3%)
  platform_fee_amount       numeric(10,2),
  -- computed at payment time
  move_in_date              date not null,
  move_out_date             date,
  contract_weeks            smallint,
  status                    public.rental_status not null default 'pending',
  stripe_payment_intent_id  text,
  cancellation_window       public.cancellation_window,
  -- set when cancellation occurs: early_notice, pre_stay, or mid_stay
  cancellation_date         timestamptz,
  cancellation_letter_url   text,
  -- Supabase storage path for the verified hospital cancellation letter
  penalty_amount            numeric(10,2),
  -- dollar amount of penalty based on cancellation window
  penalty_waived            boolean not null default false,
  penalty_waived_reason     text,
  -- e.g. 'replacement_tenant_found'
  replaced_by_agreement_id  uuid references public.rental_agreements on delete set null,
  -- links to the new tenant's agreement when a Rolling Restart occurs
  is_amendment              boolean not null default false,
  amended_from_id           uuid references public.rental_agreements on delete set null,
  -- if this is a Rolling Restart (Contract Amendment), points to the original agreement
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.rental_agreements is
  'Individual room rental agreements. Each nurse has a 1:1 agreement with the landlord. Implements rolling rental, cancellation penalties, and restart logic. Shared homes are never a joint lease.';

create trigger handle_rental_agreements_updated_at
  before update on public.rental_agreements
  for each row execute function extensions.moddatetime(updated_at);

create index idx_rental_agreements_nurse    on public.rental_agreements (nurse_id);
create index idx_rental_agreements_landlord on public.rental_agreements (landlord_id);
create index idx_rental_agreements_listing  on public.rental_agreements (listing_id);
create index idx_rental_agreements_status   on public.rental_agreements (status);


-- ---------------------------------------------------------------------------
-- 7. NURSE DOCUMENTS — The Passport (Credential Vault)
-- ---------------------------------------------------------------------------
-- The Passport is the most defensible feature of the platform.
-- It stores a nurse's licenses, certifications, and key documents in one place,
-- enabling one-click credentialing when applying to jobs.
-- Free tier: limited number of document slots.
-- Paid tier: unlimited documents and active contract storage.

create table public.nurse_documents (
  id                  uuid primary key default gen_random_uuid(),
  nurse_id            uuid not null references public.nurses on delete cascade,
  document_type       public.document_type not null,
  file_name           text not null,
  storage_path        text not null,
  -- Supabase storage bucket path for the file
  issuing_state       text,
  -- state that issued the license (for license documents)
  license_number      text,
  -- license number (for license documents)
  issued_at           date,
  expires_at          date,
  verification_status public.verification_status not null default 'unverified',
  is_active           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.nurse_documents is
  'The Passport — nurse credential vault. Enables one-click credentialing. Freemium: limited slots on free tier, unlimited on paid tier.';

create trigger handle_nurse_documents_updated_at
  before update on public.nurse_documents
  for each row execute function extensions.moddatetime(updated_at);

create index idx_nurse_documents_nurse  on public.nurse_documents (nurse_id);
create index idx_nurse_documents_type   on public.nurse_documents (document_type);
create index idx_nurse_documents_expiry on public.nurse_documents (expires_at) where expires_at is not null;


-- ---------------------------------------------------------------------------
-- 8. NURSE VETTING — Recruiting-as-a-Service Pipeline
-- ---------------------------------------------------------------------------
-- After an employer approves a Smart Match, this table tracks the nurse
-- through the automated vetting pipeline. The entire flow is headless —
-- once the employer clicks Approve, the system handles everything:
-- sends the discovery email, collects form responses, records the video
-- interview, and runs AI scoring. No manual steps required.
-- This feature is gated behind facility is_premium_subscriber = true.

create table public.nurse_vetting (
  id                uuid primary key default gen_random_uuid(),
  nurse_id          uuid not null references public.nurses on delete cascade,
  facility_id       uuid not null references public.facilities on delete cascade,
  application_id    uuid references public.applications on delete set null,
  vetting_stage     public.vetting_stage not null default 'discovery_email',
  discovery_answers jsonb default '{}'::jsonb,
  -- nurse's responses to the employer's custom discovery form
  video_bucket_path text,
  -- Supabase storage path: /interviews/{facility_id}/{nurse_id}/
  ai_fit_score      numeric(5,2),
  -- 0–100 fit score generated by Claude AI analysis
  ai_summary        text,
  -- Claude's plain-English summary of the nurse's fit for this role
  ai_flags          jsonb default '[]'::jsonb,
  -- specific red flags or concerns identified by AI
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (nurse_id, facility_id)
  -- one vetting record per nurse per employer
);

comment on table public.nurse_vetting is
  'Automated RaaS vetting pipeline. Headless after employer approves match. Stages: discovery email → video interview → AI scoring. Gated behind facility premium subscription.';

create trigger handle_nurse_vetting_updated_at
  before update on public.nurse_vetting
  for each row execute function extensions.moddatetime(updated_at);

create index idx_nurse_vetting_nurse    on public.nurse_vetting (nurse_id);
create index idx_nurse_vetting_facility on public.nurse_vetting (facility_id);
create index idx_nurse_vetting_stage    on public.nurse_vetting (vetting_stage);


-- ---------------------------------------------------------------------------
-- 9. CONTRACTS TABLE — Confirmed Direct Hire (1.5% Success Fee)
-- ---------------------------------------------------------------------------
-- This table is created only when a nurse is formally hired through RNTell.
-- It is the monetization trigger for the 1.5% nurse-side success fee.
-- This is NOT the contract analysis tool. Do not confuse these two tables.
-- contract_analyses = public analysis tool, anonymous-safe, no fee
-- contracts         = confirmed hire record, always linked to nurse + facility, triggers fee

create table public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  nurse_id            uuid not null references public.nurses on delete restrict,
  facility_id         uuid not null references public.facilities on delete restrict,
  application_id      uuid references public.applications on delete set null,
  specialty           text,
  start_date          date,
  end_date            date,
  contract_weeks      smallint,
  total_compensation  numeric(12,2),
  -- total package value (rate + stipends × weeks)
  hourly_rate         numeric(8,2),
  success_fee_pct     numeric(5,2) default 1.50,
  -- 1.5% success fee charged to the nurse
  success_fee_amount  numeric(10,2),
  -- dollar amount computed at contract creation
  success_fee_paid    boolean not null default false,
  stripe_payment_id   text,
  is_direct_hire      boolean not null default true,
  status              text not null default 'active'
                      check (status in ('active','completed','cancelled','disputed')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.contracts is
  'Confirmed direct-hire contracts. Triggers the 1.5% nurse success fee. Always has nurse_id + facility_id. Not the same as contract_analyses.';

create trigger handle_contracts_updated_at
  before update on public.contracts
  for each row execute function extensions.moddatetime(updated_at);

create index idx_contracts_nurse    on public.contracts (nurse_id);
create index idx_contracts_facility on public.contracts (facility_id);
create index idx_contracts_status   on public.contracts (status);


-- ---------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY — ALL NEW TABLES
-- ---------------------------------------------------------------------------

alter table public.contract_analyses  enable row level security;
alter table public.landlords          enable row level security;
alter table public.rental_listings    enable row level security;
alter table public.rental_agreements  enable row level security;
alter table public.nurse_documents    enable row level security;
alter table public.nurse_vetting      enable row level security;
alter table public.contracts          enable row level security;

-- ---- CONTRACT ANALYSES ----
-- Public read and insert: no account required to analyze a contract
create policy "Contract analyses are publicly readable"
  on public.contract_analyses for select using (true);

create policy "Anyone can submit a contract analysis"
  on public.contract_analyses for insert
  with check (true);

create policy "Nurses can update own analyses after signup"
  on public.contract_analyses for update
  using (auth.uid() = nurse_id)
  with check (auth.uid() = nurse_id);

-- ---- LANDLORDS ----
create policy "Landlord profiles are viewable by everyone"
  on public.landlords for select using (true);

create policy "Landlords can update own record"
  on public.landlords for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Landlords can insert own record"
  on public.landlords for insert
  with check (auth.uid() = id);

-- ---- RENTAL LISTINGS ----
-- All listings publicly readable. UI layer handles suppression of marketing fields
-- for unclaimed listings (is_claimed = false). Do not enforce this at RLS level.
create policy "Rental listings are viewable by everyone"
  on public.rental_listings for select using (true);

create policy "Landlords can manage own listings"
  on public.rental_listings for all
  using (auth.uid() = landlord_id)
  with check (auth.uid() = landlord_id);

-- ---- RENTAL AGREEMENTS ----
create policy "Nurses can view own rental agreements"
  on public.rental_agreements for select
  using (auth.uid() = nurse_id);

create policy "Landlords can view their rental agreements"
  on public.rental_agreements for select
  using (auth.uid() = landlord_id);

create policy "Nurses can create rental agreements"
  on public.rental_agreements for insert
  with check (auth.uid() = nurse_id);

create policy "Landlords and nurses can update agreements"
  on public.rental_agreements for update
  using (auth.uid() = nurse_id or auth.uid() = landlord_id);

-- ---- NURSE DOCUMENTS (The Passport) ----
create policy "Nurses can manage own documents"
  on public.nurse_documents for all
  using (auth.uid() = nurse_id)
  with check (auth.uid() = nurse_id);

create policy "Verified documents viewable by facilities"
  on public.nurse_documents for select
  using (
    verification_status = 'verified'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'facility'
    )
  );

-- ---- NURSE VETTING ----
create policy "Nurses can view own vetting records"
  on public.nurse_vetting for select
  using (auth.uid() = nurse_id);

create policy "Facilities can view their vetting pipeline"
  on public.nurse_vetting for select
  using (auth.uid() = facility_id);

create policy "System can insert vetting records"
  on public.nurse_vetting for insert
  with check (auth.uid() = nurse_id or auth.uid() = facility_id);

create policy "Facilities can update vetting stage"
  on public.nurse_vetting for update
  using (auth.uid() = facility_id);

-- ---- CONTRACTS ----
create policy "Nurses can view own contracts"
  on public.contracts for select
  using (auth.uid() = nurse_id);

create policy "Facilities can view their contracts"
  on public.contracts for select
  using (auth.uid() = facility_id);

create policy "Contracts inserted by facility"
  on public.contracts for insert
  with check (auth.uid() = facility_id);

-- ---- FACILITY REVIEWS (account-gated — freemium) ----
-- Override the existing public read policy from 20240101_full_schema.sql
-- Reviews are generated on the platform by logged-in nurses who worked at a facility.
-- Anonymous users cannot read reviews — this is a freemium acquisition hook.
drop policy if exists "Facility reviews are viewable by everyone" on public.facility_reviews;

create policy "Facility reviews require account to view"
  on public.facility_reviews for select
  using (auth.uid() is not null);

-- ---- NEGOTIATION LEVERS (account-gated — freemium) ----
-- Override the existing public read policy from 20240101_full_schema.sql
-- Negotiation levers are a platform-generated feature, not just raw data.
-- Anonymous users cannot view them — this is a core freemium hook.
drop policy if exists "Negotiation levers are viewable by everyone" on public.negotiation_levers;

create policy "Negotiation levers require account to view"
  on public.negotiation_levers for select
  using (auth.uid() is not null);
