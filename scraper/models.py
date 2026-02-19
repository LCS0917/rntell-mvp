"""
scraper/models.py
-----------------
Pydantic models that define the normalized job schema.
Every scraper must return a list of NormalizedJob objects.
The ingest pipeline then maps these to Supabase rows.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


ShiftType = Literal["day", "night", "rotating", "prn", "travel", "per_diem"]
DataSource = Literal["scraped", "imported", "self_reported"]


class NormalizedJob(BaseModel):
    """
    Canonical schema for a scraped job posting.
    All scrapers must produce this shape before writing to Supabase.
    """

    # ------------------------------------------------------------------
    # Identity / dedup
    # ------------------------------------------------------------------
    source_url: str = Field(..., description="Canonical URL of the original posting")
    source_hash: str = Field(
        default="",
        description="SHA-256 of normalized content fields. Auto-computed if empty.",
    )

    # ------------------------------------------------------------------
    # Facility context (resolved by FacilityMatcher before DB write)
    # ------------------------------------------------------------------
    facility_name: str
    facility_city: Optional[str] = None
    facility_state: Optional[str] = None
    facility_zip: Optional[str] = None

    # Populated by FacilityMatcher — do not set in scrapers
    facility_id: Optional[str] = None

    # ------------------------------------------------------------------
    # Job fields (map directly to job_postings columns)
    # ------------------------------------------------------------------
    title: str
    specialty: str
    shift_type: Optional[ShiftType] = None
    pay_rate_hourly: Optional[float] = None
    stipend_housing: Optional[float] = None
    stipend_meals: Optional[float] = None
    travel_reimbursement: Optional[float] = None
    contract_weeks: Optional[int] = None
    start_date: Optional[date] = None
    description: Optional[str] = None
    requirements: list[str] = Field(default_factory=list)
    slots_available: int = 1
    data_source: DataSource = "scraped"

    # ------------------------------------------------------------------
    # Scraper metadata
    # ------------------------------------------------------------------
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)

    # ------------------------------------------------------------------
    # Computed fields
    # ------------------------------------------------------------------
    @model_validator(mode="after")
    def compute_hash(self) -> "NormalizedJob":
        if not self.source_hash:
            # Hash the content fields that matter for change detection
            payload = json.dumps(
                {
                    "title": self.title,
                    "specialty": self.specialty,
                    "shift_type": self.shift_type,
                    "pay_rate_hourly": self.pay_rate_hourly,
                    "stipend_housing": self.stipend_housing,
                    "stipend_meals": self.stipend_meals,
                    "contract_weeks": self.contract_weeks,
                    "start_date": self.start_date.isoformat() if self.start_date else None,
                    "description": (self.description or "")[:2000],
                },
                sort_keys=True,
            )
            self.source_hash = hashlib.sha256(payload.encode()).hexdigest()
        return self

    @field_validator("facility_state", mode="before")
    @classmethod
    def normalize_state(cls, v: Optional[str]) -> Optional[str]:
        """Uppercase 2-letter state codes."""
        if v and len(v) == 2:
            return v.upper()
        return v

    @field_validator("specialty", mode="before")
    @classmethod
    def normalize_specialty(cls, v: str) -> str:
        return _normalize_specialty(v)

    @property
    def weekly_package(self) -> Optional[float]:
        if self.pay_rate_hourly is None:
            return None
        hourly = self.pay_rate_hourly * 36
        housing = self.stipend_housing or 0
        meals = self.stipend_meals or 0
        return round(hourly + housing + meals, 2)


class FacilityRecord(BaseModel):
    """Minimal facility data extracted by a scraper."""
    name: str
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_zip: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    data_source: DataSource = "scraped"
    is_claimed: bool = False


# ---------------------------------------------------------------------------
# Specialty normalization helper
# ---------------------------------------------------------------------------

_SPECIALTY_MAP: dict[str, str] = {
    # ICU variants
    "icu": "ICU",
    "intensive care": "ICU",
    "critical care": "ICU",
    "micu": "ICU",
    "sicu": "ICU",
    "cvicu": "ICU",
    "nicu": "NICU",
    "picu": "PICU",
    # ER variants
    "er": "ER",
    "ed": "ER",
    "emergency": "ER",
    "emergency room": "ER",
    "emergency department": "ER",
    # Med/Surg
    "med/surg": "Med/Surg",
    "med surg": "Med/Surg",
    "medical surgical": "Med/Surg",
    "medsurg": "Med/Surg",
    # OR
    "or": "OR",
    "operating room": "OR",
    "perioperative": "OR",
    # L&D
    "l&d": "L&D",
    "labor and delivery": "L&D",
    "labor & delivery": "L&D",
    "obstetrics": "L&D",
    "ob": "L&D",
    # Telemetry
    "tele": "Telemetry",
    "telemetry": "Telemetry",
    "cardiac telemetry": "Telemetry",
    # Step-down
    "stepdown": "Step-down",
    "step-down": "Step-down",
    "step down": "Step-down",
    "intermediate care": "Step-down",
    # Psych
    "psych": "Psych",
    "psychiatric": "Psych",
    "behavioral health": "Psych",
    # Rehab
    "rehab": "Rehab",
    "rehabilitation": "Rehab",
    "ltach": "Rehab",
    # Home Health
    "home health": "Home Health",
    "home care": "Home Health",
}


def _normalize_specialty(raw: str) -> str:
    key = raw.strip().lower()
    return _SPECIALTY_MAP.get(key, raw.strip())
