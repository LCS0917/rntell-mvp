-- =============================================================================
-- RNTell: Add facility_city to contract_analyses
-- Needed for GSA per diem rate lookup by city + state
-- =============================================================================

alter table public.contract_analyses
  add column if not exists facility_city text;

create index idx_contract_analyses_city on public.contract_analyses (facility_city);
