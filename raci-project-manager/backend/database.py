"""SQLite persistence helpers for the RACI Project Manager."""

import csv
import io
import os
import secrets
import sqlite3
from datetime import date, datetime, timedelta
from typing import Any

DB_PATH = os.getenv("DB_PATH", "./raci_project_manager.db")
VALID_STATUSES = {"not_started", "in_progress", "blocked", "done"}
VALID_ROLES = {"R", "A", "C", "I"}

DDL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS people (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    title       TEXT DEFAULT '',
    email       TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_people (
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    person_id   INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    created_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (project_id, person_id)
);

CREATE TABLE IF NOT EXISTS task_groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'not_started',
    due_date    TEXT DEFAULT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_assignments (
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    person_id   INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (task_id, person_id, role)
);

CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_task_assignments (
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (task_id, team_id, role)
);

CREATE TABLE IF NOT EXISTS share_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    label       TEXT DEFAULT '',
    revoked     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    revoked_at  TEXT DEFAULT NULL
);
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_tables() -> None:
    conn = get_db()
    conn.executescript(DDL)
    conn.commit()
    # Additive migration — safe to re-run on existing DBs
    for migration in [
        "ALTER TABLE tasks ADD COLUMN group_id INTEGER REFERENCES task_groups(id)",
    ]:
        try:
            conn.execute(migration)
            conn.commit()
        except Exception:
            pass  # column already exists
    conn.close()


def _dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def _touch_project(conn: sqlite3.Connection, project_id: int) -> None:
    conn.execute("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", (project_id,))


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

