import json
import re
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_conn
from providers import chat

router = APIRouter(prefix="/query")


class NLQueryRequest(BaseModel):
    question: str


SYSTEM = """You are a data catalog query assistant. Given a natural language question about datasets and pipelines,
return a JSON filter spec. Available fields:

Datasets: name, description, owner_team, owner_person, domain, source_system, format, update_frequency, tags
SLO status values: "passing", "failing", "warning", "unknown"
Pipeline status values: "healthy", "degraded", "failed", "unknown"

Return ONLY a JSON object like:
{
  "entity": "datasets",
  "filters": {
    "owner_team": "Data Engineering",
    "slo_status": "failing",
    "pipeline_status": null,
    "domain": null,
    "search": null,
    "no_slo": false,
    "no_owner": false,
    "no_pipeline": false
  },
  "explanation": "One sentence explaining what was filtered and why"
}

Set unused filters to null or false. "entity" should be "datasets" or "pipelines".
"""


@router.post("")
async def nl_query(body: NLQueryRequest):
    prompt = f"Question: {body.question}"
    text = await chat(prompt, system=SYSTEM)

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {"error": "Could not parse AI response", "raw": text, "results": [], "explanation": ""}

    try:
        spec = json.loads(match.group())
    except json.JSONDecodeError:
        return {"error": "Malformed JSON from AI", "results": [], "explanation": ""}

    filters = spec.get("filters", {})
    explanation = spec.get("explanation", "")
    entity = spec.get("entity", "datasets")

    with get_conn() as conn:
        if entity == "pipelines":
            rows = conn.execute("""
                SELECT p.*, d.name as dataset_name, d.domain as dataset_domain
                FROM pipelines p LEFT JOIN datasets d ON p.dataset_id = d.id
            """).fetchall()
            results = [dict(r) for r in rows]
            if filters.get("pipeline_status"):
                results = [r for r in results if r["status"] == filters["pipeline_status"]]
            if filters.get("owner_team"):
                results = [r for r in results if (r["owner_team"] or "").lower() == filters["owner_team"].lower()]
        else:
            rows = conn.execute("SELECT * FROM datasets ORDER BY name").fetchall()
            datasets = [dict(r) for r in rows]

            for d in datasets:
                slos = conn.execute("SELECT status FROM slos WHERE dataset_id=?", (d["id"],)).fetchall()
                d["slo_statuses"] = [s["status"] for s in slos]
                d["slo_count"] = len(slos)
                pipes = conn.execute("SELECT status FROM pipelines WHERE dataset_id=?", (d["id"],)).fetchall()
                d["pipeline_statuses"] = [p["status"] for p in pipes]
                d["pipeline_count"] = len(pipes)

            results = datasets

            if filters.get("owner_team"):
                results = [r for r in results if (r["owner_team"] or "").lower() == filters["owner_team"].lower()]
            if filters.get("domain"):
                results = [r for r in results if (r["domain"] or "").lower() == filters["domain"].lower()]
            if filters.get("search"):
                s = filters["search"].lower()
                results = [r for r in results if s in r["name"].lower() or s in (r["description"] or "").lower()]
            if filters.get("slo_status"):
                results = [r for r in results if filters["slo_status"] in r["slo_statuses"]]
            if filters.get("no_slo"):
                results = [r for r in results if r["slo_count"] == 0]
            if filters.get("no_owner"):
                results = [r for r in results if not r["owner_team"]]
            if filters.get("no_pipeline"):
                results = [r for r in results if r["pipeline_count"] == 0]
            if filters.get("pipeline_status"):
                results = [r for r in results if filters["pipeline_status"] in r["pipeline_statuses"]]

    return {"results": results, "explanation": explanation, "entity": entity, "count": len(results)}
