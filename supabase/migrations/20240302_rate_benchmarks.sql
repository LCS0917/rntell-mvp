-- rate_benchmarks: Prepopulated market rate data for SmartRN and other features.
-- Provides reliable fallback when nurse-submitted salary_reports are sparse.

create table public.rate_benchmarks (
  id                  uuid primary key default gen_random_uuid(),
  specialty           text not null,
  location_state      text not null,
  shift_type          text,
  hourly_rate_low     numeric(8,2) not null,
  hourly_rate_mid     numeric(8,2) not null,
  hourly_rate_high    numeric(8,2) not null,
  stipend_housing_avg numeric(8,2) not null,
  stipend_meals_avg   numeric(8,2) not null,
  weekly_package_low  numeric(10,2) not null,
  weekly_package_mid  numeric(10,2) not null,
  weekly_package_high numeric(10,2) not null,
  sample_note         text,
  updated_at          timestamptz not null default now(),
  unique(specialty, location_state, shift_type)
);

alter table public.rate_benchmarks enable row level security;
create policy "Anyone can read benchmarks"
  on public.rate_benchmarks for select using (true);
