"""
Unit tests for individual generators, PersonaBuilder, and BehaviourProfile.
"""

import sys
import os

# Ensure the package root is on sys.path so absolute imports resolve.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from datetime import date

import pytest

from generators.numeric import IntGenerator, FloatGenerator
from generators.temporal import DateGenerator
from generators.categorical import UUIDGenerator, EnumGenerator
from persona.builder import PersonaBuilder
from persona.behaviours import generate_behaviour, BehaviourProfile


# ---------------------------------------------------------------------------
# IntGenerator
# ---------------------------------------------------------------------------

class TestIntGenerator:
    def test_uniform_respects_min_max(self):
        """All 1000 values must lie within [lo, hi]."""
        lo, hi = 5, 50
        gen = IntGenerator({"min": lo, "max": hi})
        values = gen.generate(1000, seed=42)
        assert len(values) == 1000
        assert all(lo <= v <= hi for v in values), (
            f"Some values outside [{lo}, {hi}]: min={min(values)}, max={max(values)}"
        )

    def test_normal_respects_min_max(self):
        """Normal distribution is clipped; all values must be in [lo, hi]."""
        lo, hi = 10, 90
        gen = IntGenerator({"min": lo, "max": hi, "distribution": "normal"})
        values = gen.generate(1000, seed=7)
        assert all(lo <= v <= hi for v in values), (
            f"Some values outside [{lo}, {hi}]: min={min(values)}, max={max(values)}"
        )

    def test_returns_ints(self):
        gen = IntGenerator({"min": 0, "max": 100})
        values = gen.generate(100, seed=1)
        assert all(isinstance(v, int) for v in values)


# ---------------------------------------------------------------------------
# FloatGenerator
# ---------------------------------------------------------------------------

class TestFloatGenerator:
    def test_normal_distribution_mean(self):
        """
        With a normal distribution, the sample mean should be within ±20% of
        the specified mean across 1000 rows.
        """
        mean_target = 50.0
        gen = FloatGenerator({
            "min": 0.0,
            "max": 100.0,
            "distribution": "normal",
            "mean": mean_target,
            "std": 10.0,
        })
        values = gen.generate(1000, seed=42)
        sample_mean = sum(values) / len(values)
        tolerance = mean_target * 0.20  # ±20%
        assert abs(sample_mean - mean_target) <= tolerance, (
            f"Sample mean {sample_mean:.2f} is more than 20% from target {mean_target}"
        )

    def test_uniform_bounds(self):
        lo, hi = 0.0, 1.0
        gen = FloatGenerator({"min": lo, "max": hi})
        values = gen.generate(1000, seed=99)
        assert all(lo <= v <= hi for v in values)

    def test_returns_floats(self):
        gen = FloatGenerator({"min": 0.0, "max": 10.0})
        values = gen.generate(50, seed=3)
        assert all(isinstance(v, float) for v in values)


# ---------------------------------------------------------------------------
# DateGenerator
# ---------------------------------------------------------------------------

class TestDateGenerator:
    def test_dates_within_range(self):
        start = "2022-01-01"
        end = "2023-12-31"
        gen = DateGenerator({"start": start, "end": end})
        values = gen.generate(1000, seed=42)
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
        for v in values:
            d = date.fromisoformat(v)
            assert start_date <= d <= end_date, (
                f"Date {v} is outside [{start}, {end}]"
            )

    def test_default_format(self):
        """Dates should be in YYYY-MM-DD format by default."""
        gen = DateGenerator({"start": "2023-01-01", "end": "2023-12-31"})
        values = gen.generate(10, seed=0)
        for v in values:
            # Should parse without error
            date.fromisoformat(v)
            assert len(v) == 10


# ---------------------------------------------------------------------------
# UUIDGenerator
# ---------------------------------------------------------------------------

class TestUUIDGenerator:
    def test_all_unique(self):
        """1000 generated UUIDs should all be distinct."""
        gen = UUIDGenerator()
        values = gen.generate(1000, seed=42)
        assert len(values) == 1000
        assert len(set(values)) == 1000, "Duplicate UUIDs detected"

    def test_valid_uuid_format(self):
        import uuid
        gen = UUIDGenerator()
        values = gen.generate(10, seed=1)
        for v in values:
            # Should parse without raising
            uuid.UUID(v)


# ---------------------------------------------------------------------------
# EnumGenerator
# ---------------------------------------------------------------------------

