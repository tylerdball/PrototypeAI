"""ComparisonEngine: diff two sets of heuristic scores and generate a summary."""

from schemas import HeuristicScore, HeuristicId, HeuristicDelta
from analyzer.heuristics import HEURISTICS
import providers


class ComparisonEngine:
    async def compare(
        self,
        before: list[HeuristicScore],
        after: list[HeuristicScore],
        context: str = "",
    ) -> dict:
        """
        Diff two heuristic score sets and return a comparison dict.

        Returns keys: deltas, overall_delta, improvements, regressions, summary
        (caller attaches before/after/generated_at to form CompareReviewResponse)
        """
        # Index by heuristic id for easy lookup
        before_by_id = {s.id: s for s in before}
        after_by_id = {s.id: s for s in after}

        name_by_id = {HeuristicId(h["id"]): h["name"] for h in HEURISTICS}

        deltas: list[HeuristicDelta] = []
        improvements: list[str] = []
        regressions: list[str] = []

        for h in HEURISTICS:
            hid = HeuristicId(h["id"])
            b = before_by_id.get(hid)
            a = after_by_id.get(hid)

            before_score = b.score if b else 0.0
            after_score = a.score if a else 0.0
            delta = after_score - before_score

            heuristic_name = name_by_id.get(hid, h["name"])

            if delta > 1.0:
                improvements.append(heuristic_name)
                change_summary = f"Improved by {delta:+.1f} points."
            elif delta < -1.0:
                regressions.append(heuristic_name)
                change_summary = f"Regressed by {delta:+.1f} points."
            else:
                change_summary = f"No significant change ({delta:+.1f} points)."

            deltas.append(
                HeuristicDelta(
                    id=hid,
                    name=heuristic_name,
                    before_score=before_score,
                    after_score=after_score,
                    delta=delta,
                    change_summary=change_summary,
                )
            )

        overall_delta = (
            sum(d.after_score for d in deltas) - sum(d.before_score for d in deltas)
        ) / len(deltas)

        # Build prompt for LLM summary
        score_lines = "\n".join(
            f"  {d.id}. {d.name}: {d.before_score:.1f} → {d.after_score:.1f} (delta {d.delta:+.1f})"
            for d in deltas
        )

        improvement_text = (
            f"Improved heuristics: {', '.join(improvements)}" if improvements else "No notable improvements."
        )
        regression_text = (
            f"Regressed heuristics: {', '.join(regressions)}" if regressions else "No regressions."
        )

        summary_prompt = (
            "You are a UX expert reviewing the results of a before/after usability analysis.\n\n"
            "## Score Changes (Before → After)\n"
            f"{score_lines}\n\n"
            f"{improvement_text}\n"
            f"{regression_text}\n"
            f"Overall score delta: {overall_delta:+.2f}\n"
        )

        if context:
            summary_prompt += f"\nContext: {context}\n"

        summary_prompt += (
            "\nWrite a 2-3 sentence plain-English summary of what improved, what got worse, "
            "and the overall direction of the UX changes. Be specific about which heuristics "
            "changed meaningfully."
        )

        summary = await providers.complete(
            summary_prompt,
            system="You are a senior UX researcher summarising usability audit results.",
            max_tokens=300,
        )

        return {
            "deltas": deltas,
            "overall_delta": overall_delta,
            "improvements": improvements,
            "regressions": regressions,
            "summary": summary.strip(),
        }
