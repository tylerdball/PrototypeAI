"""
BehaviourProfile: per-persona engagement metrics statistically correlated
to lifetime_value and age from the persona dict.

Correlation logic:
- Higher lifetime_value  → more sessions, longer duration, higher conversion_rate
- Younger age            → slightly more sessions and pages per session
- Inactive personas      → last_active_days_ago is a random value in [30, 365]
- Active personas        → last_active_days_ago is 0 (seen today)
- All numeric values are clamped to be non-negative.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Optional


# ---------------------------------------------------------------------------
# Dataclass
# ---------------------------------------------------------------------------

@dataclass
class BehaviourProfile:
    avg_session_duration_mins: float
    sessions_per_week: float
    pages_per_session: float
    conversion_rate: float          # 0.0 – 1.0
    last_active_days_ago: int


# ---------------------------------------------------------------------------
# Generation function
# ---------------------------------------------------------------------------

def generate_behaviour(
    persona_dict: dict,
    seed: Optional[int] = None,
) -> BehaviourProfile:
    """
    Derive a :class:`BehaviourProfile` from a persona dict produced by
    :class:`~persona.builder.PersonaBuilder`.

    Parameters
    ----------
    persona_dict:
        A single persona record (one element from the list returned by
        ``PersonaBuilder.generate``).
    seed:
        Optional RNG seed.  When ``None`` the persona ``id`` field is used
        as a deterministic seed so repeated calls return consistent results
        for the same persona.

    Returns
    -------
    BehaviourProfile
    """
    if seed is None:
        # Use the UUID as a deterministic seed so the same persona always
        # gets the same behaviour profile.
        seed = int(persona_dict["id"].replace("-", ""), 16) % (2**31)

    rng = random.Random(seed)

    lifetime_value: float = float(persona_dict.get("lifetime_value", 0.0))
    age: int = int(persona_dict.get("age", 40))
    is_active: bool = bool(persona_dict.get("is_active", True))

    # ------------------------------------------------------------------
    # Normalised LTV signal in [0, 1] using a soft sigmoid so very large
    # values don't dominate completely.  LTV of 500 (the scale parameter)
    # maps to ~0.5 on this curve.
    # ------------------------------------------------------------------
    ltv_signal = _sigmoid(lifetime_value / 500.0)          # 0 – 1

    # Age signal: younger → slightly higher engagement (inverted, normalised)
    # age 18 → 1.0,  age 80 → 0.0
    age_signal = 1.0 - (age - 18) / 62.0                   # 0 – 1

    # ------------------------------------------------------------------
    # avg_session_duration_mins
    #   baseline 3 min, max ~45 min driven by LTV and age
    # ------------------------------------------------------------------
    duration_base = 3.0 + 42.0 * ltv_signal + 5.0 * age_signal
    duration_noise = rng.gauss(0.0, 2.0)
    avg_session_duration_mins = max(0.5, round(duration_base + duration_noise, 2))

    # ------------------------------------------------------------------
    # sessions_per_week
    #   baseline 0.5, high-LTV users visit multiple times/week
    # ------------------------------------------------------------------
    sessions_base = 0.5 + 9.5 * ltv_signal + 2.0 * age_signal
    sessions_noise = rng.gauss(0.0, 0.5)
    sessions_per_week = max(0.0, round(sessions_base + sessions_noise, 2))

    # ------------------------------------------------------------------
    # pages_per_session
    #   baseline 1, more engaged users browse more pages
    # ------------------------------------------------------------------
    pages_base = 1.0 + 14.0 * ltv_signal + 3.0 * age_signal
    pages_noise = rng.gauss(0.0, 1.0)
    pages_per_session = max(1.0, round(pages_base + pages_noise, 2))

    # ------------------------------------------------------------------
    # conversion_rate (0.0 – 1.0)
    #   strongly correlated with LTV — high-value customers convert more
    # ------------------------------------------------------------------
    conv_base = 0.01 + 0.29 * ltv_signal
    conv_noise = rng.gauss(0.0, 0.02)
    conversion_rate = float(_clip(conv_base + conv_noise, 0.0, 1.0))
    conversion_rate = round(conversion_rate, 4)

    # ------------------------------------------------------------------
    # last_active_days_ago
    # ------------------------------------------------------------------
    if is_active:
        last_active_days_ago = 0
    else:
        last_active_days_ago = rng.randint(30, 365)

    return BehaviourProfile(
        avg_session_duration_mins=avg_session_duration_mins,
        sessions_per_week=sessions_per_week,
        pages_per_session=pages_per_session,
        conversion_rate=conversion_rate,
        last_active_days_ago=last_active_days_ago,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _sigmoid(x: float) -> float:
    """Standard logistic sigmoid, clamped to avoid overflow."""
    x = _clip(x, -500.0, 500.0)
    return 1.0 / (1.0 + math.exp(-x))


def _clip(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))
