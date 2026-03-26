import uuid
from typing import Any

import numpy as np

from .base import BaseGenerator


class BoolGenerator(BaseGenerator):
    """
    Constraints:
        true_probability (float) — probability of True, default 0.5
    """

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[bool]:
        rng = np.random.default_rng(seed)
        p = float(self.constraints.get("true_probability", 0.5))
        return [bool(v) for v in rng.random(n_rows) < p]


class EnumGenerator(BaseGenerator):
    """
    Constraints:
        values (list) — list of possible values to pick from (required)

    Raises:
        ValueError — if no values are provided in constraints
    """

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}
        if not self.constraints.get("values"):
            raise ValueError(
                "EnumGenerator requires a non-empty 'values' list in constraints."
            )

    def generate(self, n_rows: int, seed: int | None = None) -> list[Any]:
        rng = np.random.default_rng(seed)
        values = self.constraints["values"]
        indices = rng.integers(0, len(values), n_rows)
        return [values[i] for i in indices]


class UUIDGenerator(BaseGenerator):
    """Generates random UUID4 strings. No constraints used."""

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[str]:
        # uuid4 is inherently random; seed is honoured via a seeded RNG used
        # to produce the 128-bit integers that back each UUID.
        rng = np.random.default_rng(seed)
        result: list[str] = []
        for _ in range(n_rows):
            # Generate 16 random bytes from the seeded RNG
            raw = rng.integers(0, 256, 16, dtype=np.uint8).tobytes()
            u = uuid.UUID(bytes=raw, version=4)
            result.append(str(u))
        return result
