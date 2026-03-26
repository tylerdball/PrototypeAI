"""Tests for analyzer.reviewer and analyzer.comparator."""

import json
import sys
import os
from unittest.mock import AsyncMock, patch

import pytest

# Ensure project root is on path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from schemas import HeuristicScore, HeuristicId, Severity
from analyzer.heuristics import HEURISTICS


def _make_valid_json_response(score: float = 7.5) -> str:
    """Return a valid 10-item JSON array with the given score for all heuristics."""
    return json.dumps(
        [
            {"id": i, "score": score, "findings": ["Good"], "suggestions": ["Improve X"]}
            for i in range(1, 11)
        ]
    )


def _make_heuristic_scores(scores: list[float]) -> list[HeuristicScore]:
    """Build a list of HeuristicScore objects from a list of 10 scores."""
    name_by_id = {h["id"]: h["name"] for h in HEURISTICS}
    result = []
    for i, score in enumerate(scores, start=1):
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


# ---------------------------------------------------------------------------
# ReviewEngine tests
# ---------------------------------------------------------------------------


class TestReviewEngine:
    async def test_returns_10_items(self):
        """ReviewEngine.analyze() should always return exactly 10 HeuristicScore items."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response(7.5))
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response(7.5))

            engine = ReviewEngine()
            result = await engine.analyze(
                image_base64=None,
                description="A simple login form",
                focus_areas=[],
                context="",
            )

        assert len(result) == 10

    async def test_all_scores_in_valid_range(self):
        """All returned scores should be between 0 and 10 inclusive."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response(7.5))
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response(7.5))

            engine = ReviewEngine()
            result = await engine.analyze(
                image_base64=None,
                description="A simple login form",
                focus_areas=[],
                context="",
            )

        assert all(0 <= h.score <= 10 for h in result)

    async def test_severity_mapping_ok(self):
        """Score >= 7.0 should map to Severity.OK."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response(8.0))
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response(8.0))

            engine = ReviewEngine()
            result = await engine.analyze(
                image_base64=None, description="desc", focus_areas=[], context=""
            )

        assert all(h.severity == Severity.OK for h in result)

    async def test_severity_mapping_warning(self):
        """Score in [4.0, 7.0) should map to Severity.WARNING."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response(5.0))
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response(5.0))

            engine = ReviewEngine()
            result = await engine.analyze(
                image_base64=None, description="desc", focus_areas=[], context=""
            )

        assert all(h.severity == Severity.WARNING for h in result)

    async def test_severity_mapping_critical(self):
        """Score < 4.0 should map to Severity.CRITICAL."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response(2.0))
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response(2.0))

            engine = ReviewEngine()
            result = await engine.analyze(
                image_base64=None, description="desc", focus_areas=[], context=""
            )

        assert all(h.severity == Severity.CRITICAL for h in result)

    async def test_malformed_json_handled_gracefully(self):
        """When the LLM returns non-JSON, analyze() should return 10 items without raising."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value="this is not json")
            mock_providers.complete_with_vision = AsyncMock(return_value="this is not json")

            engine = ReviewEngine()
            result = await engine.analyze(
                image_base64=None, description="desc", focus_areas=[], context=""
            )

        assert len(result) == 10

    async def test_vision_path_called_when_image_provided(self):
        """complete_with_vision should be called when image_base64 is set."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response())
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response())

            engine = ReviewEngine()
            await engine.analyze(
                image_base64="fake_b64_data",
                description="A UI screenshot",
                focus_areas=[],
                context="",
            )

        mock_providers.complete_with_vision.assert_called_once()
        mock_providers.complete.assert_not_called()

    async def test_text_path_called_when_no_image(self):
        """complete (text) should be called when image_base64 is None."""
        from analyzer.reviewer import ReviewEngine

        with patch("analyzer.reviewer.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value=_make_valid_json_response())
            mock_providers.complete_with_vision = AsyncMock(return_value=_make_valid_json_response())

            engine = ReviewEngine()
            await engine.analyze(
                image_base64=None,
                description="A UI description",
                focus_areas=[],
                context="",
            )

        mock_providers.complete.assert_called_once()
        mock_providers.complete_with_vision.assert_not_called()


# ---------------------------------------------------------------------------
# ComparisonEngine tests
# ---------------------------------------------------------------------------


class TestComparisonEngine:
    async def test_computes_correct_deltas(self):
        """Each delta should equal after_score - before_score."""
        from analyzer.comparator import ComparisonEngine

        before_scores_list = [5.0] * 10
        after_scores_list = [7.0] * 10
        before = _make_heuristic_scores(before_scores_list)
        after = _make_heuristic_scores(after_scores_list)

        with patch("analyzer.comparator.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value="Comparison summary.")

            engine = ComparisonEngine()
            result = await engine.compare(before, after, context="")

        for delta in result["deltas"]:
            assert delta.delta == pytest.approx(
                delta.after_score - delta.before_score, abs=1e-9
            )

    async def test_improvements_list_correct(self):
        """A heuristic with delta > 1.0 should appear in improvements; delta <= 1.0 should not."""
        from analyzer.comparator import ComparisonEngine

        # Heuristic 1 gets a big improvement (+2.0), the rest stay flat
        before_scores_list = [5.0] * 10
        after_scores_list = [5.0] * 10
        after_scores_list[0] = 7.0  # heuristic id=1 delta = +2.0

        before = _make_heuristic_scores(before_scores_list)
        after = _make_heuristic_scores(after_scores_list)

        with patch("analyzer.comparator.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value="Comparison summary.")

            engine = ComparisonEngine()
            result = await engine.compare(before, after, context="")

        name_by_id = {h["id"]: h["name"] for h in HEURISTICS}
        improved_name = name_by_id[1]  # "Visibility of System Status"
        flat_name = name_by_id[2]      # delta = 0.0 (not > 1.0)

        assert improved_name in result["improvements"]
        assert flat_name not in result["improvements"]

    async def test_regressions_list_correct(self):
        """A heuristic with delta < -1.0 should appear in regressions; delta >= -1.0 should not."""
        from analyzer.comparator import ComparisonEngine

        # Heuristic 1 regresses by -2.0, the rest stay flat
        before_scores_list = [7.0] * 10
        after_scores_list = [7.0] * 10
        after_scores_list[0] = 5.0  # heuristic id=1 delta = -2.0

        before = _make_heuristic_scores(before_scores_list)
        after = _make_heuristic_scores(after_scores_list)

        with patch("analyzer.comparator.providers") as mock_providers:
            mock_providers.complete = AsyncMock(return_value="Comparison summary.")

            engine = ComparisonEngine()
            result = await engine.compare(before, after, context="")

        name_by_id = {h["id"]: h["name"] for h in HEURISTICS}
        regressed_name = name_by_id[1]
        flat_name = name_by_id[2]

        assert regressed_name in result["regressions"]
        assert flat_name not in result["regressions"]
