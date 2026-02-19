-- =============================================================================
-- RNTell: Seed data for scraped job listings
-- Creates 8 unclaimed facilities + 15 scraped job postings
-- =============================================================================

-- Step 1: Create auth users for seed facilities (using Supabase admin API format)
-- We'll insert directly into profiles + facilities since these are "scraped" entries.
-- These facilities have NO auth.users row — they are unclaimed, data_source='scraped'.

-- Generate deterministic UUIDs for seed facilities
-- Facility 1: Memorial Regional Medical Center (FL)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'facility', 'memorial-regional@seed.rntell.com', 'Memorial Regional Medical Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Memorial Regional Medical Center', 'Hollywood', 'FL', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 2: Cedars of Lebanon (TX)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000002', 'facility', 'cedars-lebanon@seed.rntell.com', 'Cedars of Lebanon Hospital')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000002', 'Cedars of Lebanon Hospital', 'San Antonio', 'TX', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 3: Pacific Northwest Medical (WA)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000003', 'facility', 'pnw-medical@seed.rntell.com', 'Pacific Northwest Medical Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000003', 'Pacific Northwest Medical Center', 'Seattle', 'WA', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 4: Sycamore Valley Hospital (CA)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000004', 'facility', 'sycamore-valley@seed.rntell.com', 'Sycamore Valley Hospital')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000004', 'Sycamore Valley Hospital', 'San Jose', 'CA', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 5: Great Plains Regional (NE)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000005', 'facility', 'great-plains@seed.rntell.com', 'Great Plains Regional Hospital')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000005', 'Great Plains Regional Hospital', 'Omaha', 'NE', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 6: Harbor View Medical (MA)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000006', 'facility', 'harbor-view@seed.rntell.com', 'Harbor View Medical Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000006', 'Harbor View Medical Center', 'Boston', 'MA', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 7: Summit Health (CO)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000007', 'facility', 'summit-health@seed.rntell.com', 'Summit Health System')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000007', 'Summit Health System', 'Denver', 'CO', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;

-- Facility 8: Magnolia General (GA)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('a0000000-0000-0000-0000-000000000008', 'facility', 'magnolia-general@seed.rntell.com', 'Magnolia General Hospital')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities (id, name, location_city, location_state, type, is_claimed, data_source)
VALUES ('a0000000-0000-0000-0000-000000000008', 'Magnolia General Hospital', 'Atlanta', 'GA', 'Hospital', false, 'scraped')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Step 2: Insert 15 scraped job postings
-- =============================================================================

-- Job 1: ICU - FL - Night - 13wk - $2,650/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Travel RN - ICU',
  'ICU', 'night', 58.00, 476.00, 182.00, 2746.00,
  13, (CURRENT_DATE + INTERVAL '14 days')::date,
  '["BLS", "ACLS", "2yr ICU exp"]',
  'Level II Trauma Center seeking experienced ICU nurses. High-acuity patient population with 1:2 nurse-to-patient ratio. 36-bed unit with state-of-the-art monitoring systems.',
  true, 3, 'scraped'
);

-- Job 2: ER - TX - Rotating - 13wk - $2,400/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Travel RN - Emergency Department',
  'ER', 'rotating', 52.00, 490.00, 168.00, 2530.00,
  13, (CURRENT_DATE + INTERVAL '7 days')::date,
  '["BLS", "ACLS", "TNCC", "1yr ER exp"]',
  'Fast-paced 45-bed ED with Level I trauma designation. Annual volume 85,000+ visits. Strong team culture with dedicated charge nurses.',
  true, 2, 'scraped'
);

-- Job 3: L&D - WA - Day - 13wk - $2,300/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Travel RN - Labor & Delivery',
  'L&D', 'day', 50.00, 525.00, 175.00, 2500.00,
  13, (CURRENT_DATE + INTERVAL '30 days')::date,
  '["BLS", "NRP", "Fetal Monitoring", "2yr L&D exp"]',
  'Beautiful birthing center averaging 250 deliveries per month. Private birthing suites with tub options. Supportive midwifery team.',
  true, 2, 'scraped'
);

-- Job 4: Med-Surg - CA - Night - 8wk - $2,100/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Travel RN - Med/Surg',
  'Med-Surg', 'night', 48.00, 280.00, 92.00, 2100.00,
  8, (CURRENT_DATE + INTERVAL '5 days')::date,
  '["BLS", "1yr Med-Surg exp"]',
  'Fast-track opportunity on a 32-bed medical surgical unit. 1:5 ratio. Magnet-designated facility. Beautiful Bay Area location with great weather.',
  true, 4, 'scraped'
);

-- Job 5: NICU - NE - Day - 13wk - $2,500/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'Travel RN - NICU Level III',
  'NICU', 'day', 56.00, 350.00, 134.00, 2500.00,
  13, (CURRENT_DATE + INTERVAL '21 days')::date,
  '["BLS", "NRP", "STABLE", "2yr NICU exp"]',
  'Level III NICU with 40 beds. Excellent transport team. Strong physician collaboration. Low cost of living area with affordable housing.',
  true, 1, 'scraped'
);

-- Job 6: ICU - MA - Day - 13wk - $2,800/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'Travel RN - Cardiac ICU',
  'ICU', 'day', 62.00, 504.00, 164.00, 2800.00,
  13, (CURRENT_DATE + INTERVAL '45 days')::date,
  '["BLS", "ACLS", "CCRN preferred", "3yr ICU exp"]',
  'Premier cardiac ICU at a nationally ranked academic medical center. Open-heart recovery, LVAD management, and ECMO experience a plus. Teaching hospital environment.',
  true, 2, 'scraped'
);

