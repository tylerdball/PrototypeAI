from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_conn

router = APIRouter(prefix="/campaigns/{campaign_id}/characters")


class CharacterIn(BaseModel):
    name: str
    player_name: Optional[str] = ""
    class_: Optional[str] = ""
    race: Optional[str] = ""
    level: Optional[int] = 1
    str: Optional[int] = None
    dex: Optional[int] = None
    con: Optional[int] = None
    int: Optional[int] = None
    wis: Optional[int] = None
    cha: Optional[int] = None
    hp: Optional[int] = None
    ac: Optional[int] = None
    background: Optional[str] = ""
    traits: Optional[str] = ""
    equipment: Optional[str] = ""
    spells: Optional[str] = ""
    notes: Optional[str] = ""

    model_config = {"populate_by_name": True}


@router.get("")
def list_characters(campaign_id: int):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM characters WHERE campaign_id=? ORDER BY name", (campaign_id,)
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("")
def create_character(campaign_id: int, body: CharacterIn):
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO characters
               (campaign_id, name, player_name, class, race, level,
                str, dex, con, int, wis, cha, hp, ac,
                background, traits, equipment, spells, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (campaign_id, body.name, body.player_name, body.class_, body.race, body.level,
             body.str, body.dex, body.con, body.int, body.wis, body.cha,
             body.hp, body.ac, body.background, body.traits, body.equipment, body.spells, body.notes),
        )
        row = conn.execute("SELECT * FROM characters WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.put("/{character_id}")
def update_character(campaign_id: int, character_id: int, body: CharacterIn):
    with get_conn() as conn:
        conn.execute(
            """UPDATE characters SET
               name=?, player_name=?, class=?, race=?, level=?,
               str=?, dex=?, con=?, int=?, wis=?, cha=?, hp=?, ac=?,
               background=?, traits=?, equipment=?, spells=?, notes=?
               WHERE id=? AND campaign_id=?""",
            (body.name, body.player_name, body.class_, body.race, body.level,
             body.str, body.dex, body.con, body.int, body.wis, body.cha,
             body.hp, body.ac, body.background, body.traits, body.equipment, body.spells, body.notes,
             character_id, campaign_id),
        )
        row = conn.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Character not found")
    return dict(row)


@router.delete("/{character_id}")
def delete_character(campaign_id: int, character_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM characters WHERE id=? AND campaign_id=?", (character_id, campaign_id))
    return {"ok": True}
