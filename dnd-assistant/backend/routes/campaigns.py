from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn

router = APIRouter(prefix="/campaigns")


class CampaignIn(BaseModel):
    name: str
    setting: str = ""
    party_size: int = 4
    avg_level: int = 1


@router.get("")
def list_campaigns():
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT c.*,
                (SELECT COUNT(*) FROM npcs WHERE campaign_id = c.id) as npc_count,
                (SELECT COUNT(*) FROM session_notes WHERE campaign_id = c.id) as session_count,
                (SELECT COUNT(*) FROM encounters WHERE campaign_id = c.id) as encounter_count
            FROM campaigns c ORDER BY c.created_at DESC
        """).fetchall()
    return [dict(r) for r in rows]


@router.post("")
def create_campaign(body: CampaignIn):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO campaigns (name, setting, party_size, avg_level) VALUES (?,?,?,?)",
            (body.name, body.setting, body.party_size, body.avg_level),
        )
        row = conn.execute("SELECT * FROM campaigns WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.get("/{campaign_id}")
def get_campaign(campaign_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Campaign not found")
    return dict(row)


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM campaigns WHERE id=?", (campaign_id,))
    return {"ok": True}
