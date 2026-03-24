"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Role = "" | "R" | "A" | "C" | "I";

interface Person {
  id: number;
  name: string;
  title: string;
  email: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  assignments?: Assignment[];
}

interface Assignment {
  person_id: number;
  role: "R" | "A" | "C" | "I";
  name?: string;
}

interface MatrixTask extends Task {
  role_by_person: Record<string, string>;
  accountable_count: number;
}

interface ShareToken {
  token: string;
  label: string;
  revoked: number;
  created_at: string;
}

const TABS = ["Tasks", "Matrix", "Due This Week", "AI Assist", "Share/Export"] as const;

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [tab, setTab] = useState<(typeof TABS)[number]>("Tasks");
  const [project, setProject] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [matrixTasks, setMatrixTasks] = useState<MatrixTask[]>([]);
  const [digest, setDigest] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [message, setMessage] = useState("");

  const [personForm, setPersonForm] = useState({ name: "", title: "", email: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "not_started", due_date: "" });
  const [shareLabel, setShareLabel] = useState("");

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [aiFlags, setAiFlags] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSuggestResult, setAiSuggestResult] = useState<any>(null);

  const [matrixDraft, setMatrixDraft] = useState<Record<number, Record<number, Role>>>({});

  async function loadAll() {
    const [p, pe, t, m, d, a, s] = await Promise.all([
      fetch(`/api/backend/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/people`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/tasks`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/matrix`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/digest?window=week`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/alerts`).then((r) => r.json()),
      fetch(`/api/backend/projects/${projectId}/share-tokens`).then((r) => r.json()),
    ]);

    setProject(p);
    setPeople(pe);
    setTasks(t);
    setMatrixTasks(m.tasks || []);
    setDigest(d);
    setAlerts(a);
    setTokens(s);
  }

  useEffect(() => {
    loadAll();
  }, [projectId]);

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

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  function setToast(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

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

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    await fetch(`/api/backend/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...taskForm,
        due_date: taskForm.due_date || null,
      }),
    });
    setTaskForm({ title: "", description: "", status: "not_started", due_date: "" });
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

  async function saveMatrixRow(taskId: number) {
    const row = matrixDraft[taskId] || {};
    const assignments = Object.entries(row)
      .filter(([, role]) => role)
      .map(([personId, role]) => ({ person_id: Number(personId), role }));

    const aCount = assignments.filter((a) => a.role === "A").length;
    if (aCount !== 1) {
      setToast("Each task must have exactly one A.");
      return;
    }

    const res = await fetch(`/api/backend/projects/${projectId}/tasks/${taskId}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });

    if (!res.ok) {
      const err = await res.json();
      setToast(err.detail || "Failed to save assignments");
      return;
    }

    await loadAll();
    setToast("Assignments saved.");
  }

  async function runSuggest() {
    if (!selectedTask) {
      setToast("Select a task first.");
      return;
    }

    const res = await fetch(`/api/backend/projects/${projectId}/ai/suggest-assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_title: selectedTask.title,
        task_description: selectedTask.description || "",
      }),
    });
    const data = await res.json();
    setAiSuggestResult(data);
  }

  async function applySuggestion() {
    if (!selectedTask || !aiSuggestResult?.assignments) return;
    const res = await fetch(`/api/backend/projects/${projectId}/tasks/${selectedTask.id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: aiSuggestResult.assignments.map((a: any) => ({ person_id: a.person_id, role: a.role })) }),
    });
    if (!res.ok) {
      const err = await res.json();
      setToast(err.detail || "Could not apply suggestion");
      return;
    }
    await loadAll();
    setToast("AI suggestion applied.");
  }

  async function runFlags() {
    const res = await fetch(`/api/backend/projects/${projectId}/ai/flags`, { method: "POST" });
    setAiFlags(await res.json());
  }

  async function runSummary() {
    const res = await fetch(`/api/backend/projects/${projectId}/ai/stakeholder-summary`, { method: "POST" });
    const data = await res.json();
    setAiSummary(data.summary || "");
  }

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{project?.name || "Project"}</h1>
        <p className="text-sm text-[var(--muted)]">{project?.description || "No description"}</p>
      </div>

      {message ? <div className="rounded border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-500">{message}</div> : null}

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

      {tab === "Tasks" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="font-semibold">Project Roster</h2>
            <form onSubmit={addPerson} className="space-y-2">
              <input className="input" placeholder="Name" value={personForm.name} onChange={(e) => setPersonForm((f) => ({ ...f, name: e.target.value }))} />
              <input className="input" placeholder="Title" value={personForm.title} onChange={(e) => setPersonForm((f) => ({ ...f, title: e.target.value }))} />
              <input className="input" placeholder="Email" value={personForm.email} onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))} />
              <button className="btn btn-primary">Add Person</button>
            </form>
            <div className="space-y-2">
              {people.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm">
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
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Tasks</h2>
            <form onSubmit={addTask} className="space-y-2">
              <input className="input" placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} />
              <textarea className="input" placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={taskForm.status} onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="not_started">not_started</option>
                  <option value="in_progress">in_progress</option>
                  <option value="blocked">blocked</option>
                  <option value="done">done</option>
                </select>
                <input className="input" type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <button className="btn btn-primary">Add Task</button>
            </form>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-[var(--muted)]">{task.description || "No description"}</div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => deleteTask(task.id)}>Delete</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input"
                      value={task.status}
                      onChange={(e) => patchTask(task.id, { status: e.target.value as Task["status"] })}
                    >
                      <option value="not_started">not_started</option>
                      <option value="in_progress">in_progress</option>
                      <option value="blocked">blocked</option>
                      <option value="done">done</option>
                    </select>
                    <input
                      className="input"
                      type="date"
                      value={task.due_date || ""}
                      onChange={(e) => patchTask(task.id, { due_date: e.target.value || null })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Matrix" && (
        <div className="card overflow-x-auto">
          <h2 className="mb-3 font-semibold">RACI Matrix</h2>
          {people.length === 0 || matrixTasks.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Add people and tasks first.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left">Task</th>
                  {people.map((p) => (
                    <th key={p.id} className="px-2 py-2 text-left">{p.name}</th>
                  ))}
                  <th className="px-2 py-2 text-left">Validation</th>
                  <th className="px-2 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {matrixTasks.map((task) => {
                  const row = matrixDraft[task.id] || {};
                  const aCount = Object.values(row).filter((r) => r === "A").length;
                  return (
                    <tr key={task.id} className="border-t border-[var(--border)] align-top">
                      <td className="px-2 py-2">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-[var(--muted)]">{task.status}</div>
                      </td>
                      {people.map((person) => (
                        <td key={person.id} className="px-2 py-2">
                          <select
                            className="input"
                            value={row[person.id] || ""}
                            onChange={(e) => {
                              const role = e.target.value as Role;
                              setMatrixDraft((prev) => ({
                                ...prev,
                                [task.id]: {
                                  ...prev[task.id],
                                  [person.id]: role,
                                },
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
                          <span className="text-green-400">Exactly one A</span>
                        ) : (
                          <span className="text-red-400">Needs exactly one A</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <button className="btn btn-primary" onClick={() => saveMatrixRow(task.id)}>Save</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Due This Week" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="mb-2 font-semibold">Due This Week</h2>
            {(digest?.due_tasks || []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No tasks due this week.</p>
            ) : (
              <div className="space-y-2">
                {digest.due_tasks.map((task: Task) => (
                  <div key={task.id} className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-[var(--muted)]">Due: {task.due_date}</div>
                    <div className="text-xs text-[var(--muted)]">Status: {task.status}</div>
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
                  alerts.missing_accountability.map((a: any) => <p key={a.task_id} className="text-red-400">{a.task_title}</p>)
                )}
              </div>
              <div>
                <p className="font-medium">Overloaded A Owners (&gt;3)</p>
                {(alerts?.overloaded_owners || []).length === 0 ? (
                  <p className="text-[var(--muted)]">None</p>
                ) : (
                  alerts.overloaded_owners.map((o: any) => (
                    <p key={o.person_id} className="text-yellow-300">{o.name} ({o.accountable_task_count})</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "AI Assist" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="font-semibold">Suggest RACI</h2>
            <select className="input" value={selectedTaskId || ""} onChange={(e) => setSelectedTaskId(Number(e.target.value))}>
              <option value="">Select task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={runSuggest}>Suggest Assignments</button>
            {aiSuggestResult ? (
              <div className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                <p className="mb-2 font-medium">Suggested Roles</p>
                <div className="space-y-1">
                  {aiSuggestResult.assignments?.map((a: any, idx: number) => (
                    <p key={`${a.person_id}-${a.role}-${idx}`}>{a.name} - {a.role}</p>
                  ))}
                </div>
                <button className="btn btn-primary mt-3" onClick={applySuggestion}>Apply to Task</button>
              </div>
            ) : null}
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">AI Health + Summary</h2>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={runFlags}>Run Health Flags</button>
              <button className="btn btn-primary" onClick={runSummary}>Generate Summary</button>
            </div>
            {aiFlags ? (
              <div className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm">
                <p className="font-medium">AI Flags Summary</p>
                <p className="mt-1 text-[var(--muted)]">{aiFlags.ai?.summary}</p>
                <ul className="mt-2 list-disc pl-5 text-[var(--muted)]">
                  {(aiFlags.ai?.actions || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
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
              <input className="input" placeholder="Optional label" value={shareLabel} onChange={(e) => setShareLabel(e.target.value)} />
              <button className="btn btn-primary" onClick={createShareToken}>Create Link</button>
            </div>
            <div className="space-y-2 text-sm">
              {tokens.length === 0 ? (
                <p className="text-[var(--muted)]">No share links yet.</p>
              ) : (
                tokens.map((t) => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${t.token}`;
                  return (
                    <div key={t.token} className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3">
                      <p className="font-medium">{t.label || "Untitled"}</p>
                      <p className="mt-1 break-all text-xs text-[var(--muted)]">{url}</p>
                      <div className="mt-2 flex gap-2">
                        <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
                        {t.revoked ? (
                          <span className="text-xs text-red-400">Revoked</span>
                        ) : (
                          <button className="btn btn-secondary" onClick={() => revokeToken(t.token)}>Revoke</button>
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
