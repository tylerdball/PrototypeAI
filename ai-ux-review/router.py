import json
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from schemas import (
    ReviewRequest, SingleReviewResponse,
    CompareRequest, CompareReviewResponse,
    HeuristicScore, HeuristicId, Severity, HeuristicDelta
)

HISTORY_FILE = Path(__file__).parent / "history.json"


def _load_history() -> list[dict]:
    if not HISTORY_FILE.exists():
        return []
    try:
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_history(entries: list[dict]) -> None:
    HISTORY_FILE.write_text(json.dumps(entries, indent=2, default=str), encoding="utf-8")

router = APIRouter()

# Hardcoded heuristic names for stub responses
HEURISTIC_NAMES = {
    1: "Visibility of System Status",
    2: "Match Between System and the Real World",
    3: "User Control and Freedom",
    4: "Consistency and Standards",
    5: "Error Prevention",
    6: "Recognition Rather Than Recall",
    7: "Flexibility and Efficiency of Use",
    8: "Aesthetic and Minimalist Design",
    9: "Help Users Recognize, Diagnose, and Recover From Errors",
    10: "Help and Documentation",
}


@router.get("/history")
async def list_history():
    entries = _load_history()
    return [
        {
            "id": e["id"],
            "type": e["type"],
            "title": e.get("title", ""),
            "overall_score": e.get("overall_score"),
            "overall_delta": e.get("overall_delta"),
            "created_at": e["created_at"],
        }
        for e in entries
    ]


@router.post("/history")
async def save_history(body: dict):
    entries = _load_history()
    entry = {
        "id": str(uuid.uuid4()),
        "type": body.get("type", "single"),
        "title": body.get("title", ""),
        "overall_score": body.get("overall_score"),
        "overall_delta": body.get("overall_delta"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": body.get("result"),
    }
    entries.insert(0, entry)
    entries = entries[:50]
    _save_history(entries)
    return entry


@router.get("/history/{entry_id}")
async def get_history_entry(entry_id: str):
    for e in _load_history():
        if e["id"] == entry_id:
            return e
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/history/{entry_id}")
async def delete_history_entry(entry_id: str):
    entries = _load_history()
    new_entries = [e for e in entries if e["id"] != entry_id]
    if len(new_entries) == len(entries):
        raise HTTPException(status_code=404, detail="Not found")
    _save_history(new_entries)
    return {"deleted": entry_id}


@router.get("/heuristics")
async def list_heuristics():
    # Import from analyzer if available, else return stub
    try:
        from analyzer.heuristics import HEURISTICS
        return HEURISTICS
    except ImportError:
        return [{"id": i, "name": name, "description": ""} for i, name in HEURISTIC_NAMES.items()]


@router.post("/review", response_model=SingleReviewResponse)
async def review(request: ReviewRequest) -> SingleReviewResponse:
    from analyzer.reviewer import ReviewEngine
    engine = ReviewEngine()
    try:
        heuristics = await engine.analyze(
            image_base64=request.image_base64,
            description=request.description,
            focus_areas=[int(h) for h in request.focus_areas],
            context=request.context,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Analysis failed: {str(e)}")

    overall_score = sum(h.score for h in heuristics) / len(heuristics) if heuristics else 0.0
    # Generate summary via LLM (keep it short)
    import providers
    try:
        summary = await providers.complete(
            f"In 1-2 sentences, summarize this UX review: overall score {overall_score:.1f}/10. "
            f"Top issues: {[h.name for h in heuristics if h.severity.value in ('critical','warning')][:3]}",
            system="You are a UX expert. Write a concise, direct summary.",
            max_tokens=200,
        )
    except Exception:
        summary = f"Overall score: {overall_score:.1f}/10."

    return SingleReviewResponse(
        heuristics=heuristics,
        overall_score=round(overall_score, 2),
        summary=summary,
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/compare", response_model=CompareReviewResponse)
async def compare(request: CompareRequest) -> CompareReviewResponse:
    from analyzer.reviewer import ReviewEngine
    from analyzer.comparator import ComparisonEngine

    engine = ReviewEngine()
    try:
        before_scores = await engine.analyze(
            image_base64=request.before.image_base64,
            description=request.before.description,
            focus_areas=[int(h) for h in request.before.focus_areas],
            context=request.before.context or request.context,
        )
        after_scores = await engine.analyze(
            image_base64=request.after.image_base64,
            description=request.after.description,
            focus_areas=[int(h) for h in request.after.focus_areas],
            context=request.after.context or request.context,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Analysis failed: {str(e)}")

    def make_review(scores):
        overall = sum(h.score for h in scores) / len(scores) if scores else 0.0
        return SingleReviewResponse(
            heuristics=scores,
            overall_score=round(overall, 2),
            summary="",
            generated_at=datetime.now(timezone.utc),
        )

    comparator = ComparisonEngine()
    comparison = await comparator.compare(before_scores, after_scores, context=request.context)

    return CompareReviewResponse(
        before=make_review(before_scores),
        after=make_review(after_scores),
        deltas=comparison["deltas"],
        overall_delta=comparison["overall_delta"],
        improvements=comparison["improvements"],
        regressions=comparison["regressions"],
        summary=comparison["summary"],
        generated_at=datetime.now(timezone.utc),
    )
