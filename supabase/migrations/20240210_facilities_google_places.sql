-- =============================================================================
-- Add Google Places fields to facilities
-- =============================================================================

alter table public.facilities
  add column if not exists google_place_id text,
  add column if not exists website text,
  add column if not exists location_address text;

-- Unique constraint: one facility per Google Place ID
create unique index if not exists facilities_google_place_id_unique
  on public.facilities (google_place_id)
  where google_place_id is not null;
