"""
scraper/utils/ingest.py
-----------------------
Database ingest pipeline. Takes NormalizedJob objects and writes them to
Supabase with full deduplication and change-detection logic.

Deduplication strategy:
    1. Primary key: source_url (unique index on job_postings)
    2. Change detection: source_hash comparison
       - hash unchanged → update last_seen_at only
       - hash changed   → update all content fields + hash
    3. Stale job cleanup: marks is_active = false for jobs whose
       last_seen_at is older than STALE_JOB_DAYS

Returns an IngestResult with counts for the scrape_jobs audit log.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import structlog
from supabase import AsyncClient

from config import STALE_JOB_DAYS
from models import NormalizedJob
from utils.facility_matcher import FacilityMatcher

log = structlog.get_logger()


@dataclass
class IngestResult:
    records_created: int = 0
    records_updated: int = 0
    duplicates_skipped: int = 0
    facilities_created: int = 0
    jobs_deactivated: int = 0
    errors: list[dict] = field(default_factory=list)


class JobIngestor:
    """
    Writes normalized jobs to Supabase. Uses service-role client to bypass RLS.
    """

    def __init__(self, supabase: AsyncClient) -> None:
        self._sb = supabase
        self._matcher = FacilityMatcher(supabase)
        self._log = log.bind(component="JobIngestor")

    async def ingest(self, jobs: list[NormalizedJob]) -> IngestResult:
        """
        Process a list of NormalizedJob objects.
        Returns IngestResult with per-category counts.
        """
        result = IngestResult()

        if not jobs:
            return result

        # Pre-load facility cache once
        await self._matcher.load()
        facilities_before = len(self._matcher._cache)

        for job in jobs:
            try:
                await self._process_one(job, result)
            except Exception as exc:
                self._log.error("ingest_error", url=job.source_url, error=str(exc))
                result.errors.append({"url": job.source_url, "message": str(exc)})

        result.facilities_created = len(self._matcher._cache) - facilities_before
        return result

    async def deactivate_stale(self, source_name: str) -> int:
        """
        Mark as inactive any jobs from source_name whose last_seen_at
        is older than STALE_JOB_DAYS. Returns count of deactivated rows.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_JOB_DAYS)
        # We identify "scraped" rows by source_url not being null
        resp = (
            await self._sb.table("job_postings")
            .update({"is_active": False})
            .eq("is_active", True)
            .not_.is_("source_url", "null")
            .lt("last_seen_at", cutoff.isoformat())
            .execute()
        )
        count = len(resp.data or [])
        self._log.info("stale_jobs_deactivated", count=count, cutoff=cutoff.isoformat())
        return count

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _process_one(self, job: NormalizedJob, result: IngestResult) -> None:
        # 1. Resolve facility
        facility_record = _job_to_facility_record(job)
        facility_id = await self._matcher.get_or_create(facility_record)
        job.facility_id = facility_id

        # 2. Check for existing row by source_url
        existing = await self._fetch_existing(job.source_url)

        if existing is None:
            # New job
            await self._insert(job)
            result.records_created += 1
            self._log.debug("job_created", url=job.source_url)
            return

        # 3. Compare hashes
        if existing["source_hash"] == job.source_hash:
            # No change — just touch last_seen_at
            await self._touch(existing["id"])
            result.duplicates_skipped += 1
            return

        # 4. Content changed — full update
        await self._update(existing["id"], job)
        result.records_updated += 1
        self._log.info("job_updated", url=job.source_url)

    async def _fetch_existing(self, source_url: str) -> dict | None:
        resp = (
            await self._sb.table("job_postings")
            .select("id, source_hash")
            .eq("source_url", source_url)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None

    async def _insert(self, job: NormalizedJob) -> None:
        payload = _job_to_db_payload(job)
        await self._sb.table("job_postings").insert(payload).execute()

    async def _update(self, job_id: str, job: NormalizedJob) -> None:
        payload = _job_to_db_payload(job)
        # Don't change facility_id or scraped_at on update
        payload.pop("facility_id", None)
        payload.pop("scraped_at", None)
        await (
            self._sb.table("job_postings")
            .update(payload)
            .eq("id", job_id)
            .execute()
        )

    async def _touch(self, job_id: str) -> None:
        await (
            self._sb.table("job_postings")
            .update({"last_seen_at": datetime.utcnow().isoformat()})
            .eq("id", job_id)
            .execute()
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _job_to_db_payload(job: NormalizedJob) -> dict:
    """Map NormalizedJob fields to job_postings column names."""
    payload: dict = {
        "facility_id": job.facility_id,
        "title": job.title,
        "specialty": job.specialty,
        "data_source": job.data_source,
        "is_active": True,
        "slots_available": job.slots_available,
        "source_url": job.source_url,
        "source_hash": job.source_hash,
        "scraped_at": job.scraped_at.isoformat(),
        "last_seen_at": job.last_seen_at.isoformat(),
    }
    if job.shift_type:
        payload["shift_type"] = job.shift_type
    if job.pay_rate_hourly is not None:
        payload["pay_rate_hourly"] = job.pay_rate_hourly
    if job.stipend_housing is not None:
        payload["stipend_housing"] = job.stipend_housing
    if job.stipend_meals is not None:
        payload["stipend_meals"] = job.stipend_meals
    if job.travel_reimbursement is not None:
        payload["travel_reimbursement"] = job.travel_reimbursement
    if job.contract_weeks is not None:
        payload["contract_weeks"] = job.contract_weeks
    if job.start_date is not None:
        payload["start_date"] = job.start_date.isoformat()
    if job.description:
        payload["description"] = job.description
    if job.requirements:
        payload["requirements"] = job.requirements
    # Compute pay_package_total if possible
    if job.weekly_package is not None:
        payload["pay_package_total"] = job.weekly_package
    return payload


def _job_to_facility_record(job: NormalizedJob):
    from models import FacilityRecord
    return FacilityRecord(
        name=job.facility_name,
        location_city=job.facility_city,
        location_state=job.facility_state,
        location_zip=job.facility_zip,
        data_source="scraped",
        is_claimed=False,
    )
