from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn
from providers import chat

router = APIRouter(prefix="/campaigns/{campaign_id}/npcs")


class NPCRequest(BaseModel):
    role: str
    hints: str = ""


@router.get("")
def list_npcs(campaign_id: int):
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM npcs WHERE campaign_id=? ORDER BY created_at DESC", (campaign_id,)).fetchall()
    return [dict(r) for r in rows]


@router.post("/generate")
async def generate_npc(campaign_id: int, body: NPCRequest):
    with get_conn() as conn:
        campaign = conn.execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    c = dict(campaign)
    prompt = f"""Generate a detailed D&D NPC for a {c['setting'] or 'generic fantasy'} campaign.
Party size: {c['party_size']}, average level: {c['avg_level']}.
Role/archetype: {body.role}
{f"Additional hints: {body.hints}" if body.hints else ""}

Respond with ONLY a JSON object (no markdown) with these fields:
{{
  "name": "Full name",
  "role": "Their role/title",
  "personality": "2-3 sentence personality description",
  "backstory": "3-4 sentence backstory",
  "secret": "One compelling secret they keep",
  "motivation": "What drives them",
  "speech_pattern": "How they speak (accent, vocabulary, mannerisms)"
}}"""

    import json, re
    text = await chat(prompt)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise HTTPException(500, "AI returned malformed response")
    data = json.loads(match.group())

    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO npcs (campaign_id, name, role, personality, backstory, secret, motivation, speech_pattern) VALUES (?,?,?,?,?,?,?,?)",
            (campaign_id, data.get("name"), data.get("role"), data.get("personality"),
             data.get("backstory"), data.get("secret"), data.get("motivation"), data.get("speech_pattern")),
        )
        row = conn.execute("SELECT * FROM npcs WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.delete("/{npc_id}")
def delete_npc(campaign_id: int, npc_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM npcs WHERE id=? AND campaign_id=?", (npc_id, campaign_id))
    return {"ok": True}
