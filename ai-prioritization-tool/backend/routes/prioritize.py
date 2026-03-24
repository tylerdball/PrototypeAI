import asyncio
import json
import re
from fastapi import APIRouter
from pydantic import BaseModel
from providers import chat

router = APIRouter()

WEIGHT_MAP = {"low": 1, "med": 2, "high": 3}
RECOMMENDATION_THRESHOLDS = {"HIGH": 70, "MEDIUM": 45}


class Criterion(BaseModel):
    name: str
    description: str
    weight: str  # "low" | "med" | "high"


class Item(BaseModel):
    title: str
    description: str


class PrioritizeRequest(BaseModel):
    criteria: list[Criterion]
    context: str
    items: list[Item]


class CriterionScore(BaseModel):
    criterion: str
    score: int
    reasoning: str


class ScoredItem(BaseModel):
    title: str
    description: str
    criterion_scores: list[CriterionScore]
    weighted_score: float
    recommendation: str


def parse_scores(text: str, criteria: list[Criterion]) -> list[CriterionScore]:
    """Extract JSON from LLM response; fall back to regex if needed."""
    # Try to find a JSON array in the response
    match = re.search(r"\[.*?\]", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            return [
                CriterionScore(
                    criterion=item.get("criterion", criteria[i].name if i < len(criteria) else ""),
                    score=max(1, min(5, int(item.get("score", 3)))),
                    reasoning=item.get("reasoning", ""),
                )
                for i, item in enumerate(data)
            ]
        except (json.JSONDecodeError, ValueError, KeyError):
            pass

    # Regex fallback: extract individual score blocks
    results = []
    for criterion in criteria:
        pattern = rf'"{re.escape(criterion.name)}".*?"score"\s*:\s*(\d).*?"reasoning"\s*:\s*"([^"]*)"'
        m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if m:
            results.append(CriterionScore(
                criterion=criterion.name,
                score=max(1, min(5, int(m.group(1)))),
                reasoning=m.group(2),
            ))
        else:
            results.append(CriterionScore(
                criterion=criterion.name,
                score=3,
                reasoning="Score unavailable — model output was malformed.",
            ))
    return results


def compute_weighted_score(criterion_scores: list[CriterionScore], criteria: list[Criterion]) -> float:
    weight_lookup = {c.name: WEIGHT_MAP.get(c.weight.lower(), 1) for c in criteria}
    total_weight = sum(weight_lookup.get(cs.criterion, 1) for cs in criterion_scores)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum(
        cs.score * weight_lookup.get(cs.criterion, 1) for cs in criterion_scores
    )
    # Normalise to 0–100
    max_possible = total_weight * 5
    return round((weighted_sum / max_possible) * 100, 1)


def get_recommendation(score: float) -> str:
    if score >= RECOMMENDATION_THRESHOLDS["HIGH"]:
        return "HIGH"
    if score >= RECOMMENDATION_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    if score >= 25:
        return "LOW"
    return "DEFER"


async def score_item(item: Item, criteria: list[Criterion], context: str) -> ScoredItem:
    criteria_block = "\n".join(
        f'- {c.name} ({c.weight} weight): {c.description}' for c in criteria
    )
    context_block = f"\n\nOrganisational context:\n{context}" if context.strip() else ""

    prompt = f"""You are a technical product manager scoring backlog items against strategic criteria.{context_block}

Score the following backlog item against each criterion on a scale of 1–5 (1=very low, 5=very high).

Item: {item.title}
Description: {item.description}

Criteria:
{criteria_block}

Respond with a JSON array only — no prose, no markdown fences. Example format:
[
  {{"criterion": "Platform Leverage", "score": 4, "reasoning": "One sentence explanation."}},
  ...
]

Return one object per criterion in the same order listed above."""

    response = await chat(prompt)
    criterion_scores = parse_scores(response, criteria)
    weighted_score = compute_weighted_score(criterion_scores, criteria)
    return ScoredItem(
        title=item.title,
        description=item.description,
        criterion_scores=criterion_scores,
        weighted_score=weighted_score,
        recommendation=get_recommendation(weighted_score),
    )


@router.post("/prioritize", response_model=list[ScoredItem])
async def prioritize(request: PrioritizeRequest):
    tasks = [score_item(item, request.criteria, request.context) for item in request.items]
    results = await asyncio.gather(*tasks)
    return sorted(results, key=lambda x: x.weighted_score, reverse=True)
