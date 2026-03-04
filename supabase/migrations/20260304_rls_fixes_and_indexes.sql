-- Fix CMS/Blog RLS admin policies to check profiles.role instead of
-- auth.users.raw_user_meta_data, consistent with the rest of the codebase.
-- Also adds missing DB indexes for common query patterns.

BEGIN;

-- -----------------------------------------------------------------------
-- 1. Fix CMS admin write policy
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "cms_pages_admin_write" ON cms_pages;
CREATE POLICY "cms_pages_admin_write" ON cms_pages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- -----------------------------------------------------------------------
-- 2. Fix Blog admin policy
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "blog_posts_admin_all" ON blog_posts;
CREATE POLICY "blog_posts_admin_all" ON blog_posts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- -----------------------------------------------------------------------
-- 3. Fix Generation queue admin policy
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "gen_queue_admin_all" ON blog_generation_queue;
CREATE POLICY "gen_queue_admin_all" ON blog_generation_queue FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- -----------------------------------------------------------------------
-- 4. Add missing job_alerts SELECT policy for admins
-- -----------------------------------------------------------------------
CREATE POLICY "Admins can read job alerts" ON public.job_alerts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- -----------------------------------------------------------------------
-- 5. Missing indexes for common query patterns
-- -----------------------------------------------------------------------

-- Blog
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published
  ON blog_posts (status, published_at DESC);

-- Job postings — filtered by specialty + active
CREATE INDEX IF NOT EXISTS idx_job_postings_specialty_active
  ON job_postings (specialty, is_active);

-- Applications — nurse dashboard + facility pipeline
CREATE INDEX IF NOT EXISTS idx_applications_nurse_status
  ON applications (nurse_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_job_status
  ON applications (job_id, status);

-- Contract analyses — admin dashboard sort
CREATE INDEX IF NOT EXISTS idx_contract_analyses_created
  ON contract_analyses (created_at DESC);

-- Salary reports — facility + specialty filter
CREATE INDEX IF NOT EXISTS idx_salary_reports_facility_specialty
  ON salary_reports (facility_id, specialty);

COMMIT;
