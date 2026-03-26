from typing import Any

import numpy as np

from .base import BaseGenerator


class IntGenerator(BaseGenerator):
    """
    Constraints:
        min         (int)   — lower bound, default 0
        max         (int)   — upper bound (inclusive), default 100
        mean        (float) — mean for normal distribution
        std         (float) — std dev for normal distribution
        distribution (str)  — "uniform" | "normal" | "exponential", default "uniform"
    """

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[int]:
        rng = np.random.default_rng(seed)
        dist = self.constraints.get("distribution", "uniform")
        lo = self.constraints.get("min", 0)
        hi = self.constraints.get("max", 100)

        if dist == "normal":
            mean = self.constraints.get("mean", (lo + hi) / 2)
            std = self.constraints.get("std", (hi - lo) / 6)
            values = rng.normal(mean, std, n_rows)
            values = np.clip(values, lo, hi)
        elif dist == "exponential":
            scale = self.constraints.get("mean", max(1, (hi - lo) / 3))
            values = rng.exponential(scale, n_rows)
            values = np.clip(values + lo, lo, hi)
        else:  # uniform (default)
            values = rng.integers(lo, hi + 1, n_rows)
            return [int(v) for v in values]

        return [int(round(v)) for v in values]


class FloatGenerator(BaseGenerator):
    """
    Constraints:
        min         (float) — lower bound, default 0.0
        max         (float) — upper bound, default 1.0
        mean        (float) — mean for normal distribution
        std         (float) — std dev for normal distribution
        distribution (str)  — "uniform" | "normal" | "exponential", default "uniform"
    """

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[float]:
        rng = np.random.default_rng(seed)
        dist = self.constraints.get("distribution", "uniform")
        lo = float(self.constraints.get("min", 0.0))
        hi = float(self.constraints.get("max", 1.0))

        if dist == "normal":
            mean = self.constraints.get("mean", (lo + hi) / 2)
            std = self.constraints.get("std", (hi - lo) / 6)
            values = rng.normal(mean, std, n_rows)
            values = np.clip(values, lo, hi)
        elif dist == "exponential":
            scale = self.constraints.get("mean", max(1.0, (hi - lo) / 3))
            values = rng.exponential(scale, n_rows)
            values = np.clip(values + lo, lo, hi)
        else:  # uniform (default)
            values = rng.uniform(lo, hi, n_rows)

        return [float(round(v, 6)) for v in values]
