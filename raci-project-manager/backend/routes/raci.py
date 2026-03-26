import json
import re
from datetime import date, timedelta
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


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

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


class TaskGroupCreate(BaseModel):
    name: str


class TaskGroupPatch(BaseModel):
    name: str | None = None
    order_index: int | None = None


class TeamCreate(BaseModel):
    name: str
    description: str = ""


class TeamPatch(BaseModel):
    name: str | None = None
    description: str | None = None


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "not_started"
    due_date: str | None = None
    group_id: int | None = None


class TaskPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    due_date: str | None = None
    group_id: int | None = None  # None = don't change; use model_fields_set to detect explicit null


class AssignmentInput(BaseModel):
    person_id: int
    role: str


class TeamAssignmentInput(BaseModel):
    team_id: int
    role: str


class AssignmentReplace(BaseModel):
    assignments: list[AssignmentInput] = Field(default_factory=list)
    team_assignments: list[TeamAssignmentInput] = Field(default_factory=list)


class ShareTokenCreate(BaseModel):
    label: str = ""


class SuggestAssignmentsInput(BaseModel):
    task_title: str
    task_description: str = ""


class TemplateRequest(BaseModel):
    project_type: str
    description: str = ""


# ---------------------------------------------------------------------------
# Project endpoints
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Task Group endpoints
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/groups")
async def list_groups(project_id: int):
    _require_project(project_id)
    return database.list_task_groups(project_id)


@router.post("/projects/{project_id}/groups", status_code=201)
async def create_group(project_id: int, body: TaskGroupCreate):
    _require_project(project_id)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Group name is required")
    return database.create_task_group(project_id, body.name)


@router.patch("/projects/{project_id}/groups/{group_id}")
async def patch_group(project_id: int, group_id: int, body: TaskGroupPatch):
    _require_project(project_id)
    updated = database.update_task_group(project_id, group_id, body.name, body.order_index)
    if updated is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return updated


