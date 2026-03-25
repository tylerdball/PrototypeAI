from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import get_conn

router = APIRouter(prefix="/datasets")


class DatasetIn(BaseModel):
    name: str
    description: Optional[str] = ""
    owner_team: Optional[str] = ""
    owner_person: Optional[str] = ""
    domain: Optional[str] = ""
    source_system: Optional[str] = ""
    format: Optional[str] = ""
    update_frequency: Optional[str] = ""
    tags: Optional[str] = ""


@router.get("")
def list_datasets(
    search: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    owner_team: Optional[str] = Query(None),
    slo_status: Optional[str] = Query(None),  # passing | failing | warning | unknown | none
    pipeline_status: Optional[str] = Query(None),
):
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM datasets ORDER BY name").fetchall()
        datasets = [dict(r) for r in rows]

        # Enrich with SLO + pipeline summary
        for d in datasets:
            slos = conn.execute(
                "SELECT status, COUNT(*) as cnt FROM slos WHERE dataset_id=? GROUP BY status", (d["id"],)
            ).fetchall()
            d["slo_summary"] = {s["status"]: s["cnt"] for s in slos}
            d["slo_count"] = sum(s["cnt"] for s in slos)

            pipes = conn.execute(
                "SELECT status, COUNT(*) as cnt FROM pipelines WHERE dataset_id=? GROUP BY status", (d["id"],)
            ).fetchall()
            d["pipeline_summary"] = {p["status"]: p["cnt"] for p in pipes}
            d["pipeline_count"] = sum(p["cnt"] for p in pipes)

    # Apply filters
    if search:
        s = search.lower()
        datasets = [d for d in datasets if s in d["name"].lower() or s in (d["description"] or "").lower() or s in (d["tags"] or "").lower()]
    if domain:
        datasets = [d for d in datasets if d["domain"] == domain]
    if owner_team:
        datasets = [d for d in datasets if d["owner_team"] == owner_team]
    if slo_status == "none":
        datasets = [d for d in datasets if d["slo_count"] == 0]
    elif slo_status:
        datasets = [d for d in datasets if d["slo_summary"].get(slo_status, 0) > 0]
    if pipeline_status:
        datasets = [d for d in datasets if d["pipeline_summary"].get(pipeline_status, 0) > 0]

    return datasets


@router.get("/meta")
def get_meta():
    """Return distinct filter values for the UI."""
    with get_conn() as conn:
        domains = [r[0] for r in conn.execute("SELECT DISTINCT domain FROM datasets WHERE domain != '' ORDER BY domain").fetchall()]
        teams = [r[0] for r in conn.execute("SELECT DISTINCT owner_team FROM datasets WHERE owner_team != '' ORDER BY owner_team").fetchall()]
    return {"domains": domains, "teams": teams}


@router.get("/summary")
def get_summary():
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM datasets").fetchone()[0]
        with_slos = conn.execute("SELECT COUNT(DISTINCT dataset_id) FROM slos").fetchone()[0]
        failing_slos = conn.execute("SELECT COUNT(*) FROM slos WHERE status='failing'").fetchone()[0]
        warning_slos = conn.execute("SELECT COUNT(*) FROM slos WHERE status='warning'").fetchone()[0]
        pipelines_healthy = conn.execute("SELECT COUNT(*) FROM pipelines WHERE status='healthy'").fetchone()[0]
        pipelines_degraded = conn.execute("SELECT COUNT(*) FROM pipelines WHERE status='degraded'").fetchone()[0]
        pipelines_failed = conn.execute("SELECT COUNT(*) FROM pipelines WHERE status='failed'").fetchone()[0]
        no_owner = conn.execute("SELECT COUNT(*) FROM datasets WHERE owner_team='' OR owner_team IS NULL").fetchone()[0]
        no_slo = total - with_slos
    return {
        "total_datasets": total,
        "datasets_with_slos": with_slos,
        "datasets_no_slo": no_slo,
        "failing_slos": failing_slos,
        "warning_slos": warning_slos,
        "pipelines_healthy": pipelines_healthy,
        "pipelines_degraded": pipelines_degraded,
        "pipelines_failed": pipelines_failed,
        "datasets_no_owner": no_owner,
    }


@router.get("/{dataset_id}")
def get_dataset(dataset_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM datasets WHERE id=?", (dataset_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Dataset not found")
        d = dict(row)
        d["slos"] = [dict(r) for r in conn.execute("SELECT * FROM slos WHERE dataset_id=? ORDER BY slo_type", (dataset_id,)).fetchall()]
        d["pipelines"] = [dict(r) for r in conn.execute("SELECT * FROM pipelines WHERE dataset_id=? ORDER BY name", (dataset_id,)).fetchall()]
    return d


@router.post("")
def create_dataset(body: DatasetIn):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO datasets (name, description, owner_team, owner_person, domain, source_system, format, update_frequency, tags) VALUES (?,?,?,?,?,?,?,?,?)",
            (body.name, body.description, body.owner_team, body.owner_person, body.domain, body.source_system, body.format, body.update_frequency, body.tags),
        )
        row = conn.execute("SELECT * FROM datasets WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.put("/{dataset_id}")
def update_dataset(dataset_id: int, body: DatasetIn):
    with get_conn() as conn:
        conn.execute(
            "UPDATE datasets SET name=?, description=?, owner_team=?, owner_person=?, domain=?, source_system=?, format=?, update_frequency=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (body.name, body.description, body.owner_team, body.owner_person, body.domain, body.source_system, body.format, body.update_frequency, body.tags, dataset_id),
        )
        row = conn.execute("SELECT * FROM datasets WHERE id=?", (dataset_id,)).fetchone()
    if not row:
        raise HTTPException(404)
    return dict(row)


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM datasets WHERE id=?", (dataset_id,))
    return {"ok": True}
