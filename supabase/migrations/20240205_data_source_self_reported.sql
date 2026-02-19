-- =============================================================================
-- RNTell: Update data_source default to 'self_reported'
-- /supabase/migrations/20240205_data_source_self_reported.sql
--
-- Changes default from 'direct' to 'self_reported' and migrates existing rows
-- Values: self_reported | scraped | imported
-- =============================================================================

-- Update existing 'direct' rows to 'self_reported'
update public.job_postings set data_source = 'self_reported' where data_source = 'direct';

-- Change the default going forward
alter table public.job_postings alter column data_source set default 'self_reported';
