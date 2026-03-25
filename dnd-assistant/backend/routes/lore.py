from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_conn

router = APIRouter(prefix="/campaigns/{campaign_id}/lore")

CATEGORIES = ["general", "factions", "locations", "history", "religion", "npcs", "rules", "other"]


class LoreIn(BaseModel):
    title: str
    category: Optional[str] = "general"
    content: str


@router.get("")
def list_lore(campaign_id: int):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM lore_entries WHERE campaign_id=? ORDER BY category, title", (campaign_id,)
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("")
def create_lore(campaign_id: int, body: LoreIn):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO lore_entries (campaign_id, title, category, content) VALUES (?,?,?,?)",
            (campaign_id, body.title, body.category, body.content),
        )
        row = conn.execute("SELECT * FROM lore_entries WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.put("/{lore_id}")
def update_lore(campaign_id: int, lore_id: int, body: LoreIn):
    with get_conn() as conn:
        conn.execute(
            "UPDATE lore_entries SET title=?, category=?, content=? WHERE id=? AND campaign_id=?",
            (body.title, body.category, body.content, lore_id, campaign_id),
        )
        row = conn.execute("SELECT * FROM lore_entries WHERE id=?", (lore_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Entry not found")
    return dict(row)


@router.delete("/{lore_id}")
def delete_lore(campaign_id: int, lore_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM lore_entries WHERE id=? AND campaign_id=?", (lore_id, campaign_id))
    return {"ok": True}
