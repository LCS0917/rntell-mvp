"""
scraper/tests/test_models.py
-----------------------------
Unit tests for NormalizedJob schema, hash computation, and specialty normalization.
Run with: pytest tests/test_models.py
"""

import pytest
from datetime import date
from models import NormalizedJob, _normalize_specialty


class TestNormalizedJobHash:
    def test_hash_auto_computed(self):
        job = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test Hospital",
            title="Travel RN - ICU",
            specialty="ICU",
        )
        assert job.source_hash != ""
        assert len(job.source_hash) == 64  # SHA-256 hex

    def test_same_content_same_hash(self):
        job1 = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test Hospital",
            title="Travel RN - ICU",
            specialty="ICU",
            pay_rate_hourly=58.0,
        )
        job2 = NormalizedJob(
            source_url="https://example.com/job/2",  # Different URL
            facility_name="Other Hospital",          # Doesn't affect hash
            title="Travel RN - ICU",
            specialty="ICU",
            pay_rate_hourly=58.0,
        )
        assert job1.source_hash == job2.source_hash

    def test_different_pay_different_hash(self):
        job1 = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test Hospital",
            title="Travel RN - ICU",
            specialty="ICU",
            pay_rate_hourly=58.0,
        )
        job2 = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test Hospital",
            title="Travel RN - ICU",
            specialty="ICU",
            pay_rate_hourly=62.0,
        )
        assert job1.source_hash != job2.source_hash

    def test_explicit_hash_not_overwritten(self):
        job = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test Hospital",
            title="Travel RN",
            specialty="ICU",
            source_hash="myhash",
        )
        assert job.source_hash == "myhash"


class TestSpecialtyNormalization:
    @pytest.mark.parametrize("raw,expected", [
        ("icu", "ICU"),
        ("ICU", "ICU"),
        ("intensive care", "ICU"),
        ("critical care", "ICU"),
        ("emergency room", "ER"),
        ("Emergency Department", "ER"),
        ("med/surg", "Med/Surg"),
        ("Medical Surgical", "Med/Surg"),
        ("l&d", "L&D"),
        ("Labor and Delivery", "L&D"),
        ("telemetry", "Telemetry"),
        ("Tele", "Telemetry"),
        ("unknown specialty", "unknown specialty"),  # passthrough
    ])
    def test_normalize(self, raw: str, expected: str):
        assert _normalize_specialty(raw) == expected


class TestWeeklyPackage:
    def test_weekly_package_calculation(self):
        job = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test",
            title="Travel RN",
            specialty="ICU",
            pay_rate_hourly=58.0,
            stipend_housing=476.0,
            stipend_meals=182.0,
        )
        # 58 * 36 + 476 + 182 = 2088 + 476 + 182 = 2746
        assert job.weekly_package == 2746.0

    def test_weekly_package_none_without_hourly(self):
        job = NormalizedJob(
            source_url="https://example.com/job/1",
            facility_name="Test",
            title="Travel RN",
            specialty="ICU",
        )
        assert job.weekly_package is None
