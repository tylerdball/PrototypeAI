import json
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

import database
import providers

router = APIRouter(tags=["raci"])


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json_object(text: str) -> dict[str, Any]:
    clean = _strip_json_fences(text)
    try:
        return json.loads(clean)
    except Exception:
        match = re.search(r"\{[\s\S]*\}", clean)
        if not match:
            raise
        return json.loads(match.group(0))


def _require_project(project_id: int) -> dict[str, Any]:
    project = database.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectPatch(BaseModel):
    name: str | None = None
    description: str | None = None


class PersonCreate(BaseModel):
    person_id: int | None = None
    name: str | None = None
    title: str = ""
    email: str = ""


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "not_started"
    due_date: str | None = None


class TaskPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    due_date: str | None = None


class AssignmentInput(BaseModel):
    person_id: int
    role: str


class AssignmentReplace(BaseModel):
    assignments: list[AssignmentInput] = Field(default_factory=list)


class ShareTokenCreate(BaseModel):
    label: str = ""


class SuggestAssignmentsInput(BaseModel):
    task_title: str
    task_description: str = ""


@router.get("/projects")
async def list_projects():
    return database.list_projects()


@router.post("/projects", status_code=201)
async def create_project(body: ProjectCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Project name is required")
    return database.create_project(body.name, body.description)


@router.get("/projects/{project_id}")
async def get_project(project_id: int):
    project = database.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}")
async def patch_project(project_id: int, body: ProjectPatch):
    updated = database.update_project(project_id, body.name, body.description)
    if updated is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int):
    deleted = database.delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@router.get("/projects/{project_id}/people")
async def list_people(project_id: int):
    _require_project(project_id)
    return database.list_project_people(project_id)


@router.post("/projects/{project_id}/people", status_code=201)
async def add_person(project_id: int, body: PersonCreate):
    _require_project(project_id)
    if body.person_id is None and not (body.name or "").strip():
        raise HTTPException(status_code=400, detail="Name is required when creating a new person")
    try:
        return database.add_project_person(
            project_id=project_id,
            person_id=body.person_id,
            name=body.name,
            title=body.title,
            email=body.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/projects/{project_id}/people/{person_id}")
async def remove_person(project_id: int, person_id: int):
    _require_project(project_id)
    deleted = database.remove_project_person(project_id, person_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project person not found")
    return {"deleted": True}


@router.get("/projects/{project_id}/tasks")
async def list_tasks(project_id: int):
    _require_project(project_id)
    tasks = database.list_tasks(project_id)
    for task in tasks:
        task["assignments"] = database.get_task_assignments(task["id"])
    return tasks


@router.post("/projects/{project_id}/tasks", status_code=201)
async def create_task(project_id: int, body: TaskCreate):
    _require_project(project_id)
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="Task title is required")
    task = database.create_task(project_id, body.title, body.description, body.status, body.due_date)
    task["assignments"] = []
    return task


@router.get("/projects/{project_id}/tasks/{task_id}")
async def get_task(project_id: int, task_id: int):
    _require_project(project_id)
    task = database.get_task(task_id)
    if task is None or task["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Task not found")
    task["assignments"] = database.get_task_assignments(task_id)
    return task


@router.patch("/projects/{project_id}/tasks/{task_id}")
async def patch_task(project_id: int, task_id: int, body: TaskPatch):
    _require_project(project_id)
    updated = database.update_task(project_id, task_id, body.title, body.description, body.status, body.due_date)
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    updated["assignments"] = database.get_task_assignments(task_id)
    return updated


@router.delete("/projects/{project_id}/tasks/{task_id}")
async def delete_task(project_id: int, task_id: int):
    _require_project(project_id)
    deleted = database.delete_task(project_id, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True}


@router.put("/projects/{project_id}/tasks/{task_id}/assignments")
async def put_task_assignments(project_id: int, task_id: int, body: AssignmentReplace):
    _require_project(project_id)
    try:
        return {
            "task_id": task_id,
            "assignments": database.set_task_assignments(
                project_id,
                task_id,
                [a.model_dump() for a in body.assignments],
            ),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}/matrix")
async def get_matrix(project_id: int):
    matrix = database.build_matrix(project_id)
    if matrix is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return matrix


@router.get("/projects/{project_id}/digest")
async def get_digest(project_id: int, window: str = "week"):
    _require_project(project_id)
    return database.get_due_digest(project_id, window)


@router.get("/projects/{project_id}/alerts")
async def get_alerts(project_id: int):
    _require_project(project_id)
    return database.get_alerts(project_id)


@router.get("/projects/{project_id}/export.csv")
async def export_csv(project_id: int):
    _require_project(project_id)
    csv_text = database.export_project_csv(project_id)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=project-{project_id}-raci.csv"},
    )


@router.get("/projects/{project_id}/share-tokens")
async def get_share_tokens(project_id: int):
    _require_project(project_id)
    return database.list_share_tokens(project_id)


@router.post("/projects/{project_id}/share-tokens", status_code=201)
async def post_share_token(project_id: int, body: ShareTokenCreate):
    _require_project(project_id)
    return database.create_share_token(project_id, body.label)


@router.delete("/projects/{project_id}/share-tokens/{token}")
async def delete_share_token(project_id: int, token: str):
    _require_project(project_id)
    revoked = database.revoke_share_token(project_id, token)
    if not revoked:
        raise HTTPException(status_code=404, detail="Share token not found")
    return {"revoked": True}