@router.delete("/projects/{project_id}/groups/{group_id}")
async def delete_group(project_id: int, group_id: int):
    _require_project(project_id)
    deleted = database.delete_task_group(project_id, group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# People endpoints
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Team endpoints
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/teams")
async def list_teams(project_id: int):
    _require_project(project_id)
    return database.list_project_teams(project_id)


@router.post("/projects/{project_id}/teams", status_code=201)
async def create_team(project_id: int, body: TeamCreate):
    _require_project(project_id)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Team name is required")
    return database.create_team(project_id, body.name, body.description)


@router.patch("/projects/{project_id}/teams/{team_id}")
async def patch_team(project_id: int, team_id: int, body: TeamPatch):
    _require_project(project_id)
    # Simple update — re-use create with current values for now
    teams = database.list_project_teams(project_id)
    team = next((t for t in teams if t["id"] == team_id), None)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    conn = database.get_db()
    conn.execute(
        "UPDATE teams SET name = ?, description = ? WHERE id = ? AND project_id = ?",
        (
            body.name.strip() if body.name is not None else team["name"],
            body.description.strip() if body.description is not None else team["description"],
            team_id,
            project_id,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
    conn.close()
    return dict(row)


@router.delete("/projects/{project_id}/teams/{team_id}")
async def delete_team(project_id: int, team_id: int):
    _require_project(project_id)
    deleted = database.delete_team(project_id, team_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Task endpoints
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/tasks")
async def list_tasks(project_id: int):
    _require_project(project_id)
    tasks = database.list_tasks(project_id)
    for task in tasks:
        task["assignments"] = database.get_task_assignments(task["id"])
        task["team_assignments"] = database.get_team_task_assignments(task["id"])
    return tasks


@router.post("/projects/{project_id}/tasks", status_code=201)
async def create_task(project_id: int, body: TaskCreate):
    _require_project(project_id)
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="Task title is required")
    task = database.create_task(
        project_id, body.title, body.description, body.status, body.due_date, body.group_id
    )
    task["assignments"] = []
    task["team_assignments"] = []
    return task


@router.get("/projects/{project_id}/tasks/{task_id}")
async def get_task(project_id: int, task_id: int):
    _require_project(project_id)
    task = database.get_task(task_id)
    if task is None or task["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Task not found")
    task["assignments"] = database.get_task_assignments(task_id)
    task["team_assignments"] = database.get_team_task_assignments(task_id)
    return task


@router.patch("/projects/{project_id}/tasks/{task_id}")
async def patch_task(project_id: int, task_id: int, body: TaskPatch):
    _require_project(project_id)
    clear_group = "group_id" in body.model_fields_set and body.group_id is None
    updated = database.update_task(
        project_id, task_id, body.title, body.description, body.status, body.due_date,
        body.group_id, clear_group
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    updated["assignments"] = database.get_task_assignments(task_id)
    updated["team_assignments"] = database.get_team_task_assignments(task_id)
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
            "assignments": database.set_task_assignments_v2(
                project_id,
                task_id,
                [a.model_dump() for a in body.assignments],
                [a.model_dump() for a in body.team_assignments],
            ),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Matrix, Digest, Alerts, Export
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Share tokens
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# AI endpoints
# ---------------------------------------------------------------------------

@router.get("/ai/provider")
async def ai_provider_info():
    return providers.get_provider_info()


@router.post("/projects/{project_id}/ai/suggest-assignments")
async def ai_suggest_assignments(project_id: int, body: SuggestAssignmentsInput):
    project = _require_project(project_id)
    people = database.list_project_people(project_id)
    teams = database.list_project_teams(project_id)
    if not people and not teams:
        raise HTTPException(status_code=400, detail="Project has no people or teams")

    roster = [
        {"person_id": p["id"], "name": p["name"], "title": p.get("title", ""), "type": "person"}
        for p in people
    ] + [
        {"team_id": t["id"], "name": t["name"], "type": "team"}
        for t in teams
    ]

    prompt = (
        f"Project: {project['name']}\n"
        f"Task title: {body.task_title}\n"
        f"Task description: {body.task_description}\n"
        f"Roster: {json.dumps(roster)}\n\n"
        "Return JSON with keys R, A, C, I. "
        "Each key must contain an array of NAMES from the roster. "
        "Exactly one name in A."
    )

    system = (
        "You are a RACI facilitator. Provide practical role assignments. "
        "Respond only as valid JSON with keys R,A,C,I."
    )

    all_roster = people + [{"id": None, **t, "name": t["name"]} for t in teams]
    fallback_person = people[0] if people else None
    fallback = {
        "R": [fallback_person["name"]] if fallback_person else [],
        "A": [fallback_person["name"]] if fallback_person else [teams[0]["name"]],
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
    name_to_team = {t["name"].strip().lower(): t for t in teams}
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
                assignments.append({"person_id": person["id"], "name": person["name"], "role": role, "type": "person"})
                continue
            team = name_to_team.get(name.strip().lower())
            if team:
                assignments.append({"team_id": team["id"], "name": team["name"], "role": role, "type": "team"})

    # Ensure exactly one A
    a_count = sum(1 for a in assignments if a["role"] == "A")
    if a_count != 1:
        assignments = [a for a in assignments if a["role"] != "A"]
        if people:
            assignments.append({"person_id": people[0]["id"], "name": people[0]["name"], "role": "A", "type": "person"})
        elif teams:
            assignments.append({"team_id": teams[0]["id"], "name": teams[0]["name"], "role": "A", "type": "team"})

    # Deduplicate
    seen: set = set()
    deduped = []
    for item in assignments:
        key = (item.get("person_id"), item.get("team_id"), item["role"])
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


async def _run_template_prompt(project_type: str, description: str, context: str = "") -> dict[str, Any]:
    """Call the AI to generate a project template structure."""
    context_block = f"\n\nExisting projects for reference:\n{context}" if context else ""
    prompt = (
        f"Project type: {project_type}\n"
        f"Description: {description}{context_block}\n\n"
        "Generate a RACI project template. Return ONLY valid JSON with this exact shape:\n"
        '{"name": "...", "description": "...", "groups": [{"name": "...", "order_index": 0, '
        '"tasks": [{"title": "...", "description": "...", "due_days": 14}]}]}\n'
        "due_days is the number of days from today when this task should be due (integer, 1-90). "
        "Space tasks realistically across the project timeline. "
        "Include 3-5 groups with 2-5 tasks each. Keep task titles concise and action-oriented."
    )
    system = (
        "You are a project manager creating RACI project templates. "
        "Respond only with valid JSON matching the requested schema. No markdown, no explanation."
    )
    raw = await providers.complete(prompt=prompt, system=system, json_mode=True, temperature=0.4)
    return _extract_json_object(raw)


def _create_project_from_template(parsed: dict[str, Any]) -> dict[str, Any]:
    """Create a project + groups + tasks from parsed AI template JSON."""
    name = str(parsed.get("name", "New Project")).strip() or "New Project"
    description = str(parsed.get("description", "")).strip()
    project = database.create_project(name, description)
    project_id = project["id"]

    groups_created = 0
    tasks_created = 0

    for group_data in parsed.get("groups", []):
        group_name = str(group_data.get("name", "")).strip()
        if not group_name:
            continue
        group = database.create_task_group(project_id, group_name)
        groups_created += 1

        for task_data in group_data.get("tasks", []):
            task_title = str(task_data.get("title", "")).strip()
            if not task_title:
                continue
            task_desc = str(task_data.get("description", "")).strip()
            due_date = None
            try:
                due_days = int(task_data.get("due_days") or 0)
                if due_days > 0:
                    due_date = (date.today() + timedelta(days=due_days)).isoformat()
            except (TypeError, ValueError):
                pass
            database.create_task(project_id, task_title, task_desc, "not_started", due_date, group["id"])
            tasks_created += 1

    return {
        "project_id": project_id,
        "project": project,
        "groups_created": groups_created,
        "tasks_created": tasks_created,
        "message": f"Created project with {groups_created} groups and {tasks_created} tasks.",
    }


@router.post("/ai/generate-template", status_code=201)
async def ai_generate_template(body: TemplateRequest):
    if not body.project_type.strip():
        raise HTTPException(status_code=400, detail="project_type is required")

    fallback_template = {
        "name": body.project_type,
        "description": body.description,
        "groups": [
            {"name": "Planning", "order_index": 0, "tasks": [
                {"title": "Define scope and objectives", "description": ""},
                {"title": "Identify stakeholders", "description": ""},
                {"title": "Create project plan", "description": ""},
            ]},
            {"name": "Execution", "order_index": 1, "tasks": [
                {"title": "Kick off with team", "description": ""},
                {"title": "Complete primary deliverables", "description": ""},
                {"title": "Track progress and status", "description": ""},
            ]},
            {"name": "Closeout", "order_index": 2, "tasks": [
                {"title": "Review and sign-off", "description": ""},
                {"title": "Document lessons learned", "description": ""},
            ]},
        ],
    }

    try:
        parsed = await _run_template_prompt(body.project_type, body.description)
    except Exception:
        parsed = fallback_template

    try:
        return _create_project_from_template(parsed)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create project from template: {exc}")


@router.post("/ai/suggest-from-existing", status_code=201)
async def ai_suggest_from_existing(body: TemplateRequest):
    if not body.project_type.strip():
        raise HTTPException(status_code=400, detail="project_type is required")

    projects = database.list_projects()
    context = ""
    if projects:
        summaries = []
        for proj in projects[:10]:
            groups = database.list_task_groups(proj["id"])
            tasks = database.list_tasks(proj["id"])
            summaries.append({
                "name": proj["name"],
                "description": (proj.get("description") or "")[:150],
                "groups": [g["name"] for g in groups],
                "sample_tasks": [t["title"] for t in tasks[:8]],
            })
        context = json.dumps(summaries, indent=2)

    fallback_template = {
        "name": body.project_type,
        "description": body.description,
        "groups": [
            {"name": "Planning", "order_index": 0, "tasks": [
                {"title": "Define scope", "description": ""},
                {"title": "Identify stakeholders", "description": ""},
            ]},
            {"name": "Execution", "order_index": 1, "tasks": [
                {"title": "Deliver primary workstreams", "description": ""},
                {"title": "Track and report progress", "description": ""},
            ]},
            {"name": "Closeout", "order_index": 2, "tasks": [
                {"title": "Final review and sign-off", "description": ""},
                {"title": "Document lessons learned", "description": ""},
            ]},
        ],
    }

    try:
        parsed = await _run_template_prompt(body.project_type, body.description, context)
    except Exception:
        parsed = fallback_template

    try:
        return _create_project_from_template(parsed)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create project from template: {exc}")
