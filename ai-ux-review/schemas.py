from enum import IntEnum, Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, model_validator


class HeuristicId(IntEnum):
    VISIBILITY_OF_SYSTEM_STATUS = 1
    MATCH_WITH_REAL_WORLD = 2
    USER_CONTROL_AND_FREEDOM = 3
    CONSISTENCY_AND_STANDARDS = 4
    ERROR_PREVENTION = 5
    RECOGNITION_OVER_RECALL = 6
    FLEXIBILITY_AND_EFFICIENCY = 7
    AESTHETIC_MINIMALIST_DESIGN = 8
    HELP_RECOGNIZE_DIAGNOSE_ERRORS = 9
    HELP_AND_DOCUMENTATION = 10


class Severity(str, Enum):
    OK = "ok"
    WARNING = "warning"
    CRITICAL = "critical"


class HeuristicScore(BaseModel):
    id: HeuristicId
    name: str
    score: float          # 0.0–10.0
    severity: Severity
    findings: list[str]
    suggestions: list[str]


class ReviewRequest(BaseModel):
    image_base64: Optional[str] = None
    description: Optional[str] = None
    focus_areas: list[HeuristicId] = []   # empty = all 10
    context: str = ""

    @model_validator(mode="after")
    def require_input(self):
        if not self.image_base64 and not self.description:
            raise ValueError("At least one of image_base64 or description must be provided")
        return self


class SingleReviewResponse(BaseModel):
    heuristics: list[HeuristicScore]
    overall_score: float
    summary: str
    generated_at: datetime


class CompareRequest(BaseModel):
    before: ReviewRequest
    after: ReviewRequest
    context: str = ""


class HeuristicDelta(BaseModel):
    id: HeuristicId
    name: str
    before_score: float
    after_score: float
    delta: float                # after - before, positive = improvement
    change_summary: str


class CompareReviewResponse(BaseModel):
    before: SingleReviewResponse
    after: SingleReviewResponse
    deltas: list[HeuristicDelta]
    overall_delta: float
    improvements: list[str]
    regressions: list[str]
    summary: str
    generated_at: datetime
