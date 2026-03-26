from datetime import date, timedelta
from typing import Any

import numpy as np

from .base import BaseGenerator

_DEFAULT_START = "2020-01-01"


class DateGenerator(BaseGenerator):
    """
    Constraints:
        start  (str) — ISO date string lower bound, default "2020-01-01"
        end    (str) — ISO date string upper bound, default today
        format (str) — strftime format string for output, default "%Y-%m-%d"
    """

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[str]:
        rng = np.random.default_rng(seed)

        start_str = self.constraints.get("start", _DEFAULT_START)
        end_str = self.constraints.get("end", date.today().isoformat())
        fmt = self.constraints.get("format", "%Y-%m-%d")

        start_date = date.fromisoformat(start_str)
        end_date = date.fromisoformat(end_str)

        if end_date < start_date:
            raise ValueError(
                f"DateGenerator: 'end' ({end_str}) must be >= 'start' ({start_str})."
            )

        delta_days = (end_date - start_date).days
        # Uniform integer offsets in [0, delta_days]
        offsets = rng.integers(0, delta_days + 1, n_rows)
        return [(start_date + timedelta(days=int(d))).strftime(fmt) for d in offsets]