@router.get("/share/{token}")
async def get_shared(token: str):
    shared = database.get_shared_project(token)
    if shared is None:
        raise HTTPException(status_code=404, detail="Share link not found")
    return shared


@router.get("/ai/provider")
async def ai_provider_info():
    return providers.get_provider_info()


@router.post("/projects/{project_id}/ai/suggest-assignments")
async def ai_suggest_assignments(project_id: int, body: SuggestAssignmentsInput):
    project = _require_project(project_id)
    people = database.list_project_people(project_id)
    if not people:
        raise HTTPException(status_code=400, detail="Project has no people")

    roster = [
        {"person_id": p["id"], "name": p["name"], "title": p.get("title", "")}
        for p in people
    ]

    prompt = (
        f"Project: {project['name']}\n"
        f"Task title: {body.task_title}\n"
        f"Task description: {body.task_description}\n"
        f"Roster: {json.dumps(roster)}\n\n"
        "Return JSON with keys R, A, C, I."
        "Each key must contain an array of PERSON NAMES from roster."
        "Exactly one name in A."
    )

    system = (
        "You are a RACI facilitator. Provide practical role assignments. "
        "Respond only as valid JSON with keys R,A,C,I."
    )

    fallback = {
        "R": [people[0]["name"]],
        "A": [people[0]["name"]],
        "C": [p["name"] for p in people[1:2]],
        "I": [p["name"] for p in people[2:]],
    }

    parsed: dict[str, Any]
    try:
        raw = await providers.complete(prompt=prompt, system=system, json_mode=True, temperature=0.2)
        parsed = _extract_json_object(raw)
    except Exception:
        parsed = fallback

    name_to_person = {p["name"].strip().lower(): p for p in people}
    assignments = []
    for role in ["R", "A", "C", "I"]:
        names = parsed.get(role, [])
        if not isinstance(names, list):
            continue
        for name in names:
            if not isinstance(name, str):
                continue
            person = name_to_person.get(name.strip().lower())
            if person:
                assignments.append(
                    {
                        "person_id": person["id"],
                        "name": person["name"],
                        "role": role,
                    }
                )

    # Ensure we always return exactly one A suggestion.
    a_count = sum(1 for a in assignments if a["role"] == "A")
    if a_count != 1:
        assignments = [a for a in assignments if a["role"] != "A"]
        assignments.append({"person_id": people[0]["id"], "name": people[0]["name"], "role": "A"})

    # Remove exact duplicates.
    seen = set()
    deduped = []
    for item in assignments:
        key = (item["person_id"], item["role"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return {"task_title": body.task_title, "assignments": deduped}


@router.post("/projects/{project_id}/ai/flags")
async def ai_flags(project_id: int):
    project = _require_project(project_id)
    alerts = database.get_alerts(project_id)
    matrix = database.build_matrix(project_id)
    if matrix is None:
        raise HTTPException(status_code=404, detail="Project not found")

    prompt = (
        f"Project: {project['name']}\n"
        f"Alerts: {json.dumps(alerts)}\n"
        f"Matrix summary task count: {len(matrix['tasks'])}\n"
        "Provide a concise stakeholder-facing explanation and top 3 actions. "
        "Respond as JSON with keys summary and actions (array of strings)."
    )

    system = "You analyze RACI health and propose practical actions. Respond only JSON."
    fallback = {
        "summary": "RACI health review completed with deterministic checks.",
        "actions": [
            "Ensure every task has exactly one accountable owner.",
            "Rebalance accountable ownership where load exceeds 3 tasks.",
            "Review near-term due tasks and confirm responsible owners.",
        ],
    }

    try:
        raw = await providers.complete(prompt=prompt, system=system, json_mode=True, temperature=0.2)
        ai = _extract_json_object(raw)
    except Exception:
        ai = fallback

    return {
        "alerts": alerts,
        "ai": {
            "summary": ai.get("summary", fallback["summary"]),
            "actions": ai.get("actions", fallback["actions"]),
        },
    }


@router.post("/projects/{project_id}/ai/stakeholder-summary")
async def ai_stakeholder_summary(project_id: int):
    project = _require_project(project_id)
    matrix = database.build_matrix(project_id)
    if matrix is None:
        raise HTTPException(status_code=404, detail="Project not found")
    digest = database.get_due_digest(project_id)
    alerts = database.get_alerts(project_id)

    prompt = (
        f"Project: {project['name']}\n"
        f"Task count: {len(matrix['tasks'])}\n"
        f"Due this week: {len(digest['due_tasks'])}\n"
        f"Status counts: {json.dumps(digest['status_counts'])}\n"
        f"Alerts: {json.dumps(alerts)}\n"
        "Draft a concise executive summary in plain English (5-8 sentences)."
    )

    system = "You write stakeholder updates for program managers."
    fallback = (
        f"{project['name']} currently tracks {len(matrix['tasks'])} tasks. "
        f"There are {len(digest['due_tasks'])} tasks due in the next 7 days. "
        "Deterministic checks identified accountability and owner-load signals; see alerts for detail."
    )

    try:
        summary = await providers.complete(prompt=prompt, system=system, temperature=0.3)
        summary = summary.strip() or fallback
    except Exception:
        summary = fallback

    return {"summary": summary}
