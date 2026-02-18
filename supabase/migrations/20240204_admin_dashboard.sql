-- =============================================================================
-- RNTell: Admin Dashboard Schema Additions
-- /supabase/migrations/20240204_admin_dashboard.sql
--
-- Adds: admin_notes to facilities, data_source to job_postings
-- =============================================================================

-- Admin notes for facility management
alter table public.facilities
  add column if not exists admin_notes text;

-- Data source for job postings (scraped vs direct-posted)
alter table public.job_postings
  add column if not exists data_source text not null default 'direct';
  -- values: 'direct', 'scraped', 'imported'