-- Job 7: ER - CO - Night - 13wk - $2,350/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000007',
  'Travel RN - Emergency Room',
  'ER', 'night', 50.00, 462.00, 188.00, 2450.00,
  13, (CURRENT_DATE + INTERVAL '10 days')::date,
  '["BLS", "ACLS", "PALS", "2yr ER exp"]',
  'Community hospital ED with annual volume of 55,000. Great work-life balance with no mandatory overtime. Denver metro area with easy mountain access.',
  true, 3, 'scraped'
);

-- Job 8: Med-Surg - GA - Rotating - 13wk - $1,950/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000008',
  'Travel RN - Medical Surgical Oncology',
  'Med-Surg', 'rotating', 44.00, 266.00, 100.00, 1950.00,
  13, (CURRENT_DATE + INTERVAL '3 days')::date,
  '["BLS", "Chemo/Bio certified", "1yr Med-Surg exp"]',
  'Oncology-focused med-surg unit. 24 beds. Chemo administration experience preferred. Supportive educator and strong onboarding for travel nurses.',
  true, 2, 'scraped'
);

-- Job 9: L&D - FL - Night - 8wk - $2,200/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Travel RN - L&D / Antepartum',
  'L&D', 'night', 48.00, 476.00, 148.00, 2352.00,
  8, (CURRENT_DATE + INTERVAL '18 days')::date,
  '["BLS", "NRP", "Fetal Monitoring", "1yr L&D exp"]',
  'Combined L&D and antepartum unit. High-risk OB population. Perinatologist on-site 24/7. 300+ deliveries per month.',
  true, 1, 'scraped'
);

-- Job 10: NICU - TX - Rotating - 13wk - $2,600/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Travel RN - NICU Level IV',
  'NICU', 'rotating', 58.00, 490.00, 122.00, 2700.00,
  13, (CURRENT_DATE + INTERVAL '35 days')::date,
  '["BLS", "NRP", "STABLE", "3yr NICU exp", "Level III/IV exp"]',
  'Highest-level NICU in the region. 60-bed unit with surgical capabilities. ECMO and cooling therapy experience preferred. Children''s hospital setting.',
  true, 2, 'scraped'
);

-- Job 11: ICU - CA - Day - 26wk - $2,750/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Travel RN - Neuro ICU (Extended)',
  'ICU', 'day', 60.00, 560.00, 130.00, 2850.00,
  26, (CURRENT_DATE + INTERVAL '28 days')::date,
  '["BLS", "ACLS", "NIH Stroke Scale", "2yr ICU exp"]',
  'Extended contract opportunity in our 20-bed Neuro ICU. Stroke center of excellence. EVD management, ICP monitoring. Extension bonus available.',
  true, 1, 'scraped'
);

-- Job 12: ER - GA - PRN - 13wk - $2,200/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000008',
  'Travel RN - ER Float Pool',
  'ER', 'prn', 55.00, 266.00, 100.00, 2346.00,
  13, (CURRENT_DATE + INTERVAL '7 days')::date,
  '["BLS", "ACLS", "PALS", "2yr ER exp", "Float experience"]',
  'PRN float pool covering 3 ED campuses in the metro area. Flexible scheduling with guaranteed 36hrs/week. Mileage reimbursement between campuses.',
  true, 4, 'scraped'
);

-- Job 13: Med-Surg - WA - Day - 13wk - $2,050/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Travel RN - Progressive Care / Med-Surg',
  'Med-Surg', 'day', 46.00, 350.00, 44.00, 2050.00,
  13, (CURRENT_DATE + INTERVAL '60 days')::date,
  '["BLS", "ACLS", "1yr Tele/Med-Surg exp"]',
  'Step-down/progressive care unit accepting travel nurses. Telemetry monitoring required. Beautiful Pacific Northwest location. Hospital provides free parking.',
  true, 2, 'scraped'
);

-- Job 14: NICU - CO - Night - 8wk - $2,400/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000007',
  'Travel RN - NICU',
  'NICU', 'night', 54.00, 350.00, 106.00, 2400.00,
  8, (CURRENT_DATE + INTERVAL '12 days')::date,
  '["BLS", "NRP", "2yr NICU exp"]',
  'Community NICU with 18 beds. Level II designation. Primarily feeder-grower population with occasional higher acuity. Excellent preceptorship program.',
  true, 1, 'scraped'
);

-- Job 15: L&D - MA - Rotating - 13wk - $2,150/wk
INSERT INTO public.job_postings (facility_id, title, specialty, shift_type, pay_rate_hourly, stipend_housing, stipend_meals, pay_package_total, contract_weeks, start_date, requirements, description, is_active, slots_available, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'Travel RN - Mother/Baby & L&D',
  'L&D', 'rotating', 48.00, 378.00, 100.00, 2206.00,
  13, (CURRENT_DATE + INTERVAL '42 days')::date,
  '["BLS", "NRP", "Fetal Monitoring", "1yr L&D or Mother/Baby exp"]',
  'Combined L&D and postpartum role. 200 deliveries per month. CLC certification appreciated but not required. Shared governance model with strong nurse voice.',
  true, 2, 'scraped'
);
