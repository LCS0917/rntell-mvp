"""
scraper/base_scraper.py
-----------------------
Abstract base class that every site-specific scraper must extend.

Contract:
    1. Override `source_name` and `source_url` class attributes.
    2. Implement `scrape() -> list[NormalizedJob]`.
    3. Optionally override `extract_from_json_ld()` — the default implementation
       handles standard Schema.org JobPosting JSON-LD automatically.

The base class provides:
    - Playwright browser management (shared context)
    - JSON-LD extraction (tried first, HTML parsing is fallback)
    - Structured logging
    - Retry decorator (tenacity)
    - Rate-limiting between requests
"""

from __future__ import annotations

import asyncio
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import extruct
import structlog
from asyncio_throttle import Throttler
from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    async_playwright,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import (
    MAX_RETRIES,
    PLAYWRIGHT_HEADLESS,
    REQUEST_DELAY_SECONDS,
)
from models import NormalizedJob

log = structlog.get_logger()


class ScraperError(Exception):
    """Raised when a scraper encounters a non-retryable error."""


class BaseScraper(ABC):
    """
    Abstract base for all RNTell job scrapers.

    Usage:
        class MyHospitalScraper(BaseScraper):
            source_name = "My Hospital Careers"
            source_type = "hospital_careers"

            async def scrape(self) -> list[NormalizedJob]:
                page = await self.new_page()
                await page.goto("https://myhospital.org/careers")
                ...
    """

    # Subclasses must define these
    source_name: str = ""
    source_type: str = "hospital_careers"

    def __init__(self) -> None:
        self._log = log.bind(scraper=self.source_name)
        self._throttler = Throttler(rate_limit=1, period=REQUEST_DELAY_SECONDS)
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self.errors: list[dict[str, str]] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @abstractmethod
    async def scrape(self) -> list[NormalizedJob]:
        """
        Entry point.  Return a list of NormalizedJob objects.
        Use self.new_page() to open pages.
        Use self.extract_json_ld(html) to try JSON-LD first.
        """
        ...

    async def run(self) -> list[NormalizedJob]:
        """Manages browser lifecycle and calls scrape()."""
        async with async_playwright() as pw:
            self._browser = await pw.chromium.launch(headless=PLAYWRIGHT_HEADLESS)
            self._context = await self._browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (compatible; RNTellBot/1.0; "
                    "+https://rntell.com/bot)"
                ),
                extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
            )
            try:
                jobs = await self.scrape()
                self._log.info("scrape_complete", jobs_found=len(jobs))
                return jobs
            except Exception as exc:
                self._log.error("scrape_failed", error=str(exc))
                self.record_error("scrape", str(exc))
                return []
            finally:
                await self._context.close()
                await self._browser.close()

    # ------------------------------------------------------------------
    # Browser helpers
    # ------------------------------------------------------------------

    async def new_page(self) -> Page:
        """Opens a new browser tab in the shared context."""
        if self._context is None:
            raise ScraperError("Browser context not initialized. Call run() instead.")
        return await self._context.new_page()

    async def goto(self, page: Page, url: str, **kwargs: Any) -> None:
        """Navigate with rate-limiting and retry."""
        async with self._throttler:
            await self._goto_with_retry(page, url, **kwargs)

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        reraise=True,
    )
    async def _goto_with_retry(self, page: Page, url: str, **kwargs: Any) -> None:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000, **kwargs)

    # ------------------------------------------------------------------
    # JSON-LD extraction (try this before HTML parsing)
    # ------------------------------------------------------------------

    def extract_json_ld(self, html: str, base_url: str = "") -> list[dict]:
        """
        Parse all Schema.org JobPosting objects from JSON-LD in an HTML page.

        Returns a list of raw dicts. Pass each to json_ld_to_normalized_job().
        Returns [] if none found — fall through to HTML parsing.
        """
        try:
            data = extruct.extract(
                html,
                base_url=base_url,
                syntaxes=["json-ld"],
                uniform=True,
            )
            postings = [
                item
                for item in data.get("json-ld", [])
                if item.get("@type") in ("JobPosting", "schema:JobPosting")
            ]
            self._log.debug("json_ld_found", count=len(postings), url=base_url)
            return postings
        except Exception as exc:
            self._log.warning("json_ld_parse_error", error=str(exc), url=base_url)
            return []

    def json_ld_to_normalized_job(
        self,
        posting: dict,
        source_url: str,
        facility_name: str,
        facility_state: Optional[str] = None,
        facility_city: Optional[str] = None,
        facility_zip: Optional[str] = None,
    ) -> Optional[NormalizedJob]:
        """
        Convert a Schema.org JobPosting JSON-LD dict to a NormalizedJob.
        Returns None if required fields are missing.
        """
        try:
            title = posting.get("title", "")
            description = posting.get("description", "")
            if not title:
                return None

            # Pay
            pay_hourly = None
            base_salary = posting.get("baseSalary", {})
            if isinstance(base_salary, dict):
                value = base_salary.get("value", {})
                if isinstance(value, dict):
                    if base_salary.get("unitText", "").upper() == "HOUR":
                        pay_hourly = _to_float(value.get("value") or value.get("minValue"))

            # Dates
            start_date = _parse_date(posting.get("jobStartDate") or posting.get("validThrough"))

            # Requirements from description
            requirements = _extract_requirements(description)

            # Specialty from title/description
            specialty = _infer_specialty(title + " " + description)

            # Shift type
            shift_type = _infer_shift_type(posting.get("employmentType", "") + " " + title)

            # Contract weeks
            contract_weeks = _infer_contract_weeks(description)

            # Location override from JSON-LD
            location = posting.get("jobLocation", {})
            if isinstance(location, dict):
                address = location.get("address", {})
                if isinstance(address, dict):
                    facility_city = facility_city or address.get("addressLocality")
                    facility_state = facility_state or address.get("addressRegion")
                    facility_zip = facility_zip or address.get("postalCode")
                    hirerorg = posting.get("hiringOrganization", {})
                    if isinstance(hirerorg, dict):
                        facility_name = hirerorg.get("name", facility_name)

            return NormalizedJob(
                source_url=source_url,
                facility_name=facility_name,
                facility_city=facility_city,
                facility_state=facility_state,
                facility_zip=facility_zip,
                title=title,
                specialty=specialty,
                shift_type=shift_type,
                pay_rate_hourly=pay_hourly,
                contract_weeks=contract_weeks,
                start_date=start_date,
                description=_strip_html(description)[:5000],
                requirements=requirements,
            )
        except Exception as exc:
            self._log.warning("json_ld_convert_error", error=str(exc), url=source_url)
            return None

    # ------------------------------------------------------------------
    # Error tracking
    # ------------------------------------------------------------------

    def record_error(self, url: str, message: str) -> None:
        self.errors.append({"url": url, "message": message})
        self._log.warning("scrape_error", url=url, error=message)


