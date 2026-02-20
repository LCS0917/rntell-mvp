# Plan: Fix Scraper + Enrich Job Data with Gemini + Upgrade Matching

## Problem Summary
1. **Scraper**: Times out on Vercel (60s limit), processes facilities sequentially. 60-70% of source_urls don't point to actual job posts.
2. **Thin data**: Scraper only saves title, specialty, location, URL, description, shift_type. No pay, no hours, no contract length, no certifications, no experience requirements.
3. **Weak matching**: Only scores on 4 factors (specialty, license state, preferred states, start date). Can't score by pay, hours, contract length, certs.

---

## Step 1: DB Migration — add `hours_per_week` and `experience_required`

Add to `job_postings`:
- `hours_per_week SMALLINT` (36, 40, 48, etc.)
- `experience_required TEXT` (e.g. "2 years ICU experience")
- `enriched_at TIMESTAMPTZ` (tracks when Gemini enrichment ran)

The `requirements` JSONB column already exists for certifications. No new column needed.

**File:** New migration `supabase/migrations/20240215_job_enrichment_columns.sql`

---

## Step 2: Fix Scraper Reliability

**File:** `src/app/api/admin/scrape-jobs/run/route.ts`

- **Parallel batching**: Process 5 facilities concurrently (replace sequential `for` loop with `Promise.all` batches)
- **URL validation**: After building `source_url`, HEAD-check it (2s timeout). Skip URLs returning non-200 or redirecting to generic careers pages
- **maxDuration → 120s**
- **Limit**: Cap at 20 facilities per run (same as discover step)

---

## Step 3: Gemini Enrichment (new API route)

**New file:** `src/app/api/admin/scrape-jobs/enrich/route.ts`

Separate admin step that runs AFTER scraping:

1. Query `job_postings` where `data_source = 'scraped'` AND `enriched_at IS NULL` AND `source_url IS NOT NULL`
2. For each job (5 in parallel):
   a. Fetch the `source_url` page (3s timeout)
   b. Strip HTML to text, truncate to ~4000 chars
   c. Send to **Gemini 2.5 Flash** with structured extraction prompt
   d. UPDATE `job_postings` with extracted fields
3. Return summary

**Gemini extracts → DB columns:**
- `pay_rate_hourly`, `pay_package_total`, `stipend_housing`, `stipend_meals`
- `contract_weeks`, `hours_per_week`, `shift_type`, `start_date`
- `requirements` (JSON array: ["BLS", "ACLS", "2yr ICU exp"])
- `experience_required` (text)
- `description` (cleaned, up to 500 chars)

**Env:** Add `GEMINI_API_KEY` to `.env.local` + Vercel

---

## Step 4: Upgrade Smart Match Scorer

**File:** `src/app/actions/jobs.ts` — `scoreJobMatch()`

New 100-point scoring:
- **Specialty match: 30 pts** (was 40)
- **License state: 20 pts** (was 30)
- **Preferred states: 10 pts** (was 20)
- **Pay ranking: 20 pts** — higher-paying jobs score higher (top quartile = 20, top half = 10)
- **Contract weeks: 10 pts** — 13-week standard gets bonus (most sought)
- **Start date: 10 pts** — within 30 days

---

## Step 5: Display Richer Data

### JobCard.tsx — add tags:
- Hours/week pill (e.g. "36 hrs/wk")
- Top 2 requirement pills (e.g. "BLS", "ACLS")

### JobDetailClient.tsx — add:
- Hours/week in tags row
- Experience required text below requirements
- Pay breakdown uses actual `hours_per_week` instead of hardcoded ×36

### Types + queries — add `hours_per_week` and `experience_required` to all SELECT queries and TS types

---

## Step 6: Admin UI — "Enrich with AI" Button

**File:** `src/app/admin/scraper/ScraperClient.tsx`

Add collapsible "Step 3: Enrich Jobs with AI" section with enrich button and results display.

---

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/20240215_job_enrichment_columns.sql` | NEW |
| `.env.local` | ADD `GEMINI_API_KEY` |
| `src/app/api/admin/scrape-jobs/run/route.ts` | EDIT — parallel + validation |
| `src/app/api/admin/scrape-jobs/enrich/route.ts` | NEW — Gemini enrichment |
| `src/app/actions/jobs.ts` | EDIT — types, queries, scorer |
| `src/components/jobs/JobCard.tsx` | EDIT — show hours, certs |
| `src/app/jobs/[id]/JobDetailClient.tsx` | EDIT — hours, experience |
| `src/app/admin/scraper/ScraperClient.tsx` | EDIT — enrich step |