class TestEnumGenerator:
    def test_only_allowed_values(self):
        allowed = ["red", "green", "blue"]
        gen = EnumGenerator({"values": allowed})
        values = gen.generate(500, seed=42)
        assert all(v in allowed for v in values), (
            f"Unexpected value found. Values: {set(values)}"
        )

    def test_raises_without_values(self):
        with pytest.raises(ValueError, match="values"):
            EnumGenerator({})

    def test_all_options_appear(self):
        """With enough rows all enum values should appear at least once."""
        allowed = ["a", "b", "c", "d"]
        gen = EnumGenerator({"values": allowed})
        values = gen.generate(1000, seed=5)
        assert set(values) == set(allowed)


# ---------------------------------------------------------------------------
# PersonaBuilder
# ---------------------------------------------------------------------------

class TestPersonaBuilder:
    _EXPECTED_FIELDS = {
        "id", "first_name", "last_name", "full_name", "age", "email",
        "phone", "city", "state", "country", "zip_code", "signup_date",
        "is_active", "lifetime_value", "preferred_channel",
    }

    def test_produces_correct_fields(self):
        builder = PersonaBuilder()
        personas = builder.generate(5, seed=42)
        for p in personas:
            assert self._EXPECTED_FIELDS == set(p.keys()), (
                f"Field mismatch. Got: {set(p.keys())}"
            )

    def test_age_in_range(self):
        """All ages must be in [18, 80] as documented."""
        builder = PersonaBuilder()
        personas = builder.generate(200, seed=0)
        for p in personas:
            assert 18 <= p["age"] <= 80, f"age={p['age']} is outside [18, 80]"

    def test_correct_row_count(self):
        builder = PersonaBuilder()
        for n in (0, 1, 10, 50):
            personas = builder.generate(n, seed=1)
            assert len(personas) == n

    def test_is_active_is_bool(self):
        builder = PersonaBuilder()
        personas = builder.generate(50, seed=7)
        for p in personas:
            assert isinstance(p["is_active"], bool)

    def test_lifetime_value_non_negative(self):
        builder = PersonaBuilder()
        personas = builder.generate(100, seed=3)
        for p in personas:
            assert p["lifetime_value"] >= 0.0


# ---------------------------------------------------------------------------
# BehaviourProfile
# ---------------------------------------------------------------------------

class TestBehaviourProfile:
    def _make_persona(self, seed: int = 42) -> dict:
        builder = PersonaBuilder()
        return builder.generate(1, seed=seed)[0]

    def test_all_numeric_fields_non_negative(self):
        """All BehaviourProfile numeric fields should be >= 0."""
        builder = PersonaBuilder()
        personas = builder.generate(50, seed=10)
        for persona in personas:
            bp = generate_behaviour(persona, seed=42)
            assert bp.avg_session_duration_mins >= 0, (
                f"avg_session_duration_mins={bp.avg_session_duration_mins} is negative"
            )
            assert bp.sessions_per_week >= 0, (
                f"sessions_per_week={bp.sessions_per_week} is negative"
            )
            assert bp.pages_per_session >= 0, (
                f"pages_per_session={bp.pages_per_session} is negative"
            )
            assert bp.conversion_rate >= 0, (
                f"conversion_rate={bp.conversion_rate} is negative"
            )
            assert bp.last_active_days_ago >= 0, (
                f"last_active_days_ago={bp.last_active_days_ago} is negative"
            )

    def test_conversion_rate_bounded(self):
        """conversion_rate must be in [0, 1]."""
        persona = self._make_persona()
        bp = generate_behaviour(persona)
        assert 0.0 <= bp.conversion_rate <= 1.0

    def test_returns_behaviour_profile_instance(self):
        persona = self._make_persona()
        bp = generate_behaviour(persona)
        assert isinstance(bp, BehaviourProfile)

    def test_inactive_persona_has_nonzero_last_active(self):
        """Inactive personas should have last_active_days_ago in [30, 365]."""
        builder = PersonaBuilder()
        personas = builder.generate(200, seed=99)
        for persona in personas:
            if not persona["is_active"]:
                bp = generate_behaviour(persona)
                assert 30 <= bp.last_active_days_ago <= 365

    def test_active_persona_has_zero_last_active(self):
        """Active personas should have last_active_days_ago == 0."""
        builder = PersonaBuilder()
        personas = builder.generate(200, seed=99)
        for persona in personas:
            if persona["is_active"]:
                bp = generate_behaviour(persona)
                assert bp.last_active_days_ago == 0
