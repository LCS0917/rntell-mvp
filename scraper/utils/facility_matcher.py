"""
scraper/utils/facility_matcher.py
----------------------------------
Matches scraped job postings to existing facility records in Supabase.

Matching algorithm (in order):
    1. Exact match: normalized_name + state
    2. Fuzzy match: normalized_name + state (RapidFuzz token_sort_ratio >= threshold)
    3. Fuzzy match: normalized_name + zip (if zip available)
    4. No match → create new facility row, return its id

All operations are async and use the Supabase service-role client
(bypasses RLS so we can read/write facilities freely).
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

import structlog
from rapidfuzz import fuzz
from supabase import AsyncClient

from config import FACILITY_MATCH_THRESHOLD
from models import FacilityRecord

log = structlog.get_logger()

# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------

_NOISE_WORDS = re.compile(
    r"\b(hospital|medical center|health system|healthcare|regional|"
    r"general|community|memorial|university|ucsd|ucsf|st\.|saint|"
    r"inc|llc|corp|center|health|system|network)\b",
    re.IGNORECASE,
)


def normalize_facility_name(name: str) -> str:
    """
    Normalize a facility name for fuzzy matching.
    Steps: lowercase → remove diacritics → remove noise words → collapse whitespace
    """
    name = name.lower()
    # Remove diacritics
    name = "".join(
        c for c in unicodedata.normalize("NFD", name) if unicodedata.category(c) != "Mn"
    )
    # Remove noise words
    name = _NOISE_WORDS.sub("", name)
    # Remove punctuation, collapse whitespace
    name = re.sub(r"[^a-z0-9\s]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


# ---------------------------------------------------------------------------
# FacilityMatcher
# ---------------------------------------------------------------------------


class FacilityMatcher:
    """
    Stateful facility matcher. Caches all DB facilities in memory for the
    duration of a single scrape run to avoid N+1 queries.
    """

    def __init__(self, supabase: AsyncClient) -> None:
        self._sb = supabase
        self._cache: list[dict] = []  # [{id, name, location_state, location_zip, _normalized}]
        self._loaded = False
        self._log = log.bind(component="FacilityMatcher")

    async def load(self) -> None:
        """Pre-load all facilities from DB into memory."""
        resp = (
            await self._sb.table("facilities")
            .select("id, name, location_state, location_zip")
            .execute()
        )
        self._cache = [
            {**row, "_normalized": normalize_facility_name(row["name"])}
            for row in (resp.data or [])
        ]
        self._loaded = True
        self._log.info("facilities_loaded", count=len(self._cache))

    async def get_or_create(self, record: FacilityRecord) -> str:
        """
        Returns the facility id for the given record.
        Creates a new DB row if no match is found.
        """
        if not self._loaded:
            await self.load()

        facility_id = self._match(record)
        if facility_id:
            self._log.debug(
                "facility_matched",
                name=record.name,
                facility_id=facility_id,
            )
            return facility_id

        # No match → create
        facility_id = await self._create(record)
        self._log.info(
            "facility_created",
            name=record.name,
            state=record.location_state,
            facility_id=facility_id,
        )
        return facility_id

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _match(self, record: FacilityRecord) -> Optional[str]:
        """Returns DB facility id if a match is found, else None."""
        norm = normalize_facility_name(record.name)
        state = (record.location_state or "").upper()
        zip_code = record.location_zip or ""

        best_score = 0
        best_id: Optional[str] = None

        for row in self._cache:
            row_state = (row.get("location_state") or "").upper()
            row_zip = row.get("location_zip") or ""

            # State must match (or one side is unknown)
            state_ok = not state or not row_state or state == row_state

            if not state_ok:
                # Try zip fallback
                if not zip_code or not row_zip or zip_code != row_zip:
                    continue

            score = fuzz.token_sort_ratio(norm, row["_normalized"])
            if score > best_score:
                best_score = score
                best_id = row["id"]

        if best_score >= FACILITY_MATCH_THRESHOLD:
            return best_id

        # Exact name match regardless of threshold (handles abbreviations)
        for row in self._cache:
            if normalize_facility_name(row["name"]) == norm:
                return row["id"]

        return None

    async def _create(self, record: FacilityRecord) -> str:
        """Insert a new facility row and return its id."""
        payload = {
            "name": record.name,
            "location_city": record.location_city,
            "location_state": record.location_state,
            "location_zip": record.location_zip,
            "website": record.website,
            "phone": record.phone,
            "is_claimed": False,
            "data_source": "scraped",
        }
        resp = (
            await self._sb.table("facilities")
            .insert(payload)
            .execute()
        )
        new_row = resp.data[0]
        # Add to local cache so subsequent jobs in this run match to it
        self._cache.append(
            {**new_row, "_normalized": normalize_facility_name(new_row["name"])}
        )
        return new_row["id"]
