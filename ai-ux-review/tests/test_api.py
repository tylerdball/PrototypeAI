"""Integration tests for the FastAPI routes."""

import json
import sys
import os
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient, ASGITransport

# Ensure project root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from schemas import HeuristicScore, HeuristicId, Severity
from analyzer.heuristics import HEURISTICS


def _make_heuristic_scores(score: float = 7.0) -> list[HeuristicScore]:
    """Return 10 HeuristicScore objects all with the given score."""
    name_by_id = {h["id"]: h["name"] for h in HEURISTICS}
    result = []
    for i in range(1, 11):
        if score >= 7.0:
            severity = Severity.OK
        elif score >= 4.0:
            severity = Severity.WARNING
        else:
            severity = Severity.CRITICAL

        result.append(
            HeuristicScore(
                id=HeuristicId(i),
                name=name_by_id[i],
                score=score,
                severity=severity,
                findings=["Finding"],
                suggestions=["Suggestion"],
            )
        )
    return result


def _make_valid_json(score: float = 7.0) -> str:
    return json.dumps(
        [
            {"id": i, "score": score, "findings": ["Good"], "suggestions": ["Improve X"]}
            for i in range(1, 11)
        ]
    )


# ---------------------------------------------------------------------------
# Health & heuristics listing
# ---------------------------------------------------------------------------


class TestHealthAndHeuristics:
    async def test_health_returns_200(self):
        """GET /health should return 200 with status 'ok'."""
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_heuristics_returns_10_items(self):
        """GET /heuristics should return 10 items each with id, name, description."""
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/heuristics")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
        for item in data:
            assert "id" in item
            assert "name" in item
            assert "description" in item


# ---------------------------------------------------------------------------
# POST /review
# ---------------------------------------------------------------------------


class TestReviewEndpoint:
    async def test_review_with_description_returns_200(self):
        """POST /review with a description should return 200 with 10 heuristics and an overall_score."""
        from main import app

        with (
            patch("analyzer.reviewer.providers") as mock_rev_providers,
            patch("providers.complete", new=AsyncMock(return_value="Overall looks good.")),
        ):
            mock_rev_providers.complete = AsyncMock(return_value=_make_valid_json(7.0))
            mock_rev_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json(7.0))

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/review",
                    json={"description": "A simple dashboard UI"},
                )

        assert response.status_code == 200
        data = response.json()
        assert len(data["heuristics"]) == 10
        assert "overall_score" in data

    async def test_review_with_no_input_returns_422(self):
        """POST /review with empty body should return 422 (validation error)."""
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/review", json={})

        assert response.status_code == 422

    async def test_review_image_triggers_vision(self):
        """POST /review with image_base64 should call complete_with_vision."""
        from main import app

        with (
            patch("analyzer.reviewer.providers") as mock_rev_providers,
            patch("providers.complete", new=AsyncMock(return_value="Summary.")),
        ):
            mock_rev_providers.complete = AsyncMock(return_value=_make_valid_json(7.0))
            mock_rev_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json(7.0))

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/review",
                    json={"image_base64": "fake_b64", "description": "A UI"},
                )

        assert response.status_code == 200
        mock_rev_providers.complete_with_vision.assert_called_once()
        mock_rev_providers.complete.assert_not_called()


# ---------------------------------------------------------------------------
# POST /compare
# ---------------------------------------------------------------------------


class TestCompareEndpoint:
    async def test_compare_returns_correct_structure(self):
        """POST /compare should return a response with the expected top-level keys."""
        from main import app

        with (
            patch("analyzer.reviewer.providers") as mock_rev_providers,
            patch("analyzer.comparator.providers") as mock_cmp_providers,
        ):
            mock_rev_providers.complete = AsyncMock(return_value=_make_valid_json(6.0))
            mock_rev_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json(6.0))
            mock_cmp_providers.complete = AsyncMock(return_value="Comparison summary.")

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/compare",
                    json={
                        "before": {"description": "Old UI"},
                        "after": {"description": "New UI"},
                    },
                )

        assert response.status_code == 200
        data = response.json()
        for key in ("before", "after", "deltas", "overall_delta", "improvements", "regressions"):
            assert key in data, f"Missing key: {key}"

    async def test_compare_overall_delta_calculation(self):
        """overall_delta should be approximately after_avg - before_avg for known scores."""
        from main import app

        # before = all 5.0, after = all 7.0  →  overall_delta ≈ 2.0
        before_json = _make_valid_json(5.0)
        after_json = _make_valid_json(7.0)

        call_count = 0

        async def side_effect_complete(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            # First call is for 'before', second for 'after'
            if call_count == 1:
                return before_json
            return after_json

        with (
            patch("analyzer.reviewer.providers") as mock_rev_providers,
            patch("analyzer.comparator.providers") as mock_cmp_providers,
        ):
            mock_rev_providers.complete = AsyncMock(side_effect=side_effect_complete)
            mock_rev_providers.complete_with_vision = AsyncMock(return_value=after_json)
            mock_cmp_providers.complete = AsyncMock(return_value="Comparison summary.")

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/compare",
                    json={
                        "before": {"description": "Old UI"},
                        "after": {"description": "New UI"},
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert abs(data["overall_delta"] - 2.0) < 0.1, (
            f"Expected overall_delta ≈ 2.0, got {data['overall_delta']}"
        )
