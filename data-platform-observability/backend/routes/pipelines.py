from fastapi import APIRouter, Query
from typing import Optional
from database import get_conn

router = APIRouter(prefix="/pipelines")


@router.get("")
def list_pipelines(status: Optional[str] = Query(None), owner_team: Optional[str] = Query(None)):
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT p.*, d.name as dataset_name, d.domain as dataset_domain
            FROM pipelines p
            LEFT JOIN datasets d ON p.dataset_id = d.id
            ORDER BY p.status DESC, p.name
        """).fetchall()
    pipelines = [dict(r) for r in rows]
    if status:
        pipelines = [p for p in pipelines if p["status"] == status]
    if owner_team:
        pipelines = [p for p in pipelines if p["owner_team"] == owner_team]
    return pipelines
