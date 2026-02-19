-- =============================================================================
-- Add ATS detection fields to facilities
-- =============================================================================

alter table public.facilities
  add column if not exists careers_url text,
  add column if not exists ats_type text;
  -- ats_type values: workday, greenhouse, lever, icims, smartrecruiters, unknown, none
