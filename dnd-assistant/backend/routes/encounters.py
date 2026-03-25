from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn
from providers import chat

router = APIRouter(prefix="/campaigns/{campaign_id}/encounters")


class EncounterRequest(BaseModel):
    difficulty: str  # easy | medium | hard | deadly
    environment: str = ""
    notes: str = ""


@router.get("")
def list_encounters(campaign_id: int):
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM encounters WHERE campaign_id=? ORDER BY created_at DESC", (campaign_id,)).fetchall()
    return [dict(r) for r in rows]


@router.post("/generate")
async def generate_encounter(campaign_id: int, body: EncounterRequest):
    with get_conn() as conn:
        campaign = conn.execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    c = dict(campaign)
    prompt = f"""Design a {body.difficulty} D&D 5e encounter for a party of {c['party_size']} players at average level {c['avg_level']}.
Setting: {c['setting'] or 'generic fantasy'}
{f"Environment: {body.environment}" if body.environment else ""}
{f"Notes: {body.notes}" if body.notes else ""}

Respond with ONLY a JSON object (no markdown):
{{
  "name": "Encounter name",
  "difficulty": "{body.difficulty}",
  "monsters": "List of monsters with CR and count, e.g. '3x Goblin (CR 1/4), 1x Goblin Boss (CR 1)'",
  "tactics": "How the monsters fight and behave",
  "notes": "Terrain, traps, or other interesting elements"
}}"""

    import json, re
    text = await chat(prompt)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise HTTPException(500, "AI returned malformed response")
    data = json.loads(match.group())

    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO encounters (campaign_id, name, difficulty, monsters, tactics, notes) VALUES (?,?,?,?,?,?)",
            (campaign_id, data.get("name"), data.get("difficulty"), data.get("monsters"),
             data.get("tactics"), data.get("notes")),
        )
        row = conn.execute("SELECT * FROM encounters WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.delete("/{encounter_id}")
def delete_encounter(campaign_id: int, encounter_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM encounters WHERE id=? AND campaign_id=?", (encounter_id, campaign_id))
    return {"ok": True}
