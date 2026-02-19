# RNTell Scraper — Setup Instructions

## Prerequisites
- Python 3.11+
- The project's `.env.local` must have `SUPABASE_SERVICE_ROLE_KEY` set
  (the scraper needs the service role key to bypass RLS when writing)

## 1. Install Python dependencies

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

## 2. Add env vars to .env.local

```bash
# Already present (used by Next.js):
NEXT_PUBLIC_SUPABASE_URL=https://mcwhelgpzummhjhebquw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Add these:
SUPABASE_SERVICE_ROLE_KEY=...       # From Supabase Dashboard > Settings > API
SCRAPER_PYTHON_PATH=/full/path/to/scraper/.venv/bin/python3
                                    # Must be absolute path to venv Python

# Optional tuning (defaults shown):
SCRAPER_STALE_JOB_DAYS=7
SCRAPER_REQUEST_DELAY=2.0
SCRAPER_MAX_RETRIES=3
SCRAPER_HEADLESS=true
SCRAPER_FACILITY_MATCH_THRESHOLD=88
```

## 3. Run the DB migration

```bash
supabase db push
# Or apply manually:
# psql $DATABASE_URL < supabase/migrations/20240209_facilities_decouple_and_scraper.sql
```

## 4. Test the scraper locally

```bash
cd scraper
source .venv/bin/activate
python runner.py --source_type hospital_careers --state CA
```

## 5. Trigger from admin dashboard

Send a POST request (or use the admin UI button):

```bash
curl -X POST http://localhost:3000/api/admin/run-scraper \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-admin-session-cookie>" \
  -d '{"source_type": "hospital_careers", "state": "CA"}'
```

Response (202):
```json
{
  "scrape_job_id": "abc-123",
  "status": "queued",
  "message": "Scraper queued for hospital_careers (CA)."
}
```

Poll status:
```bash
curl http://localhost:3000/api/admin/scrape-jobs?id=abc-123
```

## 6. Add a new hospital scraper

Add a new entry to `scrapers/generic_hospital.py`'s `SITE_CONFIGS` dict:

```python
SITE_CONFIGS["MY_HOSPITAL"] = SiteConfig(
    name="My Hospital",
    state="TX",
    city="Austin",
    listing_url="https://myhospital.org/careers/nurses",
    job_link_selector=".job-listing a",
    job_link_keywords=["nurse", "rn", "travel"],
    max_jobs=50,
    description_selector=".job-content",
)
```

For sites with very custom ATS (Workday, Taleo, iCIMS), subclass `BaseScraper`
directly and override `scrape()` to handle their specific URL patterns.

## File structure

```
scraper/
├── requirements.txt          # Python dependencies
├── config.py                 # Env var loader
├── models.py                 # NormalizedJob Pydantic schema
├── base_scraper.py           # Abstract base class + JSON-LD extractor
├── runner.py                 # CLI entry point (spawned by Next.js)
├── scrapers/
│   ├── __init__.py
│   └── generic_hospital.py   # Generic hospital career page scraper
└── utils/
    ├── facility_matcher.py   # Fuzzy facility dedup + creation
    └── ingest.py             # Supabase write pipeline
```

## Production deployment

On Vercel or similar, the scraper subprocess approach won't work (serverless
has no persistent process support). Use one of:

1. **Railway / Render sidecar**: Deploy the `scraper/` directory as a separate
   Python service. Expose a POST endpoint that runs `runner.py`. The Next.js
   app calls that service instead of spawning a subprocess.

2. **Supabase Edge Function + cron**: Use a Supabase Edge Function triggered
   by pg_cron to call an external scraper API.

3. **GitHub Actions cron**: Add a workflow that runs `runner.py` on a schedule
   and commits nothing — just updates the DB directly.

The recommended path for this MVP stage is option 3 (lowest ops overhead).
