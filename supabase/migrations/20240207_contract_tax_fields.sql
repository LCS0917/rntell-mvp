-- ---------------------------------------------------------------------------
-- Migration 20240207: Expand contract_analyses for tax compliance data
-- ---------------------------------------------------------------------------
-- Adds Layer 1 (taxable income), Layer 2 (stipend expansion), Layer 3
-- (contract metadata), and Layer 4 (user tax context) columns to the
-- existing contract_analyses table. No RLS changes.
-- ---------------------------------------------------------------------------

-- Layer 1 — Taxable Income
alter table public.contract_analyses
  add column overtime_rate numeric(8,2),
  add column doubletime_rate numeric(8,2),
  add column oncall_rate numeric(8,2),
  add column callback_rate numeric(8,2),
  add column bonus_signon numeric(10,2),
  add column bonus_completion numeric(10,2),
  add column bonus_retention numeric(10,2),
  add column bonus_taxable_week text;

-- Layer 2 — Stipend expansion
-- stipend_housing, stipend_meals, travel_reimbursement already exist
alter table public.contract_analyses
  add column reimbursement_type text,
  add column stipend_optimization_gap jsonb;

-- Layer 3 — Contract metadata expansion
-- start_date, contract_weeks already exist
alter table public.contract_analyses
  add column facility_zip_code text,
  add column contract_end_date date,
  add column contracted_hours_per_week smallint;

-- Layer 4 — User tax context (collected via follow-up form)
alter table public.contract_analyses
  add column user_tax_context jsonb;

-- Derived audit risk score (0–100)
alter table public.contract_analyses
  add column audit_risk_score smallint;

comment on column public.contract_analyses.overtime_rate is 'OT hourly rate (1.5x base if not explicit)';
comment on column public.contract_analyses.doubletime_rate is 'DT hourly rate (2x base if not explicit)';
comment on column public.contract_analyses.reimbursement_type is 'reimbursement or bonus — determines taxability of travel reimbursement';
comment on column public.contract_analyses.stipend_optimization_gap is '{ housing_gap, meals_gap } — delta between GSA max and reported stipend';
comment on column public.contract_analyses.facility_zip_code is 'Required for GSA rate fetch and distance-to-tax-home calculation';
comment on column public.contract_analyses.contracted_hours_per_week is 'Flag if != 36 or 40 — may indicate inflated weekly gross basis';
comment on column public.contract_analyses.user_tax_context is '{ tax_home_zip, tax_home_monthly_expense, metro_months_last_24 }';
comment on column public.contract_analyses.audit_risk_score is 'Composite 0–100 audit risk score derived from all four data layers';
