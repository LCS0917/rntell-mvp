"""
scraper/scrapers/generic_hospital.py
--------------------------------------
GenericHospitalScraper
~~~~~~~~~~~~~~~~~~~~~~~
A production-ready scraper for single hospital career pages.

Strategy:
    1. Load the careers/jobs listing page via Playwright
    2. For each job listing link on the page:
       a. Try to extract a Schema.org JobPosting JSON-LD block
       b. Fall back to structured HTML parsing if no JSON-LD found
    3. Return list[NormalizedJob]

This scraper is intentionally generic — configure it with a dict of
CSS selectors that match the target site. See SITE_CONFIGS below for
examples.  For sites with custom ATS (Workday, Taleo, etc.) you should
subclass and override _parse_detail_page().

Usage:
    scraper = GenericHospitalScraper(config=SITE_CONFIGS["UCLA_HEALTH"])
    jobs = await scraper.run()
"""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urljoin

import structlog
from playwright.async_api import Page

from base_scraper import BaseScraper, _infer_specialty, _infer_shift_type, _infer_contract_weeks, _parse_date, _strip_html, _to_float
from models import NormalizedJob

log = structlog.get_logger()


# ---------------------------------------------------------------------------
# Site configuration
# ---------------------------------------------------------------------------

class SiteConfig:
    """
    Describes how to navigate and parse a specific hospital career site.
    All CSS selectors are optional — the scraper falls back gracefully.
    """
    def __init__(
        self,
        *,
        name: str,
        state: str,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        listing_url: str,
        # CSS selector for individual job listing links on the listing page
        job_link_selector: str = "a[href]",
        # Keyword filter: only follow links whose text/href contains these
        job_link_keywords: Optional[list[str]] = None,
        # Max jobs to scrape per run (safety limit)
        max_jobs: int = 50,
        # CSS selectors for detail page HTML fallback
        title_selector: str = "h1",
        description_selector: str = ".job-description, .job-details, main",
        # Pagination: selector for "next page" link, or None for single page
        next_page_selector: Optional[str] = None,
        # Wait for this selector before parsing (SPA sites)
        wait_for_selector: Optional[str] = None,
    ) -> None:
        self.name = name
        self.state = state
        self.city = city
        self.zip_code = zip_code
        self.listing_url = listing_url
        self.job_link_selector = job_link_selector
        self.job_link_keywords = job_link_keywords or ["nurse", "rn ", "registered nurse", "travel"]
        self.max_jobs = max_jobs
        self.title_selector = title_selector
        self.description_selector = description_selector
        self.next_page_selector = next_page_selector
        self.wait_for_selector = wait_for_selector


# Example site configurations.
# Replace these with real hospital career URLs before running.
SITE_CONFIGS: dict[str, SiteConfig] = {
    "UCLA_HEALTH": SiteConfig(
        name="UCLA Health",
        state="CA",
        city="Los Angeles",
        zip_code="90095",
        listing_url="https://careers.uclahealth.org/jobs/?keyword=registered+nurse&location=",
        job_link_selector=".job-title a, .search-result-job-title a",
        job_link_keywords=["registered nurse", "rn", "travel"],
        max_jobs=40,
        description_selector=".job-description",
        wait_for_selector=".search-result-job-title",
    ),
    "KAISER_PERMANENTE": SiteConfig(
        name="Kaiser Permanente",
        state="CA",
        city="Oakland",
        listing_url="https://jobs.kaiserpermanente.org/search-jobs/registered%20nurse",
        job_link_selector="a.job-title-link",
        job_link_keywords=["registered nurse", "rn", "travel nurse"],
        max_jobs=40,
        description_selector="#job-description",
    ),
    "MAYO_CLINIC": SiteConfig(
        name="Mayo Clinic",
        state="MN",
        city="Rochester",
        listing_url="https://jobs.mayoclinic.org/search/?q=travel+registered+nurse",
        job_link_selector=".job-title a",
        max_jobs=30,
        description_selector=".job-detail",
    ),
    # Add more site configs here as you expand coverage
}


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