# ---------------------------------------------------------------------------
# Shared parsing utilities (used by base class and subclasses)
# ---------------------------------------------------------------------------

_SHIFT_KEYWORDS: dict[str, str] = {
    "night": "night",
    "noc": "night",
    "nights": "night",
    "day": "day",
    "days": "day",
    "rotating": "rotating",
    "prn": "prn",
    "per diem": "per_diem",
    "travel": "travel",
}

_SPECIALTY_KEYWORDS: list[tuple[str, str]] = [
    ("icu", "ICU"),
    ("intensive care", "ICU"),
    ("critical care", "ICU"),
    ("nicu", "NICU"),
    ("picu", "PICU"),
    ("emergency", "ER"),
    (" er ", "ER"),
    ("med/surg", "Med/Surg"),
    ("med surg", "Med/Surg"),
    ("telemetry", "Telemetry"),
    ("tele ", "Telemetry"),
    ("labor", "L&D"),
    ("l&d", "L&D"),
    ("operating room", "OR"),
    (" or ", "OR"),
    ("step-down", "Step-down"),
    ("stepdown", "Step-down"),
    ("psych", "Psych"),
    ("behavioral health", "Psych"),
    ("rehab", "Rehab"),
    ("home health", "Home Health"),
]

_CONTRACT_WEEK_PATTERN = re.compile(r"(\d+)[- ]?week", re.IGNORECASE)
_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
_REQUIREMENT_PATTERN = re.compile(
    r"\b(BLS|ACLS|PALS|TNCC|NRP|CCRN|CEN|RN|BSN|years? (of )?experience)\b",
    re.IGNORECASE,
)


def _to_float(val: Any) -> Optional[float]:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _parse_date(val: Any) -> Optional[datetime.date]:
    if not val:
        return None
    from dateutil import parser as dateutil_parser
    try:
        return dateutil_parser.parse(str(val)).date()
    except Exception:
        return None


def _strip_html(html: str) -> str:
    return _HTML_TAG_PATTERN.sub(" ", html).strip()


def _infer_specialty(text: str) -> str:
    lower = text.lower()
    for keyword, specialty in _SPECIALTY_KEYWORDS:
        if keyword in lower:
            return specialty
    return "RN"  # Default fallback


def _infer_shift_type(text: str) -> Optional[str]:
    lower = text.lower()
    for keyword, shift in _SHIFT_KEYWORDS.items():
        if keyword in lower:
            return shift
    return None


def _infer_contract_weeks(text: str) -> Optional[int]:
    match = _CONTRACT_WEEK_PATTERN.search(text)
    if match:
        return int(match.group(1))
    return None


def _extract_requirements(text: str) -> list[str]:
    clean = _strip_html(text)
    found = set(m.group(0).upper() for m in _REQUIREMENT_PATTERN.finditer(clean))
    return sorted(found)
