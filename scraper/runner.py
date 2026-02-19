"""
scraper/runner.py
-----------------
Orchestrator called by the Next.js admin endpoint.

Receives arguments via CLI:
    python runner.py --source_type hospital_careers --state CA --scrape_job_id <uuid>

Steps:
    1. Connect to Supabase (service role)
    2. Mark scrape_job as "running"
    3. Select and run the appropriate scraper
    4. Ingest results via JobIngestor
    5. Deactivate stale jobs
    6. Mark scrape_job as "complete" or "failed"
    7. Exit with code 0 (success) or 1 (failure)

The Next.js API route spawns this as a subprocess so the HTTP request
is non-blocking. Progress is recorded in the scrape_jobs table.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone

import structlog
from supabase import acreate_client

import config as cfg
from scrapers.generic_hospital import GenericHospitalScraper, SITE_CONFIGS, SiteConfig
from utils.ingest import JobIngestor

log = structlog.get_logger()


# ---------------------------------------------------------------------------
# Scraper registry
# ---------------------------------------------------------------------------
# Maps source_type → list of SiteConfigs to run for that type.
# When a state filter is provided, only configs matching that state are run.

SCRAPER_REGISTRY: dict[str, list[SiteConfig]] = {
    "hospital_careers": list(SITE_CONFIGS.values()),
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(
    source_type: str,
    state: str | None,
    scrape_job_id: str | None,
) -> None:
    _log = log.bind(
        source_type=source_type,
        state=state,
        scrape_job_id=scrape_job_id,
    )

    # Use service role key to bypass RLS
    sb = await acreate_client(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_KEY)

    # Mark scrape_job as running
    if scrape_job_id:
        await sb.table("scrape_jobs").update({
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", scrape_job_id).execute()

    configs = SCRAPER_REGISTRY.get(source_type, [])
    if state:
        configs = [c for c in configs if c.state.upper() == state.upper()]

    if not configs:
        _log.error("no_scrapers_found", source_type=source_type, state=state)
        await _finalize(sb, scrape_job_id, "failed", {}, errors=[{
            "url": "",
            "message": f"No scrapers registered for source_type={source_type} state={state}",
        }])
        sys.exit(1)

    _log.info("scrapers_to_run", count=len(configs))

    ingestor = JobIngestor(sb)
    total_created = 0
    total_updated = 0
    total_facilities = 0
    total_skipped = 0
    total_deactivated = 0
    all_errors: list[dict] = []

    for site_config in configs:
        _log.info("scraper_start", name=site_config.name)
        scraper = GenericHospitalScraper(site_config)
        try:
            jobs = await scraper.run()
            result = await ingestor.ingest(jobs)
            total_created += result.records_created
            total_updated += result.records_updated
            total_facilities += result.facilities_created
            total_skipped += result.duplicates_skipped
            all_errors.extend(result.errors)
            all_errors.extend(scraper.errors)
            _log.info(
                "scraper_done",
                name=site_config.name,
                created=result.records_created,
                updated=result.records_updated,
                skipped=result.duplicates_skipped,
            )
        except Exception as exc:
            _log.error("scraper_exception", name=site_config.name, error=str(exc))
            all_errors.append({"url": site_config.listing_url, "message": str(exc)})

    # Deactivate stale jobs across all scraped sources
    total_deactivated = await ingestor.deactivate_stale(source_type)

    counts = {
        "records_created": total_created,
        "records_updated": total_updated,
        "facilities_created": total_facilities,
        "duplicates_skipped": total_skipped,
        "jobs_deactivated": total_deactivated,
    }

    final_status = "failed" if all_errors and total_created == 0 else "complete"
    await _finalize(sb, scrape_job_id, final_status, counts, errors=all_errors)

    _log.info("run_complete", **counts, status=final_status)
    sys.exit(0 if final_status == "complete" else 1)


async def _finalize(
    sb,
    scrape_job_id: str | None,
    status: str,
    counts: dict,
    errors: list[dict],
) -> None:
    if not scrape_job_id:
        return
    update_payload = {
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "errors": errors,
        **counts,
    }
    await sb.table("scrape_jobs").update(update_payload).eq("id", scrape_job_id).execute()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RNTell job scraper runner")
    parser.add_argument("--source_type", required=True, help="Scraper type key")
    parser.add_argument("--state", default=None, help="Optional 2-letter state filter")
    parser.add_argument(
        "--scrape_job_id", default=None, help="scrape_jobs.id to update with progress"
    )
    args = parser.parse_args()

    asyncio.run(
        main(
            source_type=args.source_type,
            state=args.state,
            scrape_job_id=args.scrape_job_id,
        )
    )
