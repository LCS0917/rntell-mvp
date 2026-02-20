-- Add enrichment columns to job_postings for Gemini-extracted data
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS hours_per_week smallint,
  ADD COLUMN IF NOT EXISTS experience_required text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

COMMENT ON COLUMN public.job_postings.hours_per_week IS 'Weekly hours (36, 40, 48, etc.) — extracted by Gemini from job posting page';
COMMENT ON COLUMN public.job_postings.experience_required IS 'Experience requirement text (e.g. "2 years ICU experience") — extracted by Gemini';
COMMENT ON COLUMN public.job_postings.enriched_at IS 'Timestamp of last Gemini enrichment run for this posting';