def list_projects() -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT p.*,
               (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
               (SELECT COUNT(*) FROM project_people pp WHERE pp.project_id = p.id) AS people_count
        FROM projects p
        ORDER BY p.updated_at DESC, p.created_at DESC
        """
    ).fetchall()
    conn.close()
    return _dicts(rows)


def create_project(name: str, description: str) -> dict[str, Any]:
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO projects (name, description) VALUES (?, ?)",
        (name.strip(), description.strip()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def get_project(project_id: int) -> dict[str, Any] | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if row is None:
        conn.close()
        return None
    result = dict(row)
    result["task_count"] = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE project_id = ?", (project_id,)
    ).fetchone()[0]
    result["people_count"] = conn.execute(
        "SELECT COUNT(*) FROM project_people WHERE project_id = ?", (project_id,)
    ).fetchone()[0]
    conn.close()
    return result


def update_project(project_id: int, name: str | None, description: str | None) -> dict[str, Any] | None:
    conn = get_db()
    current = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if current is None:
        conn.close()
        return None
    next_name = name.strip() if name is not None else current["name"]
    next_description = description.strip() if description is not None else current["description"]
    conn.execute(
        "UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?",
        (next_name, next_description, project_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    return dict(row)


def delete_project(project_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Task Groups
# ---------------------------------------------------------------------------

def list_task_groups(project_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM task_groups WHERE project_id = ? ORDER BY order_index ASC, id ASC",
        (project_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def create_task_group(project_id: int, name: str) -> dict[str, Any]:
    conn = get_db()
    order = conn.execute(
        "SELECT COALESCE(MAX(order_index), -1) + 1 FROM task_groups WHERE project_id = ?",
        (project_id,),
    ).fetchone()[0]
    cur = conn.execute(
        "INSERT INTO task_groups (project_id, name, order_index) VALUES (?, ?, ?)",
        (project_id, name.strip(), order),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM task_groups WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def update_task_group(
    project_id: int, group_id: int, name: str | None, order_index: int | None
) -> dict[str, Any] | None:
    conn = get_db()
    current = conn.execute(
        "SELECT * FROM task_groups WHERE id = ? AND project_id = ?", (group_id, project_id)
    ).fetchone()
    if current is None:
        conn.close()
        return None
    next_name = name.strip() if name is not None else current["name"]
    next_order = order_index if order_index is not None else current["order_index"]
    conn.execute(
        "UPDATE task_groups SET name = ?, order_index = ? WHERE id = ?",
        (next_name, next_order, group_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM task_groups WHERE id = ?", (group_id,)).fetchone()
    conn.close()
    return dict(row)


def delete_task_group(project_id: int, group_id: int) -> bool:
    conn = get_db()
    cur = conn.execute(
        "DELETE FROM task_groups WHERE id = ? AND project_id = ?", (group_id, project_id)
    )
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------

def list_project_people(project_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT pe.*,
               (SELECT COUNT(*)
                FROM task_assignments ta
                JOIN tasks t ON t.id = ta.task_id
                WHERE ta.person_id = pe.id AND t.project_id = pp.project_id) AS assignment_count
        FROM project_people pp
        JOIN people pe ON pe.id = pp.person_id
        WHERE pp.project_id = ?
        ORDER BY pe.name COLLATE NOCASE
        """,
        (project_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def _is_project_member(conn: sqlite3.Connection, project_id: int, person_id: int) -> bool:
    row = conn.execute(
        "SELECT 1 FROM project_people WHERE project_id = ? AND person_id = ?",
        (project_id, person_id),
    ).fetchone()
    return row is not None


def add_project_person(
    project_id: int,
    person_id: int | None,
    name: str | None,
    title: str | None,
    email: str | None,
) -> dict[str, Any]:
    conn = get_db()
    if person_id is None:
        cur = conn.execute(
            "INSERT INTO people (name, title, email) VALUES (?, ?, ?)",
            (
                (name or "").strip(),
                (title or "").strip(),
                (email or "").strip(),
            ),
        )
        person_id = cur.lastrowid
    else:
        exists = conn.execute("SELECT id FROM people WHERE id = ?", (person_id,)).fetchone()
        if exists is None:
            conn.close()
            raise ValueError("Person not found")

    conn.execute(
        "INSERT OR IGNORE INTO project_people (project_id, person_id) VALUES (?, ?)",
        (project_id, person_id),
    )
    _touch_project(conn, project_id)
    conn.commit()
    row = conn.execute("SELECT * FROM people WHERE id = ?", (person_id,)).fetchone()
    conn.close()
    return dict(row)


def remove_project_person(project_id: int, person_id: int) -> bool:
    conn = get_db()
    conn.execute(
        """
        DELETE FROM task_assignments
        WHERE person_id = ?
          AND task_id IN (SELECT id FROM tasks WHERE project_id = ?)
        """,
        (person_id, project_id),
    )
    cur = conn.execute(
        "DELETE FROM project_people WHERE project_id = ? AND person_id = ?",
        (project_id, person_id),
    )
    _touch_project(conn, project_id)
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Teams
# ---------------------------------------------------------------------------

def list_project_teams(project_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM teams WHERE project_id = ? ORDER BY name COLLATE NOCASE",
        (project_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def create_team(project_id: int, name: str, description: str = "") -> dict[str, Any]:
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO teams (project_id, name, description) VALUES (?, ?, ?)",
        (project_id, name.strip(), description.strip()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM teams WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def delete_team(project_id: int, team_id: int) -> bool:
    conn = get_db()
    cur = conn.execute(
        "DELETE FROM teams WHERE id = ? AND project_id = ?", (team_id, project_id)
    )
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

def list_tasks(project_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT t.*, tg.name AS group_name, tg.order_index AS group_order
        FROM tasks t
        LEFT JOIN task_groups tg ON tg.id = t.group_id
        WHERE t.project_id = ?
        ORDER BY (tg.order_index IS NULL), tg.order_index ASC, tg.id ASC, t.created_at ASC
        """,
        (project_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def create_task(
    project_id: int,
    title: str,
    description: str,
    status: str,
    due_date: str | None,
    group_id: int | None = None,
) -> dict[str, Any]:
    status = status if status in VALID_STATUSES else "not_started"
    conn = get_db()
    cur = conn.execute(
        """
        INSERT INTO tasks (project_id, title, description, status, due_date, group_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (project_id, title.strip(), description.strip(), status, due_date, group_id),
    )
    _touch_project(conn, project_id)
    conn.commit()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def get_task(task_id: int) -> dict[str, Any] | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    return None if row is None else dict(row)


def update_task(
    project_id: int,
    task_id: int,
    title: str | None,
    description: str | None,
    status: str | None,
    due_date: str | None,
    group_id: int | None = None,
    clear_group: bool = False,
) -> dict[str, Any] | None:
    conn = get_db()
    current = conn.execute(
        "SELECT * FROM tasks WHERE id = ? AND project_id = ?", (task_id, project_id)
    ).fetchone()
    if current is None:
        conn.close()
        return None

    next_status = status if status in VALID_STATUSES else current["status"]
    next_title = title.strip() if title is not None else current["title"]
    next_description = description.strip() if description is not None else current["description"]
    next_due = due_date if due_date is not None else current["due_date"]
    if clear_group:
        next_group = None
    elif group_id is not None:
        next_group = group_id
    else:
        next_group = current["group_id"]

    conn.execute(
        """
        UPDATE tasks
        SET title = ?, description = ?, status = ?, due_date = ?, group_id = ?, updated_at = datetime('now')
        WHERE id = ?
        """,
        (next_title, next_description, next_status, next_due, next_group, task_id),
    )
    _touch_project(conn, project_id)
    conn.commit()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    return dict(row)


def delete_task(project_id: int, task_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM tasks WHERE id = ? AND project_id = ?", (task_id, project_id))
    _touch_project(conn, project_id)
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------

def get_task_assignments(task_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT ta.task_id, ta.person_id, ta.role, pe.name, pe.title, pe.email
        FROM task_assignments ta
        JOIN people pe ON pe.id = ta.person_id
        WHERE ta.task_id = ?
        ORDER BY pe.name COLLATE NOCASE, ta.role
        """,
        (task_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def get_team_task_assignments(task_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT tta.task_id, tta.team_id, tta.role, tm.name, tm.description
        FROM team_task_assignments tta
        JOIN teams tm ON tm.id = tta.team_id
        WHERE tta.task_id = ?
        ORDER BY tm.name COLLATE NOCASE, tta.role
        """,
        (task_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def set_task_assignments(project_id: int, task_id: int, assignments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Legacy: person-only assignments. Preserved for backward compat."""
    return set_task_assignments_v2(project_id, task_id, assignments, [])


def set_task_assignments_v2(
    project_id: int,
    task_id: int,
    person_assignments: list[dict[str, Any]],
    team_assignments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    conn = get_db()
    task = conn.execute(
        "SELECT id FROM tasks WHERE id = ? AND project_id = ?", (task_id, project_id)
    ).fetchone()
    if task is None:
        conn.close()
        raise ValueError("Task not found")

    # Validate person assignments
    seen_person: set[tuple[int, str]] = set()
    normalized_persons: list[tuple[int, str]] = []
    a_count = 0
    for item in person_assignments:
        person_id = int(item["person_id"])
        role = str(item["role"]).upper()
        if role not in VALID_ROLES:
            conn.close()
            raise ValueError(f"Invalid role: {role}")
        if not _is_project_member(conn, project_id, person_id):
            conn.close()
            raise ValueError(f"Person {person_id} is not a project member")
        key = (person_id, role)
        if key in seen_person:
            conn.close()
            raise ValueError("Duplicate assignment for same person and role")
        seen_person.add(key)
        normalized_persons.append(key)
        if role == "A":
            a_count += 1

    # Validate team assignments
    seen_team: set[tuple[int, str]] = set()
    normalized_teams: list[tuple[int, str]] = []
    for item in team_assignments:
        team_id = int(item["team_id"])
        role = str(item["role"]).upper()
        if role not in VALID_ROLES:
            conn.close()
            raise ValueError(f"Invalid role: {role}")
        team_exists = conn.execute(
            "SELECT id FROM teams WHERE id = ? AND project_id = ?", (team_id, project_id)
        ).fetchone()
        if team_exists is None:
            conn.close()
            raise ValueError(f"Team {team_id} is not in this project")
        key = (team_id, role)
        if key in seen_team:
            conn.close()
            raise ValueError("Duplicate assignment for same team and role")
        seen_team.add(key)
        normalized_teams.append(key)
        if role == "A":
            a_count += 1

    if a_count != 1:
        conn.close()
        raise ValueError("Each task must have exactly one Accountable (A)")

    conn.execute("DELETE FROM task_assignments WHERE task_id = ?", (task_id,))
    for person_id, role in normalized_persons:
        conn.execute(
            "INSERT INTO task_assignments (task_id, person_id, role) VALUES (?, ?, ?)",
            (task_id, person_id, role),
        )
    conn.execute("DELETE FROM team_task_assignments WHERE task_id = ?", (task_id,))
    for team_id, role in normalized_teams:
        conn.execute(
            "INSERT INTO team_task_assignments (task_id, team_id, role) VALUES (?, ?, ?)",
            (task_id, team_id, role),
        )
    _touch_project(conn, project_id)
    conn.commit()
    conn.close()
    return get_task_assignments(task_id)


# ---------------------------------------------------------------------------
# Matrix
# ---------------------------------------------------------------------------

def build_matrix(project_id: int) -> dict[str, Any] | None:
    project = get_project(project_id)
    if project is None:
        return None

    people = list_project_people(project_id)
    teams = list_project_teams(project_id)
    groups = list_task_groups(project_id)
    tasks = list_tasks(project_id)

    task_ids = [t["id"] for t in tasks]
    assignments_by_task: dict[int, list[dict[str, Any]]] = {tid: [] for tid in task_ids}
    team_assignments_by_task: dict[int, list[dict[str, Any]]] = {tid: [] for tid in task_ids}

    if task_ids:
        placeholders = ",".join(["?"] * len(task_ids))
        conn = get_db()
        rows = conn.execute(
            f"""
            SELECT ta.task_id, ta.person_id, ta.role, pe.name
            FROM task_assignments ta
            JOIN people pe ON pe.id = ta.person_id
            WHERE ta.task_id IN ({placeholders})
            ORDER BY ta.task_id, pe.name COLLATE NOCASE, ta.role
            """,
            tuple(task_ids),
        ).fetchall()
        for row in rows:
            assignments_by_task[row["task_id"]].append(dict(row))

        team_rows = conn.execute(
            f"""
            SELECT tta.task_id, tta.team_id, tta.role, tm.name
            FROM team_task_assignments tta
            JOIN teams tm ON tm.id = tta.team_id
            WHERE tta.task_id IN ({placeholders})
            ORDER BY tta.task_id, tm.name COLLATE NOCASE, tta.role
            """,
            tuple(task_ids),
        ).fetchall()
        conn.close()
        for row in team_rows:
            team_assignments_by_task[row["task_id"]].append(dict(row))

    matrix_rows = []
    for task in tasks:
        assignments = assignments_by_task.get(task["id"], [])
        team_assignments = team_assignments_by_task.get(task["id"], [])
        role_by_person: dict[str, str] = {}
        for a in assignments:
            key = str(a["person_id"])
            existing = role_by_person.get(key)
            role_by_person[key] = a["role"] if not existing else f"{existing}/{a['role']}"
        role_by_team: dict[str, str] = {}
        for a in team_assignments:
            key = str(a["team_id"])
            existing = role_by_team.get(key)
            role_by_team[key] = a["role"] if not existing else f"{existing}/{a['role']}"
        matrix_rows.append(
            {
                **task,
                "assignments": assignments,
                "team_assignments": team_assignments,
                "role_by_person": role_by_person,
                "role_by_team": role_by_team,
                "accountable_count": (
                    sum(1 for a in assignments if a["role"] == "A")
                    + sum(1 for a in team_assignments if a["role"] == "A")
                ),
            }
        )

    return {
        "project": project,
        "people": people,
        "teams": teams,
        "groups": groups,
        "tasks": matrix_rows,
    }


# ---------------------------------------------------------------------------
# Digest & Alerts
# ---------------------------------------------------------------------------

def get_due_digest(project_id: int, window: str = "week") -> dict[str, Any]:
    start = date.today()
    end = start + timedelta(days=6)

    conn = get_db()
    rows = conn.execute(
        """
        SELECT * FROM tasks
        WHERE project_id = ?
          AND due_date IS NOT NULL
          AND date(due_date) BETWEEN date(?) AND date(?)
        ORDER BY date(due_date) ASC
        """,
        (project_id, start.isoformat(), end.isoformat()),
    ).fetchall()
    status_counts = conn.execute(
        """
        SELECT status, COUNT(*) as count
        FROM tasks
        WHERE project_id = ?
        GROUP BY status
        """,
        (project_id,),
    ).fetchall()
    conn.close()

    due_tasks = _dicts(rows)
    for t in due_tasks:
        t["assignments"] = get_task_assignments(t["id"])

    by_status = {s: 0 for s in VALID_STATUSES}
    for row in status_counts:
        by_status[row["status"]] = row["count"]

    return {
        "window": window,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "due_tasks": due_tasks,
        "status_counts": by_status,
    }


def get_alerts(project_id: int) -> dict[str, Any]:
    matrix = build_matrix(project_id)
    if matrix is None:
        raise ValueError("Project not found")

    missing_accountability = []
    accountable_load: dict[str, dict[str, Any]] = {}

    for task in matrix["tasks"]:
        all_assignments = task["assignments"] + task["team_assignments"]
        a_assignments = [a for a in all_assignments if a["role"] == "A"]
        if len(a_assignments) == 0:
            missing_accountability.append(
                {
                    "task_id": task["id"],
                    "task_title": task["title"],
                    "issue": "No Accountable owner assigned",
                }
            )

        for a in task["assignments"]:
            if a["role"] != "A":
                continue
            key = f"p:{a['person_id']}"
            if key not in accountable_load:
                accountable_load[key] = {"key": key, "name": a["name"], "task_ids": []}
            accountable_load[key]["task_ids"].append(task["id"])

        for a in task["team_assignments"]:
            if a["role"] != "A":
                continue
            key = f"t:{a['team_id']}"
            if key not in accountable_load:
                accountable_load[key] = {"key": key, "name": a["name"] + " (team)", "task_ids": []}
            accountable_load[key]["task_ids"].append(task["id"])

    overloaded_owners = []
    for owner in accountable_load.values():
        count = len(owner["task_ids"])
        if count > 3:
            overloaded_owners.append({
                **owner,
                "accountable_task_count": count,
                "issue": "High accountable load",
            })

    return {
        "missing_accountability": missing_accountability,
        "overloaded_owners": overloaded_owners,
    }


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_project_csv(project_id: int) -> str:
    matrix = build_matrix(project_id)
    if matrix is None:
        raise ValueError("Project not found")

    people = matrix["people"]
    teams = matrix["teams"]
    person_headers = [f"{p['name']} ({p['id']})" for p in people]
    team_headers = [f"{t['name']} (team:{t['id']})" for t in teams]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["task_id", "title", "group", "status", "due_date", "description", *person_headers, *team_headers])

    for task in matrix["tasks"]:
        row = [
            task["id"],
            task["title"],
            task.get("group_name") or "",
            task["status"],
            task["due_date"] or "",
            task["description"] or "",
        ]
        for person in people:
            row.append(task["role_by_person"].get(str(person["id"]), ""))
        for team in teams:
            row.append(task["role_by_team"].get(str(team["id"]), ""))
        writer.writerow(row)

    return output.getvalue()


# ---------------------------------------------------------------------------
# Share Tokens
# ---------------------------------------------------------------------------

def create_share_token(project_id: int, label: str = "") -> dict[str, Any]:
    token = secrets.token_urlsafe(20)
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO share_tokens (project_id, token, label) VALUES (?, ?, ?)",
        (project_id, token, label.strip()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM share_tokens WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def list_share_tokens(project_id: int) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM share_tokens WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,),
    ).fetchall()
    conn.close()
    return _dicts(rows)


def revoke_share_token(project_id: int, token: str) -> bool:
    conn = get_db()
    cur = conn.execute(
        """
        UPDATE share_tokens
        SET revoked = 1, revoked_at = datetime('now')
        WHERE project_id = ? AND token = ? AND revoked = 0
        """,
        (project_id, token),
    )
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def get_shared_project(token: str) -> dict[str, Any] | None:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM share_tokens WHERE token = ? AND revoked = 0", (token,)
    ).fetchone()
    conn.close()
    if row is None:
        return None

    project_id = row["project_id"]
    matrix = build_matrix(project_id)
    if matrix is None:
        return None

    digest = get_due_digest(project_id)
    alerts = get_alerts(project_id)

    return {
        "share": dict(row),
        "project": matrix["project"],
        "people": matrix["people"],
        "teams": matrix["teams"],
        "groups": matrix["groups"],
        "tasks": matrix["tasks"],
        "digest": digest,
        "alerts": alerts,
    }
