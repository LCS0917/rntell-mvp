-- =============================================================================
-- Rename agency_gap_detected → margin_risk_detected
-- Aligns DB with the "Recruiterless Utility" model terminology.
-- =============================================================================

alter table public.salary_reports
  rename column agency_gap_detected to margin_risk_detected;

comment on column public.salary_reports.margin_risk_detected is
  'True if weekly gross < GSA benchmark — flags a "High Margin Risk" offer.';
