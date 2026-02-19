"""
scraper/tests/test_facility_matcher.py
---------------------------------------
Unit tests for facility name normalization and fuzzy matching logic.
Run with: pytest tests/test_facility_matcher.py
"""

import pytest
from utils.facility_matcher import normalize_facility_name


class TestNormalizeFacilityName:
    @pytest.mark.parametrize("raw,expected", [
        ("UCLA Medical Center", "ucla"),
        ("Memorial Regional Medical Center", "regional"),
        ("St. Mary's Hospital", "mary's"),
        ("Kaiser Permanente", "kaiser permanente"),
        ("Cedars-Sinai Medical Center", "cedars-sinai"),
        ("Houston Methodist Hospital", "houston methodist"),
        ("Johns Hopkins Hospital", "johns hopkins"),
        # Noise word only → empty string (edge case)
        ("Hospital", ""),
    ])
    def test_normalization(self, raw: str, expected: str):
        result = normalize_facility_name(raw)
        assert result == expected
