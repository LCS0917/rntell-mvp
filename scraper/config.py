"""
scraper/config.py
-----------------
Configuration loaded from the project's .env.local file.
All settings are typed and validated at import time.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load from the project root's .env.local (same file used by Next.js)
_env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(_env_path)


def _require(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise EnvironmentError(
            f"Required environment variable '{key}' is not set. "
            f"Check {_env_path}"
        )
    return val


# Supabase connection
SUPABASE_URL: str = _require("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY: str = _require("SUPABASE_SERVICE_ROLE_KEY")

# Scraper behavior
STALE_JOB_DAYS: int = int(os.getenv("SCRAPER_STALE_JOB_DAYS", "7"))
# Jobs not seen after this many days are marked inactive

REQUEST_DELAY_SECONDS: float = float(os.getenv("SCRAPER_REQUEST_DELAY", "2.0"))
# Polite delay between page requests

MAX_RETRIES: int = int(os.getenv("SCRAPER_MAX_RETRIES", "3"))
# Tenacity retry limit for network errors

PLAYWRIGHT_HEADLESS: bool = os.getenv("SCRAPER_HEADLESS", "true").lower() == "true"
# Set to false for debugging

# Facility dedup
FACILITY_MATCH_THRESHOLD: int = int(os.getenv("SCRAPER_FACILITY_MATCH_THRESHOLD", "88"))
# RapidFuzz score 0-100; above this = same facility
