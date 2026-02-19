-- Add is_featured flag to job_postings
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Index for fast homepage query
CREATE INDEX IF NOT EXISTS idx_job_postings_featured
  ON job_postings (is_featured, is_active)
  WHERE is_featured = true AND is_active = true;