class GenericHospitalScraper(BaseScraper):
    """
    Generic hospital career page scraper.
    Instantiate with a SiteConfig for the target hospital.
    """

    source_type = "hospital_careers"

    def __init__(self, config: SiteConfig) -> None:
        super().__init__()
        self.config = config
        self.source_name = config.name
        self._log = log.bind(scraper=self.source_name, state=config.state)

    async def scrape(self) -> list[NormalizedJob]:
        """
        Main entry point. Returns list of NormalizedJob.
        """
        jobs: list[NormalizedJob] = []
        listing_page = await self.new_page()

        try:
            await self.goto(listing_page, self.config.listing_url)

            if self.config.wait_for_selector:
                try:
                    await listing_page.wait_for_selector(
                        self.config.wait_for_selector, timeout=10_000
                    )
                except Exception:
                    self._log.warning("wait_for_selector_timeout",
                                      selector=self.config.wait_for_selector)

            job_urls = await self._collect_job_urls(listing_page)
            self._log.info("job_urls_found", count=len(job_urls))

            for url in job_urls[:self.config.max_jobs]:
                job = await self._scrape_detail(url)
                if job:
                    jobs.append(job)

        except Exception as exc:
            self.record_error(self.config.listing_url, str(exc))
        finally:
            await listing_page.close()

        return jobs

    # ------------------------------------------------------------------
    # URL collection
    # ------------------------------------------------------------------

    async def _collect_job_urls(self, page: Page) -> list[str]:
        """Extract job detail URLs from the listing page."""
        base = self.config.listing_url
        urls: list[str] = []

        links = await page.query_selector_all(self.config.job_link_selector)
        for link in links:
            href = await link.get_attribute("href")
            text = (await link.inner_text()).strip().lower()
            if not href:
                continue
            full_url = urljoin(base, href)
            # Filter to nurse/RN related links
            combined = text + " " + href.lower()
            if any(kw in combined for kw in self.config.job_link_keywords):
                if full_url not in urls:
                    urls.append(full_url)

        # Handle pagination
        if self.config.next_page_selector and len(urls) < self.config.max_jobs:
            next_link = await page.query_selector(self.config.next_page_selector)
            if next_link:
                next_href = await next_link.get_attribute("href")
                if next_href:
                    next_url = urljoin(base, next_href)
                    await self.goto(page, next_url)
                    more = await self._collect_job_urls(page)
                    urls.extend(url for url in more if url not in urls)

        return urls

    # ------------------------------------------------------------------
    # Detail page parsing
    # ------------------------------------------------------------------

    async def _scrape_detail(self, url: str) -> Optional[NormalizedJob]:
        """
        Open a job detail page and extract a NormalizedJob.
        Tries JSON-LD first, then falls back to HTML parsing.
        """
        detail_page = await self.new_page()
        try:
            await self.goto(detail_page, url)
            html = await detail_page.content()

            # --- Attempt 1: JSON-LD ---
            json_ld_blocks = self.extract_json_ld(html, base_url=url)
            if json_ld_blocks:
                job = self.json_ld_to_normalized_job(
                    json_ld_blocks[0],
                    source_url=url,
                    facility_name=self.config.name,
                    facility_state=self.config.state,
                    facility_city=self.config.city,
                    facility_zip=self.config.zip_code,
                )
                if job:
                    self._log.debug("parsed_via_json_ld", url=url)
                    return job

            # --- Attempt 2: HTML fallback ---
            job = await self._parse_html_detail(detail_page, url, html)
            if job:
                self._log.debug("parsed_via_html", url=url)
            return job

        except Exception as exc:
            self.record_error(url, str(exc))
            return None
        finally:
            await detail_page.close()

    async def _parse_html_detail(
        self, page: Page, url: str, html: str
    ) -> Optional[NormalizedJob]:
        """
        Structured HTML parsing for sites without JSON-LD.
        Tries common CSS selectors + regex patterns.
        """
        # Title
        title_el = await page.query_selector(self.config.title_selector)
        title = (await title_el.inner_text()).strip() if title_el else ""
        if not title:
            title = await page.title()
        if not title:
            return None

        # Description block
        desc_el = await page.query_selector(self.config.description_selector)
        description = ""
        if desc_el:
            description = _strip_html(await desc_el.inner_html())[:5000]

        # Specialty from title + description
        specialty = _infer_specialty(title + " " + description)

        # Shift type
        shift_type = _infer_shift_type(title + " " + description)

        # Contract weeks
        contract_weeks = _infer_contract_weeks(description)

        # Pay rate — look for "$XX/hr" or "$XX per hour" patterns
        pay_hourly = _extract_pay_rate(description)

        # Stipends
        housing = _extract_stipend(description, "housing")
        meals = _extract_stipend(description, "meals")

        # Start date
        start_date = _extract_start_date(description)

        # Requirements
        from base_scraper import _extract_requirements
        requirements = _extract_requirements(description)

        return NormalizedJob(
            source_url=url,
            facility_name=self.config.name,
            facility_state=self.config.state,
            facility_city=self.config.city,
            facility_zip=self.config.zip_code,
            title=title,
            specialty=specialty,
            shift_type=shift_type,
            pay_rate_hourly=pay_hourly,
            stipend_housing=housing,
            stipend_meals=meals,
            contract_weeks=contract_weeks,
            start_date=start_date,
            description=description,
            requirements=requirements,
        )


# ---------------------------------------------------------------------------
# HTML pay/stipend extraction helpers
# ---------------------------------------------------------------------------

_PAY_PATTERN = re.compile(
    r"\$\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:/\s*hr|per\s+hour|/hour)",
    re.IGNORECASE,
)
_HOUSING_PATTERN = re.compile(
    r"housing\s+stipend[:\s]+\$?\s*(\d{3,5}(?:\.\d{1,2})?)",
    re.IGNORECASE,
)
_MEALS_PATTERN = re.compile(
    r"(?:meal|m&ie|per\s+diem)\s+stipend[:\s]+\$?\s*(\d{2,4}(?:\.\d{1,2})?)",
    re.IGNORECASE,
)
_DATE_PATTERN = re.compile(
    r"start\s*(?:date)?[:\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})",
    re.IGNORECASE,
)


def _extract_pay_rate(text: str) -> Optional[float]:
    m = _PAY_PATTERN.search(text)
    return float(m.group(1)) if m else None


def _extract_stipend(text: str, kind: str) -> Optional[float]:
    pattern = _HOUSING_PATTERN if kind == "housing" else _MEALS_PATTERN
    m = pattern.search(text)
    return float(m.group(1)) if m else None


def _extract_start_date(text: str):
    m = _DATE_PATTERN.search(text)
    if m:
        return _parse_date(m.group(1))
    return None
