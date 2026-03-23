"""Model drift simulation routes."""

import math
import random
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/drift", tags=["drift"])


class DriftPoint(BaseModel):
    timestamp: str
    mean: float
    std: float
    psi: float       # Population Stability Index
    kl_div: float    # KL Divergence (approx)
    drift_type: str  # "none" | "data" | "concept"


class SimulateRequest(BaseModel):
    steps: int = Field(30, ge=5, le=120)
    drift_start: int = Field(15, ge=1)
    drift_kind: Literal["data", "concept", "both"] = "data"
    seed: int = 42


class SimulateResponse(BaseModel):
    points: list[DriftPoint]
    baseline_mean: float
    baseline_std: float
    drift_start: int
    drift_kind: str


def _psi(expected_pct: float, actual_pct: float) -> float:
    """Simplified PSI for a single bucket."""
    e = max(expected_pct, 1e-6)
    a = max(actual_pct, 1e-6)
    return (a - e) * math.log(a / e)


def _kl(p: float, q: float) -> float:
    p = max(p, 1e-6)
    q = max(q, 1e-6)
    return p * math.log(p / q)


@router.post("/simulate", response_model=SimulateResponse)
async def simulate(req: SimulateRequest):
    rng = random.Random(req.seed)
    baseline_mean = 0.5
    baseline_std = 0.1

    points: list[DriftPoint] = []

    for i in range(req.steps):
        # Date string — start from 2024-01-01 + i days
        day = i + 1
        date_str = f"2024-{(day // 31) + 1:02d}-{(day % 28) + 1:02d}"

        in_drift = i >= req.drift_start
        drift_progress = (i - req.drift_start) / max(req.steps - req.drift_start, 1) if in_drift else 0.0

        mean = baseline_mean
        std = baseline_std

        drift_type = "none"
        if in_drift:
            if req.drift_kind in ("data", "both"):
                # Data drift: input distribution shifts
                mean += drift_progress * 0.3 + rng.gauss(0, 0.02)
                std += drift_progress * 0.05
                drift_type = "data"
            if req.drift_kind in ("concept", "both"):
                # Concept drift: same input, different label relationship
                mean += rng.gauss(0, 0.03)
                std += drift_progress * 0.08
                drift_type = "concept" if req.drift_kind == "concept" else "both"
        else:
            mean += rng.gauss(0, 0.01)
            std += rng.gauss(0, 0.005)
            std = max(std, 0.01)

        psi_val = abs(_psi(baseline_mean, mean))
        kl_val = abs(_kl(baseline_mean, max(mean, 1e-6)))

        points.append(
            DriftPoint(
                timestamp=date_str,
                mean=round(mean, 4),
                std=round(max(std, 0.01), 4),
                psi=round(min(psi_val, 2.0), 4),
                kl_div=round(min(kl_val, 2.0), 4),
                drift_type=drift_type,
            )
        )

    return SimulateResponse(
        points=points,
        baseline_mean=baseline_mean,
        baseline_std=baseline_std,
        drift_start=req.drift_start,
        drift_kind=req.drift_kind,
    )
