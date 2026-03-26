"""ReviewEngine: evaluate a UI against Nielsen's 10 heuristics."""

import json
import re

from schemas import HeuristicScore, HeuristicId, Severity
from analyzer.heuristics import HEURISTICS
import providers


class ReviewEngine:
    async def analyze(
        self,
        image_base64: str | None,
        description: str | None,
        focus_areas: list[int],
        context: str,
    ) -> list[HeuristicScore]:
        """Evaluate a UI against all 10 Nielsen heuristics. Returns list of 10 scores."""

        # Build system prompt
        system_prompt = (
            "You are a senior UX researcher and usability expert with deep knowledge of "
            "Nielsen's 10 Usability Heuristics. Your task is to evaluate user interfaces "
            "rigorously and objectively, identifying specific usability issues and providing "
            "actionable, concrete improvement suggestions. You base your analysis on visible "
            "evidence in the UI — never invent problems that aren't present, but be thorough "
            "in identifying real issues. Always respond with valid JSON only."
        )

        # Build heuristic definitions section
        heuristic_lines = []
        for h in HEURISTICS:
            heuristic_lines.append(
                f"{h['id']}. {h['name']}\n"
                f"   Description: {h['description']}\n"
                f"   Evaluation focus: {h['evaluation_focus']}"
            )
        heuristics_block = "\n\n".join(heuristic_lines)

        # Build user prompt
        prompt_parts = [
            "You will evaluate a UI against all 10 Nielsen Usability Heuristics.",
            "",
            "## Heuristic Definitions",
            heuristics_block,
            "",
            "## UI Under Review",
        ]

        if description:
            prompt_parts.append(f"UI being reviewed: {description}")

        if context:
            prompt_parts.append(f"Additional context: {context}")

        if focus_areas:
            ids_str = ", ".join(str(i) for i in focus_areas)
            prompt_parts.append(f"Focus especially on heuristics: {ids_str}")

        prompt_parts += [
            "",
            "## Instructions",
            (
                'Return a JSON array of exactly 10 objects, one per heuristic, in this format: '
                '[{"id": 1, "score": 7.5, "findings": ["..."], "suggestions": ["..."]}, ...].'
                " Score 0-10 where 10 is perfect. Be specific and actionable. "
                "findings should describe observable issues; suggestions should state concrete fixes."
            ),
        ]

        user_prompt = "\n".join(prompt_parts)

        # Call the appropriate provider function
        if image_base64:
            raw = await providers.complete_with_vision(
                user_prompt,
                image_base64,
                system=system_prompt,
                max_tokens=4000,
            )
        else:
            raw = await providers.complete(
                user_prompt,
                system=system_prompt,
                max_tokens=4000,
                json_mode=True,
            )

        # Parse response — strip markdown fences if present
        cleaned = re.sub(r"```json?\n?|\n?```", "", raw).strip()

        # Build name lookup from HEURISTICS
        name_by_id = {h["id"]: h["name"] for h in HEURISTICS}

        try:
            items = json.loads(cleaned)
            if not isinstance(items, list):
                raise ValueError("Expected a JSON array")

            scores: list[HeuristicScore] = []
            for item in items:
                item_id = int(item["id"])
                score_val = float(item.get("score", 0.0))

                if score_val >= 7.0:
                    severity = Severity.OK
                elif score_val >= 4.0:
                    severity = Severity.WARNING
                else:
                    severity = Severity.CRITICAL

                scores.append(
                    HeuristicScore(
                        id=HeuristicId(item_id),
                        name=name_by_id.get(item_id, f"Heuristic {item_id}"),
                        score=score_val,
                        severity=severity,
                        findings=item.get("findings", []),
                        suggestions=item.get("suggestions", []),
                    )
                )

            # Ensure exactly 10 items — pad if LLM returned fewer
            returned_ids = {s.id for s in scores}
            for h in HEURISTICS:
                if HeuristicId(h["id"]) not in returned_ids:
                    scores.append(
                        HeuristicScore(
                            id=HeuristicId(h["id"]),
                            name=h["name"],
                            score=0.0,
                            severity=Severity.CRITICAL,
                            findings=["Heuristic was not evaluated in the response."],
                            suggestions=[],
                        )
                    )

            # Sort by id and return first 10
            scores.sort(key=lambda s: s.id)
            return scores[:10]

        except Exception:
            # Return 10 zeroed scores on parse failure
            return [
                HeuristicScore(
                    id=HeuristicId(h["id"]),
                    name=h["name"],
                    score=0.0,
                    severity=Severity.CRITICAL,
                    findings=["Analysis failed: could not parse LLM response"],
                    suggestions=[],
                )
                for h in HEURISTICS
            ]
