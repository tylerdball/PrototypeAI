"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Role = "" | "R" | "A" | "C" | "I";

interface Person {
  id: number;
  name: string;
  title: string;
  email: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
}

interface TaskGroup {
  id: number;
  name: string;
  order_index: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  group_id: number | null;
  group_name?: string | null;
  assignments?: Assignment[];
  team_assignments?: TeamAssignment[];
}

interface Assignment {
  person_id: number;
  role: "R" | "A" | "C" | "I";
  name?: string;
}

interface TeamAssignment {
  team_id: number;
  role: "R" | "A" | "C" | "I";
  name?: string;
}

interface MatrixTask extends Task {
  role_by_person: Record<string, string>;
  role_by_team: Record<string, string>;
  accountable_count: number;
}

interface ShareToken {
  token: string;
  label: string;
  revoked: number;
  created_at: string;
}

const TABS = ["Tasks", "Matrix", "Due This Week", "AI Assist", "Share/Export"] as const;

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


const ROLE_LEGEND = [
  { role: "R", label: "Responsible", desc: "Does the work" },
  { role: "A", label: "Accountable", desc: "Owns the outcome — exactly one per task" },
  { role: "C", label: "Consulted", desc: "Provides input before decisions" },
  { role: "I", label: "Informed", desc: "Kept updated, no input required" },
];

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [tab, setTab] = useState<(typeof TABS)[number]>("Tasks");
  const [project, setProject] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [matrixTasks, setMatrixTasks] = useState<MatrixTask[]>([]);
  const [digest, setDigest] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [message, setMessage] = useState("");

  const [personForm, setPersonForm] = useState({ name: "", title: "", email: "" });
  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const [groupForm, setGroupForm] = useState({ name: "" });
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", status: "not_started", due_date: "", group_id: "",
  });
  const [shareLabel, setShareLabel] = useState("");

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [aiFlags, setAiFlags] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSuggestResult, setAiSuggestResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [matrixDraft, setMatrixDraft] = useState<Record<number, Record<number, Role>>>({});
  const [matrixTeamDraft, setMatrixTeamDraft] = useState<Record<number, Record<number, Role>>>({});

  async function loadAll() {
    const [p, m, d, a, s] = await Promise.all([
      fetch(`/api/backend/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/matrix`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/digest?window=week`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/alerts`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/share-tokens`).then((r) => r.json()),
    ]);

    setProject(p);
    setPeople(m.people || []);
    setTeams(m.teams || []);
    setGroups(m.groups || []);
    setTasks(m.tasks || []);
    setMatrixTasks(m.tasks || []);
    setDigest(d);
    setAlerts(a);
    setTokens(s);
  }

  useEffect(() => {
    loadAll();
  }, [projectId]);

  // Seed person draft from matrix data
  useEffect(() => {
    const draft: Record<number, Record<number, Role>> = {};
    for (const task of matrixTasks) {
      draft[task.id] = {};
      for (const person of people) {
        const raw = task.role_by_person?.[String(person.id)] || "";
        const normalized = (raw.includes("/") ? raw.split("/")[0] : raw) as Role;
        draft[task.id][person.id] = normalized || "";
      }
    }
    setMatrixDraft(draft);
  }, [matrixTasks, people]);

  // Seed team draft from matrix data
  useEffect(() => {
    const draft: Record<number, Record<number, Role>> = {};
    for (const task of matrixTasks) {
      draft[task.id] = {};
      for (const team of teams) {
        const raw = task.role_by_team?.[String(team.id)] || "";
        const normalized = (raw.includes("/") ? raw.split("/")[0] : raw) as Role;
        draft[task.id][team.id] = normalized || "";
      }
    }
    setMatrixTeamDraft(draft);
  }, [matrixTasks, teams]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // Group tasks for matrix display
  const tasksByGroup = useMemo(() => {
    const ungrouped: MatrixTask[] = [];
    const byGroupId: Record<number, MatrixTask[]> = {};
    for (const task of matrixTasks) {
      if (task.group_id == null) {
        ungrouped.push(task);
      } else {
        if (!byGroupId[task.group_id]) byGroupId[task.group_id] = [];
        byGroupId[task.group_id].push(task);
      }
    }
    return { ungrouped, byGroupId };
  }, [matrixTasks]);

  // Group tasks for task list display
  const taskListByGroup = useMemo(() => {
    const ungrouped: Task[] = [];
    const byGroupId: Record<number, Task[]> = {};
    for (const task of tasks) {
      if (task.group_id == null) {
        ungrouped.push(task);
      } else {
        if (!byGroupId[task.group_id]) byGroupId[task.group_id] = [];
        byGroupId[task.group_id].push(task);
      }
    }
    return { ungrouped, byGroupId };
  }, [tasks]);

  function setToast(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  // --- People ---
  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personForm.name.trim()) return;
    await fetch(`/api/backend/projects/${projectId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personForm),
    });
    setPersonForm({ name: "", title: "", email: "" });
    await loadAll();
    setToast("Person added.");
  }

  async function removePerson(personId: number) {
    if (!confirm("Remove this person from project and its assignments?")) return;
    await fetch(`/api/backend/projects/${projectId}/people/${personId}`, { method: "DELETE" });
    await loadAll();
    setToast("Person removed.");
  }

  // --- Teams ---
  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamForm.name.trim()) return;
    await fetch(`/api/backend/projects/${projectId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teamForm),
    });
    setTeamForm({ name: "", description: "" });
    await loadAll();
    setToast("Team added.");
  }

  async function removeTeam(teamId: number) {
    if (!confirm("Remove this team and its assignments?")) return;
    await fetch(`/api/backend/projects/${projectId}/teams/${teamId}`, { method: "DELETE" });
    await loadAll();
    setToast("Team removed.");
  }

  // --- Groups ---
  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    await fetch(`/api/backend/projects/${projectId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupForm.name }),
    });
    setGroupForm({ name: "" });
    await loadAll();
    setToast("Group added.");
  }

  async function deleteGroup(groupId: number) {
    if (!confirm("Delete this group? Tasks will become ungrouped.")) return;
    await fetch(`/api/backend/projects/${projectId}/groups/${groupId}`, { method: "DELETE" });
    await loadAll();
    setToast("Group deleted.");
  }

  // --- Tasks ---
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    await fetch(`/api/backend/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        due_date: taskForm.due_date || null,
        group_id: taskForm.group_id ? Number(taskForm.group_id) : null,
      }),
    });
    setTaskForm({ title: "", description: "", status: "not_started", due_date: "", group_id: "" });
    await loadAll();
    setToast("Task created.");
  }

  async function patchTask(taskId: number, patch: Partial<Task>) {
    await fetch(`/api/backend/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadAll();
  }

  async function deleteTask(taskId: number) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/backend/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
    await loadAll();
  }

  // --- Matrix ---
  async function saveMatrixRow(taskId: number) {
    const personRow = matrixDraft[taskId] || {};
    const teamRow = matrixTeamDraft[taskId] || {};

    const assignments = Object.entries(personRow)
      .filter(([, role]) => role)
      .map(([personId, role]) => ({ person_id: Number(personId), role }));

    const team_assignments = Object.entries(teamRow)
      .filter(([, role]) => role)
      .map(([teamId, role]) => ({ team_id: Number(teamId), role }));

    const aCount =
      assignments.filter((a) => a.role === "A").length +
      team_assignments.filter((a) => a.role === "A").length;

    if (aCount !== 1) {
      setToast("Each task must have exactly one A (across people and teams).");
      return;
    }

    const res = await fetch(`/api/backend/projects/${projectId}/tasks/${taskId}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, team_assignments }),
    });

    if (!res.ok) {
      const err = await res.json();
      setToast(err.detail || "Failed to save assignments");
      return;
    }

    await loadAll();
    setToast("Assignments saved.");
  }

  // --- AI ---
  async function runSuggest() {
    if (!selectedTask) {
      setToast("Select a task first.");
      return;
    }
    setAiLoading(true);
    const res = await fetch(`/api/backend/projects/${projectId}/ai/suggest-assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_title: selectedTask.title,
        task_description: selectedTask.description || "",
      }),
    });
    setAiSuggestResult(await res.json());
    setAiLoading(false);
  }

  async function applySuggestion() {
    if (!selectedTask || !aiSuggestResult?.assignments) return;
    const personAssignments = aiSuggestResult.assignments
      .filter((a: any) => a.type === "person" || a.person_id)
      .map((a: any) => ({ person_id: a.person_id, role: a.role }));
    const teamAssignments = aiSuggestResult.assignments
      .filter((a: any) => a.type === "team" || a.team_id)
      .map((a: any) => ({ team_id: a.team_id, role: a.role }));

    const res = await fetch(
      `/api/backend/projects/${projectId}/tasks/${selectedTask.id}/assignments`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: personAssignments, team_assignments: teamAssignments }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      setToast(err.detail || "Could not apply suggestion");
      return;
    }
    await loadAll();
    setToast("AI suggestion applied.");
  }

  async function runFlags() {
    setAiLoading(true);
    const res = await fetch(`/api/backend/projects/${projectId}/ai/flags`, { method: "POST" });
    setAiFlags(await res.json());
    setAiLoading(false);
  }

  async function runSummary() {
    setAiLoading(true);
    const res = await fetch(`/api/backend/projects/${projectId}/ai/stakeholder-summary`, {
      method: "POST",
    });
    const data = await res.json();
    setAiSummary(data.summary || "");
    setAiLoading(false);
  }

  // --- Share ---
  async function createShareToken() {
    const res = await fetch(`/api/backend/projects/${projectId}/share-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: shareLabel }),
    });
    if (!res.ok) {
      setToast("Failed to create share link.");
      return;
    }
    setShareLabel("");
    await loadAll();
    setToast("Share link created.");
  }

  async function revokeToken(token: string) {
    await fetch(`/api/backend/projects/${projectId}/share-tokens/${token}`, { method: "DELETE" });
    await loadAll();
    setToast("Share link revoked.");
  }

  // --- Helpers ---
  function renderTaskCard(task: Task) {
    return (
      <div
        key={task.id}
        className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">{task.title}</div>
            <div className="text-xs text-[var(--muted)]">{task.description || "No description"}</div>
          </div>
          <button className="btn btn-secondary" onClick={() => deleteTask(task.id)}>
            Delete
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input"
            value={task.status}
            onChange={(e) => patchTask(task.id, { status: e.target.value as Task["status"] })}
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
          <input
            className="input"
            type="date"
            value={task.due_date || ""}
            onChange={(e) => patchTask(task.id, { due_date: e.target.value || null })}
          />
        </div>
        {groups.length > 0 && (
          <select
            className="input text-xs"
            value={task.group_id ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              patchTask(task.id, { group_id: val ? Number(val) : null });
            }}
          >
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  function renderMatrixRows(taskList: MatrixTask[]) {
    return taskList.map((task) => {
      const personRow = matrixDraft[task.id] || {};
      const teamRow = matrixTeamDraft[task.id] || {};
      const aCount =
        Object.values(personRow).filter((r) => r === "A").length +
        Object.values(teamRow).filter((r) => r === "A").length;
      return (
        <tr key={task.id} className="border-t border-[var(--border)] align-top">
          <td className="px-2 py-2">
            <div className="font-medium">{task.title}</div>
            <div className="text-xs text-[var(--muted)]">{formatStatus(task.status)}</div>
            {task.due_date && <div className="text-xs text-[var(--muted)]">{task.due_date}</div>}
          </td>
          {people.map((person) => (
            <td key={`p-${person.id}`} className="px-2 py-2">
              <select
                className="input"
                value={personRow[person.id] || ""}
                onChange={(e) => {
                  const role = e.target.value as Role;
                  setMatrixDraft((prev) => ({
                    ...prev,
                    [task.id]: { ...prev[task.id], [person.id]: role },
                  }));
                }}
              >
                <option value="">-</option>
                <option value="R">R</option>
                <option value="A">A</option>
                <option value="C">C</option>
                <option value="I">I</option>
              </select>
            </td>
          ))}
          {teams.map((team) => (
            <td key={`t-${team.id}`} className="px-2 py-2">
              <select
                className="input"
                value={teamRow[team.id] || ""}
                onChange={(e) => {
                  const role = e.target.value as Role;
                  setMatrixTeamDraft((prev) => ({
                    ...prev,
                    [task.id]: { ...prev[task.id], [team.id]: role },
                  }));
                }}
              >
                <option value="">-</option>
                <option value="R">R</option>
                <option value="A">A</option>
                <option value="C">C</option>
                <option value="I">I</option>
              </select>
            </td>
          ))}
          <td className="px-2 py-2 text-xs">
            {aCount === 1 ? (
              <span className="text-green-400">✓ One A</span>
            ) : (
              <span className="text-red-400">Needs one A</span>
            )}
          </td>
          <td className="px-2 py-2">
            <button className="btn btn-primary" onClick={() => saveMatrixRow(task.id)}>
              Save
            </button>
          </td>
        </tr>
      );
    });
  }

  const totalCols = 1 + people.length + teams.length + 2; // task + people + teams + validation + action

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{project?.name || "Project"}</h1>
        <p className="text-sm text-[var(--muted)]">{project?.description || "No description"}</p>
      </div>

      {message ? (
        <div className="rounded border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-500">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ================================================================ TASKS TAB */}
      {tab === "Tasks" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* People */}
            <div className="card space-y-3">
              <h2 className="font-semibold">People</h2>
              <form onSubmit={addPerson} className="space-y-2">
                <input
                  className="input"
                  placeholder="Name"
                  value={personForm.name}
                  onChange={(e) => setPersonForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Title"
                  value={personForm.title}
                  onChange={(e) => setPersonForm((f) => ({ ...f, title: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Email"
                  value={personForm.email}
                  onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))}
                />
                <button className="btn btn-primary">Add Person</button>
              </form>
              <div className="space-y-2">
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm"
                  >
                    <div>
                      <div>{p.name}</div>
                      <div className="text-xs text-[var(--muted)]">{p.title || "No title"}</div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => removePerson(p.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <h2 className="font-semibold pt-2 border-t border-[var(--border)]">Teams / Depts</h2>
              <form onSubmit={addTeam} className="space-y-2">
                <input
                  className="input"
                  placeholder="Team or department name"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Description (optional)"
                  value={teamForm.description}
                  onChange={(e) => setTeamForm((f) => ({ ...f, description: e.target.value }))}
                />
                <button className="btn btn-primary">Add Team</button>
              </form>
              <div className="space-y-2">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-1">
                        {t.name}
                        <span className="text-xs text-[var(--muted)] italic">team</span>
                      </div>
                      {t.description ? (
                        <div className="text-xs text-[var(--muted)]">{t.description}</div>
                      ) : null}
                    </div>
                    <button className="btn btn-secondary" onClick={() => removeTeam(t.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div className="card space-y-3">
              <h2 className="font-semibold">Groups / Phases</h2>
              <form onSubmit={addGroup} className="space-y-2">
                <input
                  className="input"
                  placeholder="Group name (e.g. Planning)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ name: e.target.value })}
                />
                <button className="btn btn-primary">Add Group</button>
              </form>
              <div className="space-y-2">
                {groups.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No groups yet. Tasks appear ungrouped.</p>
                ) : (
                  groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm"
                    >
                      <span>{g.name}</span>
                      <button className="btn btn-secondary" onClick={() => deleteGroup(g.id)}>
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="card space-y-3">
              <h2 className="font-semibold">Tasks</h2>
              <form onSubmit={addTask} className="space-y-2">
                <input
                  className="input"
                  placeholder="Task title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                />
                <textarea
                  className="input"
                  placeholder="Description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="input"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                  <input
                    className="input"
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                {groups.length > 0 && (
                  <select
                    className="input"
                    value={taskForm.group_id}
                    onChange={(e) => setTaskForm((f) => ({ ...f, group_id: e.target.value }))}
                  >
                    <option value="">No group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                <button className="btn btn-primary">Add Task</button>
              </form>

              <div className="space-y-3">
                {/* Ungrouped tasks */}
                {taskListByGroup.ungrouped.length > 0 && (
                  <div>
                    {groups.length > 0 && (
                      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
                        Ungrouped
                      </p>
                    )}
                    <div className="space-y-2">
                      {taskListByGroup.ungrouped.map(renderTaskCard)}
                    </div>
                  </div>
                )}
                {/* Grouped tasks */}
                {groups.map((group) => {
                  const groupTasks = taskListByGroup.byGroupId[group.id] || [];
                  if (groupTasks.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
                        {group.name}
                      </p>
                      <div className="space-y-2">{groupTasks.map(renderTaskCard)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ MATRIX TAB */}
      {tab === "Matrix" && (
        <div className="card overflow-x-auto space-y-4">
          <h2 className="font-semibold">RACI Matrix</h2>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            {ROLE_LEGEND.map(({ role, label }) => (
              <span key={role} className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand-500/20 font-bold text-brand-500">
                  {role}
                </span>
                {label}
              </span>
            ))}
          </div>

          {people.length === 0 && teams.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Add people or teams first.</p>
          ) : matrixTasks.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Add tasks first.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left">Task</th>
                  {people.map((p) => (
                    <th key={`ph-${p.id}`} className="px-2 py-2 text-left text-xs">
                      {p.name}
                    </th>
                  ))}
                  {teams.map((t) => (
                    <th
                      key={`th-${t.id}`}
                      className="px-2 py-2 text-left text-xs text-[var(--muted)] italic"
                    >
                      {t.name}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left">Valid</th>
                  <th className="px-2 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Ungrouped tasks */}
                {tasksByGroup.ungrouped.length > 0 && groups.length > 0 && (
                  <tr>
                    <td
                      colSpan={totalCols}
                      className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] bg-[var(--surface2)]"
                    >
                      Ungrouped
                    </td>
                  </tr>
                )}
                {renderMatrixRows(tasksByGroup.ungrouped)}

                {/* Grouped tasks */}
                {groups.map((group) => {
                  const groupTasks = tasksByGroup.byGroupId[group.id] || [];
                  if (groupTasks.length === 0) return null;
                  return (
                    <React.Fragment key={group.id}>
                      <tr>
                        <td
                          colSpan={totalCols}
                          className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-500 bg-brand-500/5"
                        >
                          {group.name}
                        </td>
                      </tr>
                      {renderMatrixRows(groupTasks)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ================================================================ DUE THIS WEEK TAB */}
      {tab === "Due This Week" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="mb-2 font-semibold">Due This Week</h2>
            {(digest?.due_tasks || []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No tasks due this week.</p>
            ) : (
              <div className="space-y-2">
                {digest.due_tasks.map((task: Task) => (
                  <div
                    key={task.id}
                    className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm"
                  >
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-[var(--muted)]">Due: {task.due_date}</div>
                    <div className="text-xs text-[var(--muted)]">Status: {formatStatus(task.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-2 font-semibold">Deterministic Alerts</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Missing A</p>
                {(alerts?.missing_accountability || []).length === 0 ? (
                  <p className="text-[var(--muted)]">None</p>
                ) : (
                  alerts.missing_accountability.map((a: any) => (
                    <p key={a.task_id} className="text-red-400">
                      {a.task_title}
                    </p>
                  ))
                )}
              </div>
              <div>
                <p className="font-medium">Overloaded A Owners (&gt;3)</p>
                {(alerts?.overloaded_owners || []).length === 0 ? (
                  <p className="text-[var(--muted)]">None</p>
                ) : (
                  alerts.overloaded_owners.map((o: any) => (
                    <p key={o.key} className="text-yellow-300">
                      {o.name} ({o.accountable_task_count})
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ AI ASSIST TAB */}
      {tab === "AI Assist" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="font-semibold">Suggest RACI</h2>
            <select
              className="input"
              value={selectedTaskId || ""}
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
            >
              <option value="">Select task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.group_name ? `[${t.group_name}] ` : ""}
                  {t.title}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={runSuggest}
              disabled={aiLoading}
            >
              {aiLoading ? "Thinking..." : "Suggest Assignments"}
            </button>
            {aiSuggestResult ? (
              <div className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                <p className="mb-2 font-medium">Suggested Roles</p>
                <div className="space-y-1">
                  {aiSuggestResult.assignments?.map((a: any, idx: number) => (
                    <p key={idx}>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand-500/20 text-brand-500 text-xs font-bold mr-1">
                        {a.role}
                      </span>
                      {a.name}
                      {a.type === "team" ? <span className="text-xs text-[var(--muted)] ml-1">team</span> : null}
                    </p>
                  ))}
                </div>
                <button className="btn btn-primary mt-3" onClick={applySuggestion}>
                  Apply to Task
                </button>
              </div>
            ) : null}
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">AI Health + Summary</h2>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-primary" onClick={runFlags} disabled={aiLoading}>
                {aiLoading ? "..." : "Run Health Flags"}
              </button>
              <button className="btn btn-primary" onClick={runSummary} disabled={aiLoading}>
                {aiLoading ? "..." : "Generate Summary"}
              </button>
            </div>
            {aiFlags ? (
              <div className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                <p className="font-medium">AI Flags Summary</p>
                <p className="mt-1 text-[var(--muted)]">{aiFlags.ai?.summary}</p>
                <ul className="mt-2 list-disc pl-5 text-[var(--muted)]">
                  {(aiFlags.ai?.actions || []).map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {aiSummary ? (
              <div className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                <p className="font-medium">Stakeholder Summary</p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{aiSummary}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ================================================================ SHARE/EXPORT TAB */}
      {tab === "Share/Export" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="font-semibold">Export</h2>
            <a
              className="btn btn-primary inline-block"
              href={`/api/backend/projects/${projectId}/export.csv`}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Share Links (Read-only)</h2>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Optional label"
                value={shareLabel}
                onChange={(e) => setShareLabel(e.target.value)}
              />
              <button className="btn btn-primary" onClick={createShareToken}>
                Create Link
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {tokens.length === 0 ? (
                <p className="text-[var(--muted)]">No share links yet.</p>
              ) : (
                tokens.map((t) => {
                  const url = `${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/share/${t.token}`;
                  return (
                    <div
                      key={t.token}
                      className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3"
                    >
                      <p className="font-medium">{t.label || "Untitled"}</p>
                      <p className="mt-1 break-all text-xs text-[var(--muted)]">{url}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          className="btn btn-secondary"
                          onClick={() => navigator.clipboard.writeText(url)}
                        >
                          Copy
                        </button>
                        {t.revoked ? (
                          <span className="text-xs text-red-400">Revoked</span>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            onClick={() => revokeToken(t.token)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
