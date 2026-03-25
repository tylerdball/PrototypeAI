import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from database import get_conn
from providers import chat

router = APIRouter(prefix="/campaigns/{campaign_id}/sessions")


class SessionNotesRequest(BaseModel):
    session_number: int
    raw_notes: str


class QARequest(BaseModel):
    question: str


@router.get("")
def list_sessions(campaign_id: int):
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM session_notes WHERE campaign_id=? ORDER BY session_number DESC", (campaign_id,)).fetchall()
    return [dict(r) for r in rows]


@router.post("/process")
async def process_notes(campaign_id: int, body: SessionNotesRequest):
    with get_conn() as conn:
        campaign = conn.execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    prompt = f"""You are summarising D&D session notes. Extract structured information from these raw session notes.

Raw notes:
{body.raw_notes}

Respond with ONLY a JSON object (no markdown):
{{
  "summary": "2-3 sentence session summary",
  "plot_threads": "Bullet list of active plot threads and hooks",
  "npc_interactions": "Key NPC interactions and relationship changes",
  "key_events": "Important events, decisions, and outcomes"
}}"""

    import json, re
    text = await chat(prompt)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise HTTPException(500, "AI returned malformed response")
    data = json.loads(match.group())

    def to_str(val):
        if isinstance(val, list):
            return "\n".join(str(v) for v in val)
        return val or ""

    with get_conn() as conn:
        # Upsert by session number
        existing = conn.execute(
            "SELECT id FROM session_notes WHERE campaign_id=? AND session_number=?",
            (campaign_id, body.session_number)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE session_notes SET raw_notes=?, summary=?, plot_threads=?, npc_interactions=?, key_events=? WHERE id=?",
                (body.raw_notes, to_str(data.get("summary")), to_str(data.get("plot_threads")),
                 to_str(data.get("npc_interactions")), to_str(data.get("key_events")), existing["id"]),
            )
            row = conn.execute("SELECT * FROM session_notes WHERE id=?", (existing["id"],)).fetchone()
        else:
            cur = conn.execute(
                "INSERT INTO session_notes (campaign_id, session_number, raw_notes, summary, plot_threads, npc_interactions, key_events) VALUES (?,?,?,?,?,?,?)",
                (campaign_id, body.session_number, body.raw_notes, to_str(data.get("summary")),
                 to_str(data.get("plot_threads")), to_str(data.get("npc_interactions")), to_str(data.get("key_events"))),
            )
            row = conn.execute("SELECT * FROM session_notes WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.post("/ask")
async def ask_campaign(campaign_id: int, body: QARequest):
    with get_conn() as conn:
        campaign = conn.execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
        sessions = conn.execute(
            "SELECT session_number, summary, plot_threads, npc_interactions, key_events FROM session_notes WHERE campaign_id=? ORDER BY session_number",
            (campaign_id,)
        ).fetchall()
        npcs = conn.execute("SELECT name, role, personality, motivation, secret FROM npcs WHERE campaign_id=?", (campaign_id,)).fetchall()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    context_parts = []
    for s in sessions:
        s = dict(s)
        context_parts.append(f"Session {s['session_number']}:\n  Summary: {s['summary']}\n  Plot threads: {s['plot_threads']}\n  NPC interactions: {s['npc_interactions']}\n  Key events: {s['key_events']}")
    for n in npcs:
        n = dict(n)
        context_parts.append(f"NPC {n['name']} ({n['role']}): {n['personality']} Motivation: {n['motivation']}")

    if not context_parts:
        return {"answer": "No campaign data yet. Process some session notes first."}

    context = "\n\n".join(context_parts)
    prompt = f"""You are a D&D campaign assistant. Answer questions about the campaign using only the provided context.

Campaign: {dict(campaign)['name']} — {dict(campaign)['setting']}

Campaign context:
{context}

Question: {body.question}

Answer concisely and accurately based only on the context above. If the answer isn't in the context, say so."""

    answer = await chat(prompt)
    return {"answer": answer}


@router.post("/bulk-import")
async def bulk_import(campaign_id: int, files: list[UploadFile] = File(...)):
    """
    Upload multiple .txt session note files. Filename should ideally contain the session number,
    e.g. 'session_3.txt' or '03_notes.txt'. If no number is found, sessions are numbered
    sequentially starting after the highest existing session number.
    """
    import re as _re

    with get_conn() as conn:
        existing_max = conn.execute(
            "SELECT COALESCE(MAX(session_number), 0) FROM session_notes WHERE campaign_id=?", (campaign_id,)
        ).fetchone()[0]

    results = []
    auto_num = existing_max + 1

    async def process_file(f: UploadFile):
        nonlocal auto_num
        raw = (await f.read()).decode("utf-8", errors="ignore")
        # Try to extract session number from filename
        m = _re.search(r"\d+", f.filename or "")
        session_num = int(m.group()) if m else auto_num
        if not m:
            auto_num += 1

        req = SessionNotesRequest(session_number=session_num, raw_notes=raw)
        # Reuse existing process logic inline
        prompt = f"""You are summarising D&D session notes. Extract structured information from these raw session notes.

Raw notes:
{raw}

Respond with ONLY a JSON object (no markdown):
{{
  "summary": "2-3 sentence session summary",
  "plot_threads": "Bullet list of active plot threads and hooks",
  "npc_interactions": "Key NPC interactions and relationship changes",
  "key_events": "Important events, decisions, and outcomes"
}}"""
        import json, re as re2
        text = await chat(prompt)
        match = re2.search(r"\{.*\}", text, re2.DOTALL)
        data = json.loads(match.group()) if match else {}

        def to_str(val):
            if isinstance(val, list):
                return "\n".join(str(v) for v in val)
            return val or ""

        with get_conn() as conn:
            existing = conn.execute(
                "SELECT id FROM session_notes WHERE campaign_id=? AND session_number=?",
                (campaign_id, session_num)
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE session_notes SET raw_notes=?, summary=?, plot_threads=?, npc_interactions=?, key_events=? WHERE id=?",
                    (raw, to_str(data.get("summary")), to_str(data.get("plot_threads")),
                     to_str(data.get("npc_interactions")), to_str(data.get("key_events")), existing["id"]),
                )
                row = conn.execute("SELECT * FROM session_notes WHERE id=?", (existing["id"],)).fetchone()
            else:
                cur = conn.execute(
                    "INSERT INTO session_notes (campaign_id, session_number, raw_notes, summary, plot_threads, npc_interactions, key_events) VALUES (?,?,?,?,?,?,?)",
                    (campaign_id, session_num, raw, to_str(data.get("summary")),
                     to_str(data.get("plot_threads")), to_str(data.get("npc_interactions")), to_str(data.get("key_events"))),
                )
                row = conn.execute("SELECT * FROM session_notes WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)

    results = await asyncio.gather(*[process_file(f) for f in files])
    return sorted(results, key=lambda x: x["session_number"])
