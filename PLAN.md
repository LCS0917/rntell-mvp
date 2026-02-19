# Plan: Expand Contract Analyzer for Tax Compliance Data Collection

## Summary
Expand the existing anonymous contract analyzer (`/analyze`) to capture all four layers of tax compliance data. No auth changes — everything stays public/anonymous and lives on `contract_analyses`.

---

## 1. Database Migration (`supabase/migrations/20240207_contract_tax_fields.sql`)

Add columns to `contract_analyses` for Layer 1–3 fields not already present, plus a JSONB column for Layer 4 user context:

**Layer 1 — New columns:**
- `overtime_rate` numeric(8,2)
- `doubletime_rate` numeric(8,2)
- `oncall_rate` numeric(8,2)
- `callback_rate` numeric(8,2)
- `bonus_signon` numeric(10,2)
- `bonus_completion` numeric(10,2)
- `bonus_retention` numeric(10,2)
- `bonus_taxable_week` text — which week bonus is paid

**Layer 2 — New columns:**
- `reimbursement_type` text — 'reimbursement' | 'bonus' (not a DB enum, just text to keep it simple)
- `stipend_optimization_gap` jsonb — `{ housing_gap: number, meals_gap: number }` (derived after GSA lookup)

**Layer 3 — New columns:**
- `facility_zip_code` text
- `contract_end_date` date (start_date already exists)
- `contracted_hours_per_week` smallint

**Layer 4 — New column:**
- `user_tax_context` jsonb — `{ tax_home_zip, tax_home_monthly_expense, metro_months_last_24 }`

**Also:**
- `audit_risk_score` smallint — 0–100 composite score

No RLS changes. No new tables.

---

## 2. PDF Extraction Prompt Update (`src/app/actions/parsePdf.ts`)

Expand `EXTRACTION_PROMPT` and `ExtractedFields` type to ask Claude to also extract:
- `overtime_rate`, `doubletime_rate`, `oncall_rate`, `callback_rate`
- `bonus_signon`, `bonus_completion`, `bonus_retention`, `bonus_taxable_week`
- `reimbursement_type` (reimbursement vs bonus)
- `facility_zip_code`
- `contract_end_date`
- `contracted_hours_per_week`

Claude will calculate OT (1.5x) and DT (2x) from base if not explicit.

---

## 3. Types & Server Action Updates (`src/app/actions/analyze.ts`)

**`ContractInput`** — add all new Layer 1–3 fields.

**`AnalysisResult`** — add:
- All Layer 1–3 fields echoed back
- `stipend_optimization_gap` (housing_gap, meals_gap)
- `wage_recharacterization_risk` boolean (base < $25)
- `reimbursement_taxable` boolean (type === 'bonus')
- `hours_flag` text | null (if hours != 36 or 40)
- `audit_risk_score` number (0–100, calculated when tax context is present)
- `user_tax_context` (Layer 4 data, populated after follow-up form)

**`analyzeContract`** — expand computation:
- Calculate OT/DT from base if not provided
- Calculate `stipend_optimization_gap` = GSA max − reported
- Set `wage_recharacterization_risk` if base < $25
- Flag reimbursement as taxable if type = 'bonus'
- Flag contracted hours if not 36 or 40
- Save all new columns to DB

**New action: `saveAnalysisTaxContext`** — separate server action called after the follow-up form:
- Takes `{ analysisId, sessionId, taxContext }`
- Updates the existing `contract_analyses` row with `user_tax_context` JSONB
- Calculates and saves `audit_risk_score` (0–100)
- Returns the updated score + any new alerts

---

## 4. UI Changes (`src/app/analyze/AnalyzeClient.tsx`)

The flow becomes a 3-step wizard within the same client component:

### Step 1: Input (existing, expanded)
- **ContractForm** gets new fieldsets:
  - "Compensation" section expanded: add OT rate, DT rate, on-call, callback fields
  - New "Bonuses" subsection: sign-on, completion, retention amounts + taxable week
  - "Stipends" section: add reimbursement type dropdown (reimbursement/bonus)
  - "Contract Terms" section: add facility zip, end date, contracted hours/week
- PDF extraction auto-fills all new fields too

### Step 2: Results (existing, restructured)
- Replace the single comparison table with **three sections**:
  1. **Taxable Income** — base rate, OT, DT, on-call, callback, bonuses
  2. **Stipends** — housing + meals with GSA side-by-side comparison, green/yellow/red indicator per row, optimization gap shown
  3. **Contract Terms** — zip, dates, hours (with flag if non-standard)
- **Wage Recharacterization Alert** — prominent warning card if base < $25/hr
- **Reimbursement Taxability Alert** — warning if travel reimb classified as bonus
- Keep existing: bill rate card, CTA banner, GSA source footnote

### Step 3: Tax Context Form (new, inline after results)
- Shown below the results panel, before the CTA
- Collapsible section titled "Help us calculate your audit risk" with explanation
- Three fields:
  1. Permanent tax home zip code (text)
  2. Monthly tax home expenses ($) — with inline alert if $0
  3. Months in this metro area in last 24 months (number) — with inline alert if ≥10
- "Calculate Audit Risk" button → calls `saveAnalysisTaxContext`
- On success: renders **Audit Risk Score** card (0–100 gauge/bar) with score breakdown

### Audit Risk Score Components:
- Base rate < $25: +30 pts
- Tax home expenses = $0: +30 pts
- Either stipend > GSA max: +20 pts
- Metro time > 10 months: +20 pts

---

## 5. Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20240207_contract_tax_fields.sql` | **NEW** — add columns |
| `src/app/actions/parsePdf.ts` | Expand prompt + types |
| `src/app/actions/analyze.ts` | Expand types + computation + new `saveAnalysisTaxContext` action |
| `src/app/analyze/AnalyzeClient.tsx` | Expand form, restructure results, add tax context form + audit score |

---

## Not Changed
- PDF upload/parsing flow (just the extraction prompt)
- RLS policies
- Auth/session/claim flow
- `gsa.ts` (already returns what we need)
- `page.tsx` wrapper
